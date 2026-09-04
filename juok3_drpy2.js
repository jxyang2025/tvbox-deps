// drpy2 spider for juok3.top (剧OK) v12
// 根据drpy2接口文档重新设计
var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/search?q=**&t=fid',
    searchUrl: '/search?q=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    class_parse: function() {
        return [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '电视剧' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ];
    },
    double: false,
    timeout: 15000,
    play_parse: true,
    lazy: function(url) {
        return { parse: 1, url: url, js: '' };
    },

    // 一级：返回drpy2标准格式
    一级: function(tid, pg, c, f) {
        var kwMap = { '1': '电影', '2': '电视剧', '3': '综艺', '4': '动漫' };
        var kw = kwMap[tid] || '电影';
        var url = this.host + '/search?q=' + encodeURIComponent(kw);
        if (pg > 1) url += '&page=' + pg;
        
        var html = fetch(url);
        var list = [];

        // 提取detail URLs: https://juok3.top/detail/{typeId}/{uid}
        var detailRe = /https:\/\/juok3\.top\/detail\/(\d+)\/([A-Za-z0-9]+)/g;
        var detailMatches = html.match(detailRe) || [];

        // 提取image URLs和alt text
        var imgRe = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
        var imgMatches = [];
        var m;
        while ((m = imgRe.exec(html)) !== null) {
            imgMatches.push({ name: m[1].trim(), pic: m[2] });
        }

        // 配对
        var count = Math.min(detailMatches.length, imgMatches.length);
        for (var i = 0; i < count; i++) {
            var detailMatch = detailMatches[i].match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (detailMatch) {
                var typeId = detailMatch[1];
                var uid = detailMatch[2];
                var name = imgMatches[i].name;
                var pic = imgMatches[i].pic;
                if (name && name.length > 1) {
                    // vod_id格式: type_id$/detail/{typeId}/{uid}
                    list.push({
                        vod_id: tid + '$/detail/' + typeId + '/' + uid,
                        vod_name: name,
                        vod_pic: pic,
                        vod_remarks: ''
                    });
                }
            }
        }

        // 去重
        var seen = {};
        var uniqueList = [];
        for (var i = 0; i < list.length; i++) {
            var key = list[i].vod_id;
            if (!seen[key]) {
                seen[key] = true;
                uniqueList.push(list[i]);
            }
        }

        return JSON.stringify({
            list: uniqueList,
            page: parseInt(pg) || 1,
            pagecount: 1,
            limit: uniqueList.length,
            total: uniqueList.length
        });
    },

    // 二级详情
    二级: function(id) {
        // id格式: tid$/detail/{typeId}/{uid}
        var parts = id.split('$/detail/');
        var typeId = parts[1] ? parts[1].split('/')[0] : '1';
        var uid = parts[1] ? parts[1].split('/')[1] : '';
        
        var url = this.host + '/detail/' + typeId + '/' + uid;
        var html = fetch(url);
        var vod = {};

        // 标题
        var titleM = html.match(/<title>([^<]+)/);
        vod.vod_name = titleM ? titleM[1].replace(/[_\-].*$/, '').trim() : '';
        if (!vod.vod_name) {
            var h1M = html.match(/<h1[^>]*>([^<]+)/);
            vod.vod_name = h1M ? h1M[1].trim() : '';
        }

        // 图片
        var picM = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        if (!picM) picM = html.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
        vod.vod_pic = picM ? picM[1] : '';

        // 描述
        var descM = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
        vod.vod_content = descM ? descM[1] : '';

        // 年份
        var yearM = html.match(/(\d{4})[年\-]/);
        vod.vod_year = yearM ? yearM[1] : '';

        // 演员
        var actorM = html.match(/主演[：:]\s*([^<\n]+)/);
        vod.vod_actor = actorM ? actorM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';

        // 导演
        var dirM = html.match(/导演[：:]\s*([^<\n]+)/);
        vod.vod_director = dirM ? dirM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';

        // 类型
        var typeM = html.match(/类型[：:]\s*([^<\n]+)/);
        vod.type_name = typeM ? typeM[1].trim() : '';

        // 播放链接
        var playFroms = {};

        // markdown格式: [第N集](url) 或 [播放中第N集](url)
        var mdEpRe = /\[(?:播放中)?第(\d+)集?\]\((https?:\/\/[^)]+)\)/g;
        var epM;
        while ((epM = mdEpRe.exec(html)) !== null) {
            var epNum = parseInt(epM[1]);
            var epUrl = epM[2];
            if (!epUrl.startsWith('http')) epUrl = this.host + epUrl;
            var flag = '默认';
            var sM = epUrl.match(/s=([A-Za-z0-9]+)/);
            if (sM) flag = sM[1];
            if (!playFroms[flag]) playFroms[flag] = [];
            playFroms[flag].push({ num: epNum, url: epUrl, label: '第' + epNum + '集' });
        }

        // HTML格式: <a href="/play/...">第N集</a>
        var htmlEpRe = /<a[^>]*href="(\/play\/[^"]+)"[^>]*>第(\d+)集<\/a>/g;
        while ((epM = htmlEpRe.exec(html)) !== null) {
            var epNum2 = parseInt(epM[2]);
            var epUrl2 = this.host + epM[1];
            var flag2 = '默认';
            var sM2 = epUrl2.match(/s=([A-Za-z0-9]+)/);
            if (sM2) flag2 = sM2[1];
            if (!playFroms[flag2]) playFroms[flag2] = [];
            playFroms[flag2].push({ num: epNum2, url: epUrl2, label: '第' + epNum2 + '集' });
        }

        if (Object.keys(playFroms).length > 0) {
            var playFromArr = Object.keys(playFroms);
            var playUrlArr = playFromArr.map(function(f) {
                playFroms[f].sort(function(a, b) { return a.num - b.num; });
                return playFroms[f].map(function(e) { return e.label + '$' + e.url; }).join('#');
            });
            vod.vod_play_from = playFromArr.join('$$$');
            vod.vod_play_url = playUrlArr.join('$$$');
        } else {
            vod.vod_play_from = '默认';
            vod.vod_play_url = '第1集$' + this.host + '/play/' + typeId + '/' + uid + '/1?s=qiyi';
        }

        return JSON.stringify({ list: [vod], page: 1, pagecount: 1, limit: 60 });
    },

    // 搜索
    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        if (pg > 1) url += '&page=' + pg;
        var html = fetch(url);
        var list = [];

        // 提取detail URLs
        var detailRe = /https:\/\/juok3\.top\/detail\/(\d+)\/([A-Za-z0-9]+)/g;
        var detailMatches = html.match(detailRe) || [];

        // 提取image URLs和alt text
        var imgRe = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
        var imgMatches = [];
        var m;
        while ((m = imgRe.exec(html)) !== null) {
            imgMatches.push({ name: m[1].trim(), pic: m[2] });
        }

        // 配对
        var count = Math.min(detailMatches.length, imgMatches.length);
        for (var i = 0; i < count; i++) {
            var detailMatch = detailMatches[i].match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (detailMatch) {
                var typeId = detailMatch[1];
                var uid = detailMatch[2];
                var name = imgMatches[i].name;
                var pic = imgMatches[i].pic;
                if (name && name.length > 1) {
                    list.push({
                        vod_id: '1$/detail/' + typeId + '/' + uid,
                        vod_name: name,
                        vod_pic: pic,
                        vod_remarks: ''
                    });
                }
            }
        }

        var seen = {};
        var uniqueList = [];
        for (var i = 0; i < list.length; i++) {
            var key = list[i].vod_id;
            if (!seen[key]) {
                seen[key] = true;
                uniqueList.push(list[i]);
            }
        }

        return JSON.stringify({ list: uniqueList, page: parseInt(pg) || 1, pagecount: 1, limit: uniqueList.length, total: uniqueList.length });
    }
};

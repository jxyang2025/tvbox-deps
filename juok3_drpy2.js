// drpy2 spider for juok3.top (剧OK) v6
// 使用搜索页作为数据源，避免首页HTML结构解析问题
var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/search?q=**&type=fid',
    searchUrl: '/search?q=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    class_parse: function() {
        return [
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'anime', type_name: '动漫' }
        ];
    },
    double: false,
    timeout: 15000,
    play_parse: true,
    lazy: 'js:',

    一级: function(tid, pg, c, f) {
        // 根据分类ID构建搜索URL，每个分类搜索不同关键词
        var kwMap = {
            'movie': '电影',
            'tv': '电视剧',
            'variety': '综艺',
            'anime': '动漫'
        };
        var kw = kwMap[tid] || '电影';
        var url = this.host + '/search?q=' + encodeURIComponent(kw);
        if (pg > 1) {
            url += '&page=' + pg;
        }
        var html = fetch(url, this.headers);
        var list = [];

        // 匹配视频项 - 兼容多种HTML结构
        var itemRe = /<a[^>]+href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>/g;
        var m;
        while ((m = itemRe.exec(html)) !== null) {
            var typeId = m[1];
            var uid = m[2];
            // 在匹配到的位置附近提取标题和图片
            var chunk = html.substring(m.index, m.index + 500);
            var nameM = chunk.match(/alt="([^"]+)"/);
            if (!nameM) nameM = chunk.match(/<strong[^>]*>([^<]+)<\/strong>/);
            if (!nameM) nameM = chunk.match(/\*\*([^*]+)\*\*/);
            var name = nameM ? nameM[1].trim() : '';

            var picM = chunk.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            var pic = picM ? picM[1] : '';

            if (name && name.length > 1) {
                list.push({
                    vod_id: typeId + '/' + uid,
                    vod_name: name,
                    vod_pic: pic,
                    type_name: ['电影', '电视剧', '综艺', '动漫'][parseInt(typeId) - 1] || '其他'
                });
            }
        }

        // 也尝试匹配外部链接
        var extRe = /<a[^>]+href="\/detail\/(external\/[^"]+?\/\d+)"[^>]*>/g;
        while ((m = extRe.exec(html)) !== null) {
            var extPath = m[1];
            var chunk2 = html.substring(m.index, m.index + 500);
            var name2 = chunk2.match(/alt="([^"]+)"/);
            if (!name2) name2 = chunk2.match(/\*\*([^*]+)\*\*/);
            var n = name2 ? name2[1].trim() : '';
            var pic2 = chunk2.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (n && n.length > 1) {
                list.push({
                    vod_id: extPath,
                    vod_name: n,
                    vod_pic: pic2 ? pic2[1] : '',
                    type_name: '其他'
                });
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
            limit: uniqueList.length
        });
    },

    二级: function(id) {
        var url = this.host + '/detail/' + id;
        var html = fetch(url, this.headers);
        var vod = {};

        // 标题
        var titleM = html.match(/<title>([^<]+)/);
        vod.vod_name = titleM ? titleM[1].replace(/[_\-].*$/, '').trim() : '';
        if (!vod.vod_name) {
            var h1M = html.match(/<h1[^>]*>([^<]+)/);
            vod.vod_name = h1M ? h1M[1].trim() : '';
        }
        if (!vod.vod_name) {
            var strongM = html.match(/<strong[^>]*>([^<]+)<\/strong>/);
            vod.vod_name = strongM ? strongM[1].trim() : '';
        }

        // 图片
        var picM = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        if (!picM) picM = html.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
        if (!picM) picM = html.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
        vod.vod_pic = picM ? picM[1] : '';

        // 描述
        var descM = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
        vod.vod_content = descM ? descM[1] : '';
        if (!vod.vod_content) {
            // 尝试从HTML中提取简介
            var descM2 = html.match(/简介[\s\S]*?展开全部\s*([\s\S]*?)\s*手机/);
            if (descM2) vod.vod_content = descM2[1].trim();
        }
        if (!vod.vod_content) {
            // 尝试匹配markdown格式
            var descM3 = html.match(/##\s*简介\s*\n([\s\S]*?)\n\n/);
            if (descM3) vod.vod_content = descM3[1].trim();
        }

        // 年份
        var yearM = html.match(/(\d{4})[年\-]/);
        vod.vod_year = yearM ? yearM[1] : '';

        // 演员
        var actorM = html.match(/主演[：:]\s*([^<\n]+)/);
        vod.vod_actor = actorM ? actorM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';

        // 导演
        var dirM = html.match(/导演[：:]\s*([^<\n]+)/);
        vod.vod_director = dirM ? dirM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';

        // 播放链接 - 多种格式
        var playFroms = {};

        // 格式1: markdown链接 [第N集](url) 或 [播放中第N集](url)
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

        // 格式2: HTML链接 <a href="/play/...">第N集</a>
        var htmlEpRe = /<a[^>]*href="(\/play\/[^"]+)"[^>]*>[^<]*第(\d+)集[^<]*<\/a>/g;
        while ((epM = htmlEpRe.exec(html)) !== null) {
            var epNum2 = parseInt(epM[2]);
            var epUrl2 = this.host + epM[1];
            var flag2 = '默认';
            var sM2 = epUrl2.match(/s=([A-Za-z0-9]+)/);
            if (sM2) flag2 = sM2[1];
            if (!playFroms[flag2]) playFroms[flag2] = [];
            playFroms[flag2].push({ num: epNum2, url: epUrl2, label: '第' + epNum2 + '集' });
        }

        // 格式3: external播放链接
        var extPlayRe = /href="(\/play\/(external\/[^"]+))"/g;
        while ((epM = extPlayRe.exec(html)) !== null) {
            var epUrl3 = this.host + epM[1];
            var epNum3 = 1;
            var numMatch = epUrl3.match(/\/(\d+)(?:\?|$)/);
            if (numMatch) epNum3 = parseInt(numMatch[1]);
            if (!playFroms['external']) playFroms['external'] = [];
            playFroms['external'].push({ num: epNum3, url: epUrl3, label: '第' + epNum3 + '集' });
        }

        // 按集数排序并格式化
        if (Object.keys(playFroms).length > 0) {
            var playFromArr = Object.keys(playFroms);
            var playUrlArr = playFromArr.map(function(f) {
                playFroms[f].sort(function(a, b) { return a.num - b.num; });
                return playFroms[f].map(function(e) { return e.label + '$' + e.url; }).join('#');
            });
            vod.vod_play_from = playFromArr.join('$$$');
            vod.vod_play_url = playUrlArr.join('$$$');
        } else {
            // 没有播放链接，尝试构造
            vod.vod_play_from = '默认';
            vod.vod_play_url = '第1集$' + this.host + '/play/' + id + '/1?s=qiyi';
        }

        return JSON.stringify({ list: [vod], page: 1, pagecount: 1, limit: 60 });
    },

    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        if (pg > 1) {
            url += '&page=' + pg;
        }
        var html = fetch(url, this.headers);
        var list = [];

        // 匹配搜索结果
        var itemRe = /<a[^>]+href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>/g;
        var m;
        while ((m = itemRe.exec(html)) !== null) {
            var typeId = m[1];
            var uid = m[2];
            var chunk = html.substring(m.index, m.index + 400);
            var nameM = chunk.match(/alt="([^"]+)"/);
            if (!nameM) nameM = chunk.match(/<strong[^>]*>([^<]+)<\/strong>/);
            if (!nameM) nameM = chunk.match(/\*\*([^*]+)\*\*/);
            var name = nameM ? nameM[1].trim() : '';
            var picM = chunk.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (name && name.length > 1) {
                list.push({
                    vod_id: typeId + '/' + uid,
                    vod_name: name,
                    vod_pic: picM ? picM[1] : '',
                    type_name: ['电影', '电视剧', '综艺', '动漫'][parseInt(typeId) - 1] || '其他'
                });
            }
        }

        // 也匹配 external 类型
        var extRe = /<a[^>]+href="\/detail\/(external\/[^"]+?\/\d+)"[^>]*>/g;
        while ((m = extRe.exec(html)) !== null) {
            var extPath = m[1];
            var chunk2 = html.substring(m.index, m.index + 400);
            var name2 = chunk2.match(/alt="([^"]+)"/);
            if (!name2) name2 = chunk2.match(/\*\*([^*]+)\*\*/);
            var n = name2 ? name2[1].trim() : '';
            var pic2 = chunk2.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (n && n.length > 1) {
                list.push({
                    vod_id: extPath,
                    vod_name: n,
                    vod_pic: pic2 ? pic2[1] : '',
                    type_name: '其他'
                });
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

        return JSON.stringify({ list: uniqueList, page: parseInt(pg) || 1, pagecount: 1, limit: uniqueList.length });
    },

    lazy: function(url) {
        return 'parslet://' + url;
    }
};

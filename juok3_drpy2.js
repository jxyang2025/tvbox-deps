// drpy2 spider for juok3.top (剧OK) v5
// 关键修复：使用 request() 替代 fetch() —— drpy2 标准接口

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/',
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
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'anime', type_name: '动漫' }
        ];
    },
    double: false,
    timeout: 15000,
    play_parse: true,
    lazy: 'js:',

    一级: function(tid, pg, c, f) {
        var html = request(this.host + '/');
        var list = [];
        
        var sectionMap = {
            'tv': '电视剧热播',
            'movie': '电影热播',
            'variety': '综艺热播',
            'anime': '动漫热播'
        };
        var sectionName = sectionMap[tid] || '电视剧热播';
        
        // 提取对应区块
        var sectionRe = new RegExp('<h2[^>]*>' + sectionName + '</h2>([\\s\\S]*?)(?=<h2|$)', 'i');
        var sectionM = html.match(sectionRe);
        if (!sectionM) {
            return JSON.stringify({ list: [], page: 1, pagecount: 1, limit: 12 });
        }
        var sectionHtml = sectionM[1];
        
        // 匹配视频项 - 同时兼容绝对URL和相对URL
        var itemRe = /<a[^>]*?href="([^"]*\/detail\/(\d+)\/([A-Za-z0-9]+))"[^>]*>[\s\S]*?<\/a>/g;
        var m;
        while ((m = itemRe.exec(sectionHtml)) !== null) {
            var typeId = m[2];
            var uid = m[3];
            var chunk = sectionHtml.substring(m.index, m.index + 500);
            
            // 提取标题
            var name = '';
            var altM = chunk.match(/alt="([^"]+)"/);
            if (altM) {
                name = altM[1].trim();
            } else {
                var strongM = chunk.match(/<strong[^>]*>([^<]+)<\/strong>/);
                if (strongM) name = strongM[1].trim();
            }
            
            // 提取图片
            var picM = chunk.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            var pic = picM ? picM[1] : '';
            
            if (name && name.length > 1) {
                list.push({
                    vod_id: typeId + '/' + uid,
                    vod_name: name,
                    vod_pic: pic,
                    type_name: ['电影','电视剧','综艺','动漫'][parseInt(typeId)-1] || '其他'
                });
            }
        }
        
        return JSON.stringify({ list: list, page: 1, pagecount: 1, limit: list.length });
    },

    二级: function(id) {
        var url = this.host + '/detail/' + id;
        var html = request(url);
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
        if (!vod.vod_content) {
            var descM2 = html.match(/简介[\s\S]*?展开全部\s*([\s\S]*?)\s*手机/);
            if (descM2) vod.vod_content = descM2[1].trim();
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
        
        // 播放链接
        var playFroms = {};
        
        // 匹配播放链接
        var playRe = /<a[^>]*?href="([^"]*\/play\/(\d+)\/([A-Za-z0-9]+)\/(\d+))(?:\?s=([A-Za-z0-9]+))?"[^>]*>第(\d+)集<\/a>/g;
        var epM;
        while ((epM = playRe.exec(html)) !== null) {
            var epNum = parseInt(epM[6]);
            var flag = epM[5] || '默认';
            var epUrl = this.host + epM[1];
            if (!playFroms[flag]) playFroms[flag] = [];
            playFroms[flag].push({ num: epNum, url: epUrl, label: '第' + epNum + '集' });
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
            vod.vod_play_from = '默认';
            vod.vod_play_url = '第1集$' + this.host + '/play/' + id + '/1?s=qiyi';
        }
        
        return JSON.stringify({ list: [vod], page: 1, pagecount: 1, limit: 60 });
    },

    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        var html = request(url);
        var list = [];
        
        // 匹配搜索结果 - 兼容绝对和相对URL
        var itemRe = /<a[^>]*?href="([^"]*\/detail\/(\d+)\/([A-Za-z0-9]+))"[^>]*>[\s\S]*?<\/a>/g;
        var m;
        while ((m = itemRe.exec(html)) !== null) {
            var typeId = m[2];
            var uid = m[3];
            var chunk = html.substring(m.index, m.index + 400);
            var nameM = chunk.match(/alt="([^"]+)"/) || chunk.match(/<strong[^>]*>([^<]+)<\/strong>/);
            var picM = chunk.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (nameM && nameM[1] && nameM[1].length > 1) {
                list.push({
                    vod_id: typeId + '/' + uid,
                    vod_name: nameM[1].trim(),
                    vod_pic: picM ? picM[1] : '',
                    type_name: ['电影','电视剧','综艺','动漫'][parseInt(typeId)-1] || '其他'
                });
            }
        }
        
        // 也匹配 external 类型
        var extRe = /<a[^>]*?href="([^"]*\/detail\/(external\/\S+?\/\d+))"[^>]*>[\s\S]*?<\/a>/g;
        while ((m = extRe.exec(html)) !== null) {
            var extPath = m[2];
            var chunk2 = html.substring(m.index, m.index + 400);
            var name2 = chunk2.match(/alt="([^"]+)"/) || chunk2.match(/<strong[^>]*>([^<]+)<\/strong>/);
            var pic2 = chunk2.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
            if (name2 && name2[1] && name2[1].length > 1) {
                list.push({
                    vod_id: extPath,
                    vod_name: name2[1].trim(),
                    vod_pic: pic2 ? pic2[1] : '',
                    type_name: '其他'
                });
            }
        }
        
        return JSON.stringify({ list: list });
    },

    lazy: function(url) {
        return 'parslet://' + url;
    }
};

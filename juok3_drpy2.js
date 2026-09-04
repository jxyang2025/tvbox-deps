// drpy2 spider for juok3.top (剧OK)
// Base URL: https://juok3.top/
// 注意：分类页由 JS 动态渲染，HTML 无视频数据；搜索页有数据
// 策略：一级走搜索聚合，二级从详情页提取，搜索复用一级逻辑

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/category/:cateId?page=:pg&year=:year',
    searchUrl: '/search?q=**',
    searchable: 2,
    quickSearch: 2,
    filterable: 1,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    class_parse: function() {
        return [
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'anime', type_name: '动漫' }
        ];
    },
    filter: {
        "movie": [{ key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }] }],
        "tv": [{ key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }] }]
    },
    double: false,
    timeout: 10000,
    play_parse: true,
    lazy: 'js:',

    一级: function(tid, pg, c, f) {
        // 分类页 JS 动态渲染，HTML 无视频数据
        // 策略：用搜索做片库入口（搜索可返回该类型内容）
        var url = this.host + '/search?q=' + tid + '&page=' + pg;
        var html = fetch(url);
        var list = [];
        var items = html.match(/<a[^>]*href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var type_m = item.match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (!type_m) continue;
            var title_m = item.match(/>([^<]{2,30})<\/(?:span|h4)[^>]*>/);
            var name = title_m ? title_m[1].trim() : '';
            var pic_m = item.match(/src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"/);
            var pic = pic_m ? pic_m[1] : '';
            list.push({
                vod_id: type_m[1] + '/' + type_m[2],
                vod_name: name,
                vod_pic: pic,
                type_name: ['电影','电视剧','综艺','动漫'][parseInt(type_m[1])-1] || '其他'
            });
        }
        var json = { list: list, page: parseInt(pg) };
        return JSON.stringify(json);
    },

    二级: function(id) {
        var parts = id.split('/');
        var type = parts[0];
        var uid = parts[1];
        var url = this.host + '/detail/' + type + '/' + uid;
        var html = fetch(url);
        var vod = {};
        var title_m = html.match(/<title>([^<]+)/);
        vod.vod_name = title_m ? title_m[1].replace(/全集免费在线播放[_\-]?.*$/, '').trim() : '';
        var pic_m = html.match(/<meta[^>]*property="og:image"[^>]*content="(https:\/\/[^"]+)"/);
        if (!pic_m) pic_m = html.match(/<img[^>]*src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"[^>]*\/?>/);
        vod.vod_pic = pic_m ? pic_m[1] : '';
        var desc_m = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
        vod.vod_content = desc_m ? desc_m[1] : '';
        var year_m = html.match(/>(\d{4})<[^>]*>(\d{4})/);
        vod.vod_year = year_m ? year_m[1] : '';
        var actor_m = html.match(/演员[:：]\s*([^<]+)/);
        vod.vod_actor = actor_m ? actor_m[1].trim() : '';
        var dir_m = html.match(/导演[:：]\s*([^<]+)/);
        vod.vod_director = dir_m ? dir_m[1].trim() : '';
        // 播放链接
        var play_re = /<a[^>]*href="(\/play\/\d+\/[A-Za-z0-9]+\/(\d+)(?:\?s=([A-Za-z0-9]+))?)"/g;
        var flags = {};
        var eps_by_flag = {};
        var ep_m;
        while ((ep_m = play_re.exec(html)) !== null) {
            var flag = ep_m[3] || '默认';
            if (!flags[flag]) { flags[flag] = true; eps_by_flag[flag] = []; }
            var idx = Object.keys(flags).indexOf(flag);
            eps_by_flag[flag].push('$' + ep_m[2] + '#' + ep_m[1]);
        }
        if (Object.keys(flags).length === 0) {
            flags['默认'] = true;
            eps_by_flag['默认'] = ['$1#' + '/play/' + type + '/' + uid + '/1?s=qiyi'];
        }
        var play_from_arr = Object.keys(flags);
        var play_url_arr = play_from_arr.map(function(f) { return eps_by_flag[f].join('#'); });
        vod.vod_play_from = play_from_arr.join('$$$');
        vod.vod_play_url = play_url_arr.join('$$$');
        var json = { list: [vod], page: 1, pagecount: 1, limit: 60 };
        return JSON.stringify(json);
    },

    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        var html = fetch(url);
        var list = [];
        var items = html.match(/<a[^>]*href="(\/detail\/\d+\/[A-Za-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var type_m = item.match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (!type_m) continue;
            var title_m = item.match(/>([^<]{2,30})<\/(?:span|h4)[^>]*>/);
            var name = title_m ? title_m[1].trim() : '';
            var pic_m = item.match(/src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"/);
            var pic = pic_m ? pic_m[1] : '';
            var type_name = ['电影','电视剧','综艺','动漫'][parseInt(type_m[1])-1] || '其他';
            list.push({
                vod_id: type_m[1] + '/' + type_m[2],
                vod_name: name,
                vod_pic: pic,
                type_name: type_name
            });
        }
        var json = { list: list };
        return JSON.stringify(json);
    },

    lazy: function(url) {
        // 播放页无直接 m3u8，JS 动态加载播放器
        // 返回 parse:1 让引擎尝试解析
        return 'parslet://' + url;
    }
};

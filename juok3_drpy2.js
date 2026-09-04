// drpy2 spider for juok3.top (剧OK)
// Base URL: https://juok3.top/
// Categories: 电影(movie/1) 电视剧(tv/2) 综艺(variety/3) 动漫(anime/4)
// Search: /search?q=关键词
// Category: /category/{type}?year={year}&page={pg}
// Detail: /detail/{type_id}/{uid}
// Play: /play/{type_id}/{uid}/{ep}?s={source}

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
        "movie": [
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }] }
        ],
        "tv": [
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }] }
        ]
    },
    double: false,
    timeout: 10000,
    play_parse: true,
    lazy: 'js:',

    一级: function(tid, pg, c, f) {
        var url = this.host + '/category/' + tid;
        if (f.year) url += '?year=' + f.year;
        url += '&page=' + pg;
        var html = fetch(url);
        var list = [];
        // Extract items: detail links with img, title, year/type info
        var items = html.match(/<a[^>]*href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var type_m = item.match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (!type_m) continue;
            var type = type_m[1];
            var uid = type_m[2];
            // Title
            var title_m = item.match(/>([^<]{2,30})<\/(?:span|h4)[^>]*>/);
            var name = title_m ? title_m[1].trim() : '';
            // Pic
            var pic_m = item.match(/src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"/);
            var pic = pic_m ? pic_m[1] : '';
            // Remark (集数 info like "更新至18集")
            var remark_m = item.match(/>((?:更新至|全)\d+集)<\/span>/);
            var remark = remark_m ? remark_m[1] : '';
            list.push({
                vod_id: type + '/' + uid,
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remark,
                type_name: ['电影','电视剧','综艺','动漫'][parseInt(type)-1] || '其他'
            });
        }
        var json = { list: list, page: parseInt(pg), pagecount: Math.ceil(list.length / 20) + 1 };
        return JSON.stringify(json);
    },

    二级: function(id) {
        var parts = id.split('/');
        var type = parts[0];
        var uid = parts[1];
        var url = this.host + '/detail/' + type + '/' + uid;
        var html = fetch(url);
        var vod = {};
        // Title from <title>
        var title_m = html.match(/<title>([^<]+)/);
        vod.vod_name = title_m ? title_m[1] : '';
        // Remove "电视剧全集免费在线播放" suffix
        vod.vod_name = vod.vod_name.replace(/[\u4e00-\u9fa5]+全集免费在线播放[_\-]?.*$/, '').trim();
        // Pic
        var pic_m = html.match(/<meta[^>]*property="og:image"[^>]*content="(https:\/\/[^"]+)"/);
        if (!pic_m) pic_m = html.match(/<img[^>]*src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"[^>]*\/?>/);
        vod.vod_pic = pic_m ? pic_m[1] : '';
        // Content/description
        var desc_m = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
        vod.vod_content = desc_m ? desc_m[1] : '';
        // Year
        var year_m = html.match(/>(\d{4})<[^>]*>(\d{4})/);
        vod.vod_year = year_m ? year_m[1] : '';
        // Actors
        var actor_m = html.match(/演员[:：]\s*([^<]+)/);
        vod.vod_actor = actor_m ? actor_m[1].trim() : '';
        // Director
        var dir_m = html.match(/导演[:：]\s*([^<]+)/);
        vod.vod_director = dir_m ? dir_m[1].trim() : '';
        // Play sources and episodes
        // Pattern: <a href="/play/{type}/{uid}/{ep}?s={source}" ...>第XX集</a>
        var play_re = /<a[^>]*href="\/play\/(\d+)\/([A-Za-z0-9]+)\/(\d+)(?:\?s=([A-Za-z0-9]+))?"[^>]*>([^<]+)<\/a>/g;
        var flags = {};
        var eps_by_flag = {};
        var ep_m;
        while ((ep_m = play_re.exec(html)) !== null) {
            var flag = ep_m[4] || '默认';
            var ep_num = ep_m[5] || ('第' + ep_m[3] + '集');
            if (!flags[flag]) { flags[flag] = true; eps_by_flag[flag] = []; }
            eps_by_flag[flag].push(ep_num + '#' + '/play/' + ep_m[1] + '/' + ep_m[2] + '/' + ep_m[3] + (ep_m[4] ? '?s=' + ep_m[4] : ''));
        }
        // Fallback: if no structured play links found, try alternative extraction
        if (Object.keys(flags).length === 0) {
            var fb_re = /\/play\/(\d+)\/([A-Za-z0-9]+)\/(\d+)(?:\?s=(\w+))?/g;
            var fb_m;
            while ((fb_m = fb_re.exec(html)) !== null) {
                var f = fb_m[4] || '默认';
                if (!flags[f]) { flags[f] = true; eps_by_flag[f] = []; }
                eps_by_flag[f].push('$' + fb_m[3] + '#' + '/play/' + fb_m[1] + '/' + fb_m[2] + '/' + fb_m[3] + (fb_m[4] ? '?s=' + fb_m[4] : ''));
            }
        }
        // If still no results, create a default single episode
        if (Object.keys(flags).length === 0) {
            flags['默认'] = true;
            eps_by_flag['默认'] = ['$1#' + '/play/' + type + '/' + uid + '/1?s=qiyi'];
        }
        var play_from_arr = Object.keys(flags);
        var play_url_arr = play_from_arr.map(function(f) { return eps_by_flag[f].join('$'); });
        vod.vod_play_from = play_from_arr.join('$$$');
        vod.vod_play_url = play_url_arr.join('$$$');
        var json = { list: [vod], page: 1, pagecount: 1, limit: 60 };
        return JSON.stringify(json);
    },

    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        var html = fetch(url);
        var list = [];
        var items = html.match(/<a[^>]*href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var type_m = item.match(/\/detail\/(\d+)\/([A-Za-z0-9]+)/);
            if (!type_m) continue;
            var type = type_m[1];
            var uid = type_m[2];
            var title_m = item.match(/>([^<]{2,30})<\/(?:span|h4)[^>]*>/);
            var name = title_m ? title_m[1].trim() : '';
            var pic_m = item.match(/src="(https:\/\/p[\w\.qhimg\.com\/][^"]+)"/);
            var pic = pic_m ? pic_m[1] : '';
            var type_name = ['电影','电视剧','综艺','动漫'][parseInt(type)-1] || '其他';
            list.push({
                vod_id: type + '/' + uid,
                vod_name: name,
                vod_pic: pic,
                type_name: type_name
            });
        }
        var json = { list: list };
        return JSON.stringify(json);
    },

    lazy: function(url) {
        // The play page doesn't expose m3u8 directly in HTML
        // Return the play page URL - FongMi will render it and we extract from player
        // For now, try to find m3u8 in page
        var html = fetch(url);
        var m3u8 = html.match(/https:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8) {
            return 'parslet://' + m3u8[0];
        }
        // Try to find player iframe src
        var iframe_m = html.match(/<iframe[^>]*src="(https:\/\/[^"]+)"/);
        if (iframe_m) {
            return 'parslet://' + iframe_m[1];
        }
        // Default: parse the page for video URL
        return 'parslet://' + url;
    }
};

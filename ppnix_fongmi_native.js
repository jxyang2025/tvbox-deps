// FongMi/TV native spider test
// Directly sets globalThis.__JS_SPIDER__ without relying on drpy2 engine

var rule = {
    title: 'PPnix测试',
    host: 'https://www.ppnix.com',
    homeUrl: '/cn/movie/',
    url: '/cn/fyclass/fypage.html',
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    changeable: 0,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// Test function to verify http is available
function testHttp() {
    try {
        var res = http(rule.host + '/cn/movie/');
        return {status: res.statusCode || res.code || 200, ok: true};
    } catch(e) {
        return {status: 0, ok: false, error: String(e)};
    }
}

globalThis.__JS_SPIDER__ = {
    home: function(filter) {
        try {
            var result = testHttp();
            if (!result.ok) {
                return JSON.stringify({error: "HTTP test failed: " + result.error});
            }
            
            var html = req(rule.host + rule.homeUrl);
            if (!html || html.length < 10) {
                return JSON.stringify({list: []});
            }
            
            // Simple parsing - extract movie items
            var list = [];
            var matches = html.match(/<a[^>]*href="\/movie\/(\d+)\.html"[^>]*>.*?<img[^>]*src="([^"]*)"[^>]*>.*?<em[^>]*>([^<]*)<\/em>/g) || [];
            
            for (var i = 0; i < Math.min(matches.length, 20); i++) {
                var m = matches[i].match(/\/movie\/(\d+)\.html/);
                var id = m ? m[1] : '';
                var pic = matches[i].match(/src="([^"]*)"/);
                var name = matches[i].match(/<em[^>]*>([^<]*)<\/em>/);
                
                if (id) {
                    list.push({
                        vod_id: id,
                        vod_name: name ? name[1].trim() : '未知',
                        vod_pic: pic ? pic[1] : '',
                        vod_remarks: '电影'
                    });
                }
            }
            
            return JSON.stringify({list: list});
        } catch(e) {
            return JSON.stringify({error: String(e), list: []});
        }
    },
    
    category: function(tid, pg, filter, extend) {
        try {
            var url = rule.host + rule.url.replace('fyclass', tid).replace('fypage', pg);
            var html = req(url);
            
            var list = [];
            var matches = html.match(/<a[^>]*href="\/movie\/(\d+)\.html"[^>]*>.*?<img[^>]*src="([^"]*)"[^>]*>.*?<em[^>]*>([^<]*)<\/em>/g) || [];
            
            for (var i = 0; i < Math.min(matches.length, 20); i++) {
                var m = matches[i].match(/\/movie\/(\d+)\.html/);
                var id = m ? m[1] : '';
                var pic = matches[i].match(/src="([^"]*)"/);
                var name = matches[i].match(/<em[^>]*>([^<]*)<\/em>/);
                
                if (id) {
                    list.push({
                        vod_id: id,
                        vod_name: name ? name[1].trim() : '未知',
                        vod_pic: pic ? pic[1] : '',
                        vod_remarks: '电影'
                    });
                }
            }
            
            return JSON.stringify({
                list: list,
                page: parseInt(pg) || 1,
                pagecount: 999,
                total: list.length
            });
        } catch(e) {
            return JSON.stringify({list: [], error: String(e)});
        }
    },
    
    detail: function(ids) {
        try {
            var id = ids[0];
            var url = rule.host + '/movie/' + id + '.html';
            var html = req(url);
            
            // Extract basic info
            var nameMatch = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
            var name = nameMatch ? nameMatch[1].trim() : '';
            var picMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*thumb[^"]*"/);
            var pic = picMatch ? picMatch[1] : '';
            
            // Extract episodes
            var playMatches = html.match(/data-play="\/info\/m3u8\/(\d+)\/(\d+)"[^>]*>/g) || [];
            var episodes = [];
            for (var i = 0; i < Math.min(playMatches.length, 50); i++) {
                var idMatch = playMatches[i].match(/data-play="\/info\/m3u8\/(\d+)\/(\d+)"/);
                if (idMatch) {
                    episodes.push('第' + (i+1) + '集#$' + rule.host + '/info/m3u8/' + idMatch[1] + '/' + idMatch[2]);
                }
            }
            
            var playUrl = episodes.length > 0 ? episodes.join('#') : '';
            
            return JSON.stringify({
                list: [{
                    vod_id: id,
                    vod_name: name,
                    vod_pic: pic,
                    vod_play_from: 'PPnix',
                    vod_play_url: playUrl
                }]
            });
        } catch(e) {
            return JSON.stringify({list: [{vod_id: ids[0], error: String(e)}]});
        }
    },
    
    search: function(key, quick, pg) {
        try {
            var url = rule.host + '/cn/?s=' + encodeURIComponent(key);
            var html = req(url);
            
            var list = [];
            var matches = html.match(/<a[^>]*href="\/movie\/(\d+)\.html"[^>]*>.*?<img[^>]*src="([^"]*)"[^>]*>.*?<em[^>]*>([^<]*)<\/em>/g) || [];
            
            for (var i = 0; i < Math.min(matches.length, 20); i++) {
                var m = matches[i].match(/\/movie\/(\d+)\.html/);
                var id = m ? m[1] : '';
                var pic = matches[i].match(/src="([^"]*)"/);
                var name = matches[i].match(/<em[^>]*>([^<]*)<\/em>/);
                
                if (id) {
                    list.push({
                        vod_id: id,
                        vod_name: name ? name[1].trim() : '未知',
                        vod_pic: pic ? pic[1] : '',
                        vod_remarks: '搜索'
                    });
                }
            }
            
            return JSON.stringify({list: list});
        } catch(e) {
            return JSON.stringify({list: [], error: String(e)});
        }
    },
    
    play: function(flag, id, flags) {
        return JSON.stringify({
            url: id,
            parse: 0
        });
    }
};

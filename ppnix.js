// FongMi/TV Spider — ppnix.com
// 使用 ES Module export default 兼容 FongMi QuickJS

const HOST = 'https://www.ppnix.com';
const UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';

function req(url, opt) {
    if (!opt) opt = {};
    if (!opt.headers) opt.headers = {};
    opt.headers['User-Agent'] = UA;
    // http() 必须传 async:false,否则返回 Promise 而非 {code,headers,content}
    var res = http(url, Object.assign({async: false}, opt));
    return (res && typeof res.content === 'string') ? res.content : '';
}

function _parseItems(html) {
    const items = [];
    // 实际 HTML: <li><a href="/movie/8470.html" class="thumbnail"...>
    //   <img referrerpolicy="no-referrer" src="https://..." class="thumb" alt="title">
    // </a><h2><a href="/movie/8470.html" target="_blank" title="title">title</a></h2>
    // <footer><span class="star star35"></span><span class="rate">7</span></footer></li>
    const re = /<li>\s*<a\s+href="(\/(?:movie|tv)\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<h2><a[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<span\s+class="rate"[^>]*>([^<]+)<\/span>/g;
    var m;
    while ((m = re.exec(html)) !== null) {
        items.push({
            vod_id: m[1].replace(/\/(?:movie|tv)\//, '').replace('.html',''),
            vod_name: m[3],
            vod_pic: m[2],
            vod_remarks: m[4]
        });
    }
    return items;
}

function parseM3u8(html) {
    var infoid = (html.match(/infoid=(\d+)/) || [])[1];
    if (!infoid) return null;
    var m3u8Arr = (html.match(/m3u8\s*=\s*\[([^\]]+)\]/) || [])[1];
    if (!m3u8Arr) return null;
    var episodes = m3u8Arr.split(',').map(function(e){return e.trim().replace(/['"]/g,'');});
    return infoid + '|' + episodes.join('$');
}

// 构建分类过滤 URL: /{type_id}/{genre}-{country}-{year}-{sort}.html
// 4段用join连接 + 末尾额外1横杠
function buildFilterUrl(tid, extend, pg) {
    var genre = extend.type || '';
    var country = extend.country || '';
    var year = extend.year || '';
    var sort = '';
    if (pg > 1) sort = pg;
    return '/' + tid + '/' + [genre, country, year, sort].join('-') + '-.html';
}

function createSpider() {
    var spider = {
        meta: {},

        home: function(filter) {
            try {
                var classes = [
                    { type_id: 'movie', type_name: '电影' },
                    { type_id: 'tv',    type_name: '电视剧' }
                ];
                var filters = {};
                ['movie', 'tv'].forEach(function(tid) {
                    filters[tid] = [
                        { key: 'type', name: '类型', default: '',
                          value: [
                              { n: '全部', v: '' },
                              { n: '动作', v: 'Action' },
                              { n: '喜剧', v: 'Comedy' },
                              { n: '爱情', v: 'Romance' },
                              { n: '科幻', v: 'Sci-Fi' },
                              { n: '恐怖', v: 'Horror' },
                              { n: '剧情', v: 'Drama' },
                              { n: '悬疑', v: 'Mystery' },
                              { n: '惊悚', v: 'Thriller' },
                              { n: '动画', v: 'Animation' },
                              { n: '犯罪', v: 'Crime' },
                              { n: '冒险', v: 'Adventure' },
                              { n: '奇幻', v: 'Fantasy' },
                              { n: '传记', v: 'Biography' },
                              { n: '历史', v: 'History' },
                              { n: '战争', v: 'War' },
                              { n: '音乐', v: 'Music' },
                              { n: '体育', v: 'Sport' },
                              { n: '纪录片', v: 'Documentary' }
                          ]},
                        { key: 'year', name: '年份', default: '',
                          value: [
                              { n: '全部', v: '' },
                              { n: '2026', v: '2026' },
                              { n: '2025', v: '2025' },
                              { n: '2024', v: '2024' },
                              { n: '2023', v: '2023' },
                              { n: '2022', v: '2022' },
                              { n: '2021', v: '2021' },
                              { n: '2020', v: '2020' }
                          ]}
                    ];
                });
                return JSON.stringify({
                    class: classes,
                    filters: filters
                });
            } catch (e) {
                console.log('home error:', e);
                return JSON.stringify({ class: [], filters: {} });
            }
        },

        category: function(tid, pg, filter, extend) {
            try {
                var pagePath = buildFilterUrl(tid, extend, pg);
                var html = req(HOST + pagePath);
                var list = _parseItems(html);
                return JSON.stringify({
                    list: list,
                    page: pg,
                    pagecount: 1,
                    limit: list.length
                });
            } catch (e) {
                console.log('category error:', e);
                return JSON.stringify({ list: [], page: pg, pagecount: 1, limit: 0 });
            }
        },

        detail: function(ids) {
            try {
                var id = ids[0];
                var url = HOST + '/movie/' + id + '.html';
                var html = req(url);
                var title = (html.match(/<title>([^<]+)/) || [])[1] || '';
                var info = parseM3u8(html);
                if (!info) return JSON.stringify({ list: [] });
                var parts = info.split('|');
                var infoid = parts[0];
                var episodes = parts[1].split('$');
                var playlist = episodes.map(function(ep) {
                    return ep + '$' + HOST + '/info/m3u8/' + infoid + '/' + ep + '.m3u8';
                }).join('#');
                var vod = [{
                    vod_id: id,
                    vod_name: title,
                    vod_pic: 'https://www.ppnix.com/static/img/logo.png',
                    vod_play_from: 'PPnix',
                    vod_play_url: playlist
                }];
                return JSON.stringify({ list: vod });
            } catch (e) {
                console.log('detail error:', e);
                return JSON.stringify({ list: [] });
            }
        },

        search: function(key, quick, pg) {
            try {
                var searchUrl = HOST + '/search/' + encodeURIComponent(key) + '/';
                var html = req(searchUrl);
                var items = [];
                var re = /<li>\s*<a\s+href="(\/(?:movie|tv)\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<h2><a[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<span\s+class="rate"[^>]*>([^<]+)<\/span>/g;
                var m;
                while ((m = re.exec(html)) !== null) {
                    items.push({
                        vod_id: m[1].replace(/\/(?:movie|tv)\//, '').replace('.html',''),
                        vod_name: m[3],
                        vod_pic: 'https://www.ppnix.com/static/img/logo.png',
                        vod_remarks: m[4]
                    });
                }
                return JSON.stringify({
                    list: items,
                    page: pg || 1,
                    pagecount: 1,
                    limit: items.length
                });
            } catch (e) {
                console.log('search error:', e);
                return JSON.stringify({ list: [], page: 1, pagecount: 1 });
            }
        },

        play: function(flag, id, vipFlags) {
            try {
                return JSON.stringify({ url: id, parse: 0 });
            } catch (e) {
                return JSON.stringify({ url: '', parse: 0 });
            }
        }
    };
    console.log('ppnix spider created');
    return spider;
}

export default createSpider;

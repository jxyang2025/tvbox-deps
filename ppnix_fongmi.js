// FongMi/TV Spider — ppnix.com
// 兼容 cat.js 格式：导出 __jsEvalReturn 返回 Spider 对象

const HOST = 'https://www.ppnix.com';
const UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';

function req(url, opt) {
    if (!opt) opt = {};
    if (!opt.headers) opt.headers = {};
    opt.headers['User-Agent'] = UA;
    // 必须传 async:false,否则 http() 返回 Promise 而非 {code,headers,content}
    var res = http(url, Object.assign({async: false}, opt));
    return (res && typeof res.content === 'string') ? res.content : '';
}

function _parseItems(html) {
    // 实际 HTML 格式:
    // <li><a href="/movie/8470.html" class="thumbnail" target="_blank">
    //   <img referrerpolicy="no-referrer" src="https://..." class="thumb" alt="title">
    //   <div class="countrie"><span class="orange">2025</span></div>
    //   <div class="note"><span></span></div>
    // </a><h2><a href="/movie/8470.html" target="_blank" title="title">title</a></h2>
    // <footer><span class="star star35"></span><span class="rate">7</span></footer></li>
    const items = [];
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
    // infoid=8458;m3u8=['1080P']
    var infoid = (html.match(/infoid=(\d+)/) || [])[1];
    if (!infoid) return null;
    var m3u8Arr = (html.match(/m3u8\s*=\s*\[([^\]]+)\]/) || [])[1];
    if (!m3u8Arr) return null;
    var episodes = m3u8Arr.split(',').map(function(e){return e.trim().replace(/['"]/g,'');});
    return infoid + '|' + episodes.join('$');
}

// 构建分类过滤 URL
// 格式: /{type_id}/{genre}-{country}-{year}-{sort}.html
// 4段用join连接(3个分隔符) + 末尾额外1个横杠 = 共4个横杠
// 例: 全部 → /movie/----.html, Drama → /movie/Drama----.html
//     年份2026 → /movie/--2026--.html, 第2页 → /movie/---2-.html
function buildFilterUrl(tid, extend, pg) {
    var genre = extend.type || '';
    var country = extend.country || '';
    var year = extend.year || '';
    // 分页: 把 page 放在 sort 位置 (最后一段)
    var sort = '';
    if (pg > 1) sort = pg;
    return '/' + tid + '/' + [genre, country, year, sort].join('-') + '-.html';
}

function __jsEvalReturn() {
    return {
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
                        { key: 'type',   name: '类型',   default: '',
                          value: [
                              { n: '全部',     v: '' },
                              { n: '动作',     v: 'Action' },
                              { n: '喜剧',     v: 'Comedy' },
                              { n: '爱情',     v: 'Romance' },
                              { n: '科幻',     v: 'Sci-Fi' },
                              { n: '恐怖',     v: 'Horror' },
                              { n: '剧情',     v: 'Drama' },
                              { n: '悬疑',     v: 'Mystery' },
                              { n: '惊悚',     v: 'Thriller' },
                              { n: '动画',     v: 'Animation' },
                              { n: '犯罪',     v: 'Crime' },
                              { n: '冒险',     v: 'Adventure' },
                              { n: '奇幻',     v: 'Fantasy' },
                              { n: '传记',     v: 'Biography' },
                              { n: '历史',     v: 'History' },
                              { n: '战争',     v: 'War' },
                              { n: '音乐',     v: 'Music' },
                              { n: '体育',     v: 'Sport' },
                              { n: '纪录片',   v: 'Documentary' }
                          ]},
                        { key: 'year',  name: '年份',  default: '',
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
                return JSON.stringify({ class: [], filters: {} });
            }
        },

        category: function(tid, pg, filter, extend) {
            try {
                var pagePath = buildFilterUrl(tid, extend, pg);
                var html = req(HOST + pagePath);
                var list = _parseItems(html);
                var total = 1;
                return JSON.stringify({
                    list: list,
                    page: pg,
                    pagecount: total,
                    limit: list.length
                });
            } catch (e) {
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
                return JSON.stringify({ list: [] });
            }
        },

        search: function(key, quick, pg) {
            try {
                var searchUrl = HOST + '/search/' + encodeURIComponent(key) + '/';
                var html = req(searchUrl);
                var items = [];
                // 搜索返回格式与分类页相同
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
}

export { __jsEvalReturn };

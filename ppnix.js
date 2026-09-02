// FongMi/TV Spider — ppnix.com
// 兼容 cat.js 格式：导出 __jsEvalReturn 返回 Spider 对象
// 注意：必须是 ES Module，需要 export

const HOST = 'https://www.ppnix.com';
const UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';

function req(url, opt) {
    // opt: { headers, method, body } — 支持 GET 和 POST
    if (!opt) opt = {};
    if (!opt.headers) opt.headers = {};
    opt.headers['User-Agent'] = UA;
    return http(url, opt);
}

function _parseItems(html) {
    // <li><a href="/movie/8470.html" class="thumbnail" target="_blank">
    //   <img ... src="..." alt="title">
    //   <div class="countrie"><span class="orange">2025</span></div>
    //   <div class="note"><span></span></div>
    // </a><h2><a href="/movie/8470.html" target="_blank" title="title">title</a></h2>
    // <footer><span class="star star35"></span><span class="rate">7</span></footer></li>
    const items = [];
    const re = /<li>\s*<a\s+href="(\/movie\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<h2><a[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<span\s+class="rate"[^>]*>([^<]+)<\/span>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        items.push({
            vod_id: m[1].replace('.html',''),
            vod_name: m[3],
            vod_pic: m[2],
            vod_remarks: m[4]
        });
    }
    return items;
}

function parseM3u8(html) {
    // infoid=8458;m3u8=['1080P']
    const infoid = (html.match(/infoid=(\d+)/) || [])[1];
    if (!infoid) return null;
    const m3u8Arr = (html.match(/m3u8\s*=\s*\[([^\]]+)\]/) || [])[1];
    if (!m3u8Arr) return null;
    const episodes = m3u8Arr.split(',').map(function(e){return e.trim().replace(/['"]/g,'');});
    return infoid + '|' + episodes.join('$');
}

function __jsEvalReturn() {
    return {
        meta: {},

        home: function(filter) {
            try {
                var classes = [
                    { type_id: 'movie', type_name: '电影' },
                    { type_id: 'tv',   type_name: '电视剧' }
                ];
                var filters = {};
                ['movie', 'tv'].forEach(function(tid) {
                    filters[tid] = [
                        { key: 'type',   name: '类型',   default: '',
                          value: [
                              { n: '全部',    v: '' },
                              { n: '动作',    v: 'Action' },
                              { n: '喜剧',    v: 'Comedy' },
                              { n: '爱情',    v: 'Romance' },
                              { n: '科幻',    v: 'Sci-Fi' },
                              { n: '恐怖',    v: 'Horror' },
                              { n: '剧情',    v: 'Drama' },
                              { n: '悬疑',    v: 'Mystery' },
                              { n: '惊悚',    v: 'Thriller' },
                              { n: '动画',    v: 'Animation' }
                          ]},
                        { key: 'country', name: '地区',  default: '',
                          value: [
                              { n: '全部', v: '' },
                              { n: '美国', v: 'United States' },
                              { n: '英国', v: 'United Kingdom' },
                              { n: '中国大陆', v: 'China' },
                              { n: '日本', v: 'Japan' },
                              { n: '韩国', v: 'Korea' }
                          ]},
                        { key: 'year',  name: '年份',  default: '',
                          value: [
                              { n: '全部', v: '' },
                              { n: '2026', v: '2026' },
                              { n: '2025', v: '2025' },
                              { n: '2024', v: '2024' },
                              { n: '2023', v: '2023' },
                              { n: '2022', v: '2022' }
                          ]},
                        { key: 'by',    name: '排序',  default: '',
                          value: [
                              { n: '最新', v: '' },
                              { n: '热度', v: 'hits' },
                              { n: '评分', v: 'score' }
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
                var path = tid + '/';
                // 过滤参数：-type--country--year--by.html
                var byPart = '';
                if (extend.by) byPart += extend.by;
                if (byPart === 'hits' || byPart === 'score') {
                    byPart = '-' + byPart;
                }
                var yearPart = extend.year ? '-' + extend.year : '';
                var countryPart = extend.country ? '-' + extend.country : '';
                var typePart = extend.type ? extend.type : '';
                path += '-' + typePart + countryPart + '--' + yearPart + '--' + byPart + '.html';
                if (pg > 1) {
                    path = path.replace('.html', '_' + pg + '.html');
                }
                var html = req(HOST + '/' + path);
                var list = _parseItems(html);
                var total = 1;
                return JSON.stringify({
                    list: list,
                    page: pg,
                    pagecount: total,
                    total: list.length
                });
            } catch (e) {
                return JSON.stringify({ list: [], page: pg, pagecount: 1, total: 0 });
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
                // 搜索返回的是链接列表，每条 /movie/ID.html
                var searchUrl = HOST + '/search/' + encodeURIComponent(key) + '/';
                var html = req(searchUrl);
                var items = [];
                // 搜索结果格式：<li><a href="/movie/8449.html">...</a></li>
                var re = /<li>\s*<a\s+href="(\/movie\/[^"]+)"[^>]*>[\s\S]*?<h2><a[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<span\s+class="rate"[^>]*>([^<]+)<\/span>/g;
                let m;
                while ((m = re.exec(html)) !== null) {
                    items.push({
                        vod_id: m[1].replace('.html',''),
                        vod_name: m[2],
                        vod_pic: 'https://www.ppnix.com/static/img/logo.png',
                        vod_remarks: m[3]
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

// ES Module 导出，供 spider.js 的 import * as spider 识别
export { __jsEvalReturn };

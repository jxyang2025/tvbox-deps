// FongMi/TV Spider — ppnix.com
// 兼容 cat.js 格式：导出 __jsEvalReturn 返回 Spider 对象

const HOST = 'https://www.ppnix.com';

function request(url) {
    return http(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }
    });
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
            vod_id: m[1],
            vod_name: m[3].trim(),
            vod_pic: m[2],
            vod_remarks: m[4].trim()
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
    const eps = m3u8Arr.split(',').map(s => s.trim().replace(/['"]/g, ''));
    return { infoid, eps };
}

function __jsEvalReturn() {
    return {
        home: function(filter) {
            try {
                const html = request(HOST + '/');
                const cats = [
                    { type_id: 'movie', type_name: '电影' },
                    { type_id: 'tv', type_name: '电视剧' }
                ];
                const filters = {
                    "movie": [
                        { key: "type", name: "类型", value: [
                            { n: "全部", v: "" }, { n: "剧情", v: "Drama" }, { n: "喜剧", v: "Comedy" },
                            { n: "动作", v: "Action" }, { n: "爱情", v: "Romance" }, { n: "恐怖", v: "Horror" },
                            { n: "科幻", v: "Sci Fi" }, { n: "悬疑", v: "Mystery" }, { n: "动画", v: "Animation" },
                            { n: "纪录", v: "Documentary" }
                        ]},
                        { key: "year", name: "年份", value: [
                            { n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" },
                            { n: "2024", v: "2024" }, { n: "2023", v: "2023" }, { n: "2022", v: "2022" },
                            { n: "2021", v: "2021" }, { n: "2020", v: "2020" }, { n: "2019", v: "2019" },
                            { n: "2018", v: "2018" }, { n: "2017", v: "2017" }, { n: "2016", v: "2016" }
                        ]},
                        { key: "by", name: "排序", value: [
                            { n: "时间", v: "time" }, { n: "人气", v: "hits" }, { n: "评分", v: "score" }
                        ]}
                    ],
                    "tv": [
                        { key: "type", name: "类型", value: [
                            { n: "全部", v: "" }, { n: "剧情", v: "Drama" }, { n: "喜剧", v: "Comedy" },
                            { n: "动作", v: "Action" }, { n: "科幻", v: "Sci Fi" }, { n: "悬疑", v: "Mystery" },
                            { n: "恐怖", v: "Horror" }, { n: "动画", v: "Animation" }, { n: "纪录", v: "Documentary" }
                        ]},
                        { key: "year", name: "年份", value: [
                            { n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" },
                            { n: "2024", v: "2024" }, { n: "2023", v: "2023" }, { n: "2022", v: "2022" },
                            { n: "2021", v: "2021" }, { n: "2020", v: "2020" }
                        ]},
                        { key: "by", name: "排序", value: [
                            { n: "时间", v: "time" }, { n: "人气", v: "hits" }, { n: "评分", v: "score" }
                        ]}
                    ]
                };
                return JSON.stringify({ class: cats, filters: filters });
            } catch (e) {
                return JSON.stringify({ class: [], filters: {} });
            }
        },

        category: function(tid, pg, filter, extend) {
            try {
                pg = parseInt(pg) || 1;
                const ex = extend || {};
                const t = ex.type || '';
                const y = ex.year || '';
                const b = ex.by || '';
                // filter path: /movie/TYPESY--YEAR--BY.html
                // e.g., Drama----.html (type only), --2026--.html (year only)
                let path = '/' + tid + '/-' + t + '--' + y + '--' + b + '.html';
                if (pg > 1) path = path.replace(/\.html$/, '_' + pg + '.html');
                
                const html = request(HOST + path);
                const items = _parseItems(html);
                
                // 判断是否有下一页
                const hasNext = html.indexOf('下一页') >= 0 || html.indexOf('"next"') >= 0;
                const pageCount = hasNext ? pg + 1 : pg;
                
                return JSON.stringify({
                    list: items,
                    page: pg,
                    pagecount: pageCount,
                    total: items.length
                });
            } catch (e) {
                return JSON.stringify({ list: [], page: pg, pagecount: 1, total: 0 });
            }
        },

        detail: function(id) {
            try {
                const html = request(HOST + id);
                const parsed = parseM3u8(html);
                if (!parsed) return JSON.stringify({ list: [] });
                
                const { infoid, eps } = parsed;
                
                // 提取标题、图片、简介
                const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
                const altMatch = html.match(/<img[^>]*alt="([^"]*)"/);
                const picMatch = html.match(/<img[^>]*src="([^"]+)"/);
                const introMatch = html.match(/<div[^>]*intro[^>]*>([\s\S]*?)<\/div>/);
                
                const name = (nameMatch && nameMatch[1]) || (altMatch && altMatch[1]) || '未知';
                const pic = (picMatch && picMatch[1]) || '';
                const intro = introMatch ? introMatch[1].replace(/<[^>]+>/g, '').trim() : '';
                
                // 构建播放列表：每集 URL = /info/m3u8/{infoid}/{ep}.m3u8
                const playFrom = eps.map(ep => HOST + '/info/m3u8/' + infoid + '/' + ep + '.m3u8');
                const playlist = eps.map((ep, i) => ep + '$' + playFrom[i]).join('#');
                
                return JSON.stringify({
                    list: [{
                        vod_id: id,
                        vod_name: name,
                        vod_pic: pic,
                        vod_content: intro,
                        vod_play_from: 'PPnix',
                        vod_play_url: playlist
                    }]
                });
            } catch (e) {
                return JSON.stringify({ list: [] });
            }
        },

        search: function(key, quick, pg) {
            try {
                pg = parseInt(pg) || 1;
                const encoded = encodeURIComponent(key);
                const html = request(HOST + '/search/' + encoded + '/');
                const items = _parseItems(html);
                return JSON.stringify({
                    list: items,
                    page: pg,
                    pagecount: pg + 1,
                    total: items.length
                });
            } catch (e) {
                return JSON.stringify({ list: [], page: pg, pagecount: 1, total: 0 });
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

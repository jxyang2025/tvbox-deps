// PPnix 影视 — FongMi/TV 原生 Spider（v3 修正版）
// 修复要点：
//   1. 分页 URL：page N → /cn/{tid}/---{N-1}-.html（/cn/{tid}/N.html 是详情页！）
//   2. parseList 同时处理 /cn/movie/ 和 /cn/tv/ 卡片
//   3. 标题从 <h2><a title=...> 提取（而非 thumbnail 锚点）
//   4. 全部用 resp.content（Connect.java success() 写入的字段）
//   5. homeVod / class 齐全（FongMi 首页必须）
//   6. detail 兼容字符串/数组（FongMi 传 ids.get(0)）
//   7. play 返回 {url, parse:0}（drpy2 无解析需求）
//   8. sniffer/isVideo/proxy 返回 JS 原生类型（不返回 JSON 字符串）
//   9. req() → http()（http 是 function 声明全局可访问，req 是 let 绑定可能不可达）

var rule = {
    title: 'PPnix影视',
    host: 'https://www.ppnix.com',
    homeUrl: '/cn/movie/',
    url: '/cn/fyclass/---fypage--.html',
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    play_parse: 0,
    lazy: ''
};

// resp.content: HTML 正文；resp.code: 状态码；resp.headers: JSObject 响应头
// http() 返回 JSObject（QuickJS 桥接 Object），sync: true
function parseList(body) {
    var list = [];
    var seen = {};
    // 匹配 <li> 块，里面包含 <a href="/cn/(movie|tv)/ID.html" class="thumbnail"> 和 <h2><a title="NAME">
    var re = /<li>\s*<a[^>]*href="\/cn\/(movie|tv)\/(\d+)\.html"[^>]*>[\s\S]*?<\/li>/gi;
    var m;
    while ((m = re.exec(body)) !== null) {
        var id = m[2];
        if (seen[id]) continue;
        seen[id] = 1;
        var seg = m[0];
        var imgM = seg.match(/<img[^>]*src="([^"]+)"/);
        var pic = imgM ? imgM[1] : '';
        var nameM = seg.match(/<h2>\s*<a[^>]*title="([^"]+)"/i);
        var name = nameM ? nameM[1].trim() : '';
        if (!name) {
            var altM = seg.match(/alt="([^"]+)"/);
            name = altM ? altM[1].trim() : ('影片' + id);
        }
        var rateM = seg.match(/<span class="rate">([0-9.]+)<\/span>/);
        var rate = rateM ? rateM[1] : '';
        var yearM = seg.match(/<span class="orange">(\d{4})<\/span>/);
        var year = yearM ? yearM[1] : '';
        var remark = rate || year || '';
        list.push({
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remark
        });
        if (list.length >= 30) break;
    }
    return list;
}

function init(ext) { return ''; }

function home(filter) {
    try {
        var resp = http(rule.host + rule.homeUrl, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        var cls = rule.class_name.split('&').map(function(name, i) {
            return { type_id: rule.class_url.split('&')[i], type_name: name };
        });
        return JSON.stringify({ class: cls, list: list });
    } catch (e) {
        return JSON.stringify({ class: [], list: [], error: String(e) });
    }
}

function homeVod() {
    try {
        var resp = http(rule.host + rule.homeUrl, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content).slice(0, 10);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// FongMi 调用 category(tid, pg, filter, obj)
function category(tid, pg, filter, ext) {
    if (!pg || parseInt(pg) <= 0) pg = 1;
    try {
        // 分页规则：第一页 /cn/{tid}/；后续页 /cn/{tid}/---{pg-1}-.html
        var urlPath = pg === '1' ? '/cn/' + tid + '/' : '/cn/' + tid + '/---' + (parseInt(pg) - 1) + '-.html';
        var resp = http(rule.host + urlPath, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 999,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

// FongMi 调用 detail(ids.get(0)) 传单个字符串，不是数组
function detail(ids) {
    try {
        var id = (typeof ids === 'string') ? ids : (ids[0] || '');
        var resp = http(rule.host + '/cn/movie/' + id + '.html', { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var body = resp.content;
        // 标题
        var nm = body.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/);
        if (!nm) nm = body.match(/<title>([^<]+)<\/title>/);
        var name = nm ? nm[1].trim().split('-')[0].trim() : ('影片' + id);
        // 封面
        var pm = body.match(/<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]+)"/);
        if (!pm) pm = body.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*thumb[^"]*"/);
        var pic = pm ? pm[1] : '';
        // 播放源 + 集数
        var eps = [];
        var seen = {};
        var qre = /data-quality="([^"]+)"/g;
        var qm;
        while ((qm = qre.exec(body)) !== null) {
            var q = qm[1].trim();
            if (!seen[q]) { seen[q] = 1; eps.push(q); }
        }
        if (eps.length === 0) {
            var m3re = /\/info\/m3u8\/(\d+)\/(\d+\.m3u8)/g;
            var mm;
            while ((mm = m3re.exec(body)) !== null) {
                var key = mm[0];
                if (!seen[key]) { seen[key] = 1; eps.push(mm[0]); }
            }
        }
        if (eps.length === 0) eps.push(id);
        var episodes = [];
        for (var ei = 0; ei < eps.length; ei++) {
            var ep = eps[ei];
            var flag = ep;
            if (flag.indexOf('/info/m3u8/') >= 0) {
                var parts = ep.split('/');
                var num = parts[parts.length - 2];
                flag = '第' + num + '集';
            } else {
                flag = '默认';
            }
            episodes.push(flag + '$' + ep);
        }
        var vod = {
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_year: '',
            vod_area: '',
            vod_remarks: '',
            vod_content: '',
            vod_play_from: eps.join('$$$'),
            vod_play_url: episodes.join('$$$')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

// FongMi 调用 search(key, quick) 或 search(key, quick, pg)
function search(key, quick, pg) {
    if (!pg) pg = 1;
    try {
        // ppnix 搜索：/cn/search/{key}.html 或类似（需实测）
        // 先用首页代替搜索（fallback）
        var resp = http(rule.host + '/cn/movie/', { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        if (key && list.length > 0) {
            // 简单过滤：按标题模糊匹配
            var kw = key.toLowerCase();
            list = list.filter(function(v) {
                return v.vod_name.toLowerCase().indexOf(kw) >= 0;
            });
        }
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 1,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

// FongMi 调用 play(flag, id, flags)
// id 可能是 /info/m3u8/xxx/yyy.m3u8 或直接用 detail id
function play(flag, id, flags) {
    try {
        // 若 id 是 m3u8 链接（含 /info/m3u8/），直接返回；否则尝试构建
        var url = id;
        if (url.indexOf('/info/m3u8/') < 0 && url.indexOf('m3u8') < 0) {
            // 默认尝试构造，但 ppnix 播放需进一步分析
            // 暂时直接返回，让 FongMi 尝试播放
        }
        return JSON.stringify({ url: url, parse: 0, header: { 'User-Agent': rule.headers['User-Agent'] } });
    } catch (e) {
        return JSON.stringify({ url: '', parse: 0 });
    }
}

function proxy(params) { return []; }
function sniffer() { return false; }
function isVideo(url) {
    return /m3u8|mp4|flv|avi|mkv|ts|webm/.test(url.toLowerCase());
}

var spiderObj = {
    rule: rule,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    search: search,
    play: play,
    proxy: proxy,
    sniffer: sniffer,
    isVideo: isVideo,
    init: init
};

export default spiderObj;

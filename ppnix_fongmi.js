// PPnix 影视 — FongMi/TV 原生 Spider（v2 修正版）
// 修正：resp.content（Connect.java success() 字段名 content，非 string）
// 修正：加 init / homeVod（FongMi 必调，缺函数返回 null 但稳妥起见补全）
// 修正：detail 兼容字符串和数组（FongMi 传 ids.get(0) 字符串）
// 修正：home 返回 class 字段（FongMi 首页靠 class 渲染分类栏）
// 依赖：仅用 http()（FongMi/TV http.js 的 function 声明，全局可访问）

var rule = {
    title: 'PPnix影视',
    host: 'https://www.ppnix.com',
    homeUrl: '/cn/movie/',
    url: '/cn/fyclass/fypage.html',
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    searchUrl: '/cn/?s=**',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    changeable: 0,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36'
    }
};

// http(url, {headers, async: false}) → JSObject {code, headers, content}
// resp.code: HTTP 状态码（200/404/...）
// resp.content: 响应体字符串（默认 buffer=0）
// resp.headers: JSObject 含响应头

function parseList(html) {
    var list = [];
    var seen = {};
    // 匹配：<a href="/cn/movie/ID.html" ... title="NAME" ...><img src="PIC" ...></a>
    var re = /<a[^>]*href="\/cn\/movie\/(\d+)\.html"[^>]*(?:title="([^"]*)")?[^>]*>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var id = m[1];
        if (seen[id]) continue;
        seen[id] = 1;
        var name = m[2] ? m[2].trim() : '';
        var seg = html.substring(m.index, Math.min(m.index + 600, html.length));
        var picM = seg.match(/<img[^>]*src="([^"]*)"[^>]*>/);
        var pic = picM ? picM[1] : '';
        if (!name) {
            var emM = seg.match(/<(?:em|h\d|span)[^>]*>([^<]{2,40})<\/(?:em|h\d|span)>/);
            name = emM ? emM[1].trim() : ('影片' + id);
        }
        list.push({ vod_id: id, vod_name: name, vod_pic: pic, vod_remarks: '电影' });
        if (list.length >= 30) break;
    }
    return list;
}

function init(ext) {
    return '';
}

function home(filter) {
    try {
        var resp = http(rule.host + rule.homeUrl, { headers: rule.headers, async: false });
        if (resp.code !== 200) throw 'HTTP ' + resp.code;
        var list = parseList(resp.content);
        // class 必填：FongMi 首页靠 class 渲染分类选择栏
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
        if (resp.code !== 200) throw 'HTTP ' + resp.code;
        var list = parseList(resp.content).slice(0, 10);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

function category(tid, pg, filter, ext) {
    if (!pg || pg <= 0) pg = 1;
    try {
        var url = rule.host + rule.url.replace('fyclass', tid).replace('fypage', '' + pg);
        var resp = http(url, { headers: rule.headers, async: false });
        if (resp.code !== 200) throw 'HTTP ' + resp.code;
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

// FongMi 调用 detail(ids.get(0)) 传字符串，不是数组
function detail(ids) {
    try {
        var id = (typeof ids === 'string') ? ids : (ids[0] || '');
        var resp = http(rule.host + '/cn/movie/' + id + '.html', { headers: rule.headers, async: false });
        if (resp.code !== 200) throw 'HTTP ' + resp.code;
        var body = resp.content;
        var name = '';
        var pic = '';
        var nm = body.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/);
        if (!nm) nm = body.match(/<title>([^<]+)<\/title>/);
        name = nm ? nm[1].trim() : ('影片' + id);
        var pm = body.match(/<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]*)"/);
        if (!pm) pm = body.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*thumb[^"]*"/);
        pic = pm ? pm[1] : '';

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
                var q = mm[2].replace('.m3u8', '');
                if (!seen[q]) { seen[q] = 1; eps.push(q); }
            }
        }
        eps.sort(function(a, b) { return parseInt(b) - parseInt(a); });
        var playUrl = eps.map(function(q) {
            return q + '$' + rule.host + '/info/m3u8/' + id + '/' + q + '.m3u8';
        }).join('#');

        return JSON.stringify({
            list: [{
                vod_id: id,
                vod_name: name,
                vod_pic: pic,
                vod_play_from: 'PPnix',
                vod_play_url: playUrl || '暂无播放源'
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: ids, error: String(e) }] });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = 1;
    try {
        var url = rule.host + '/cn/?s=' + encodeURIComponent(key) + '&page=' + pg;
        var resp = http(url, { headers: rule.headers, async: false });
        if (resp.code !== 200) throw 'HTTP ' + resp.code;
        var list = parseList(resp.content);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

function play(flag, id, flags) {
    return JSON.stringify({ url: id, parse: 0 });
}

function proxy(params) {
    return JSON.stringify([]);
}

function sniffer() {
    return 'false';
}

function isVideo(url) {
    return /m3u8|mp4|flv|avi|mkv/.test(url.toLowerCase());
}

var spiderObj = {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    search: search,
    play: play,
    proxy: proxy,
    sniffer: sniffer,
    isVideo: isVideo
};

export default spiderObj;

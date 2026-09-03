// PPnix 影视 — FongMi/TV 原生 Spider
// 自包含，零外部依赖
// 仅使用 export default（不用 globalThis.__JS_SPIDER__，避免被 content.replace 破坏）
// 直接使用 FongMi/TV 内置的 req()（来自 http.js，同步返回含 .string/.headers/.code）

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// req / http 由 FongMi/TV 的 http.js 全局提供，无需重复定义

// 解析列表页 — 返回 vod 数组
function parseList(html) {
    var list = [];
    var seen = {};
    // 匹配 <a href="/cn/movie/ID.html" ... title="NAME" ...><img src="PIC" ...></a>
    var re = /<a[^>]*href="\/cn\/movie\/(\d+)\.html"[^>]*(?:title="([^"]*)")?[^>]*>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var id = m[1];
        if (seen[id]) continue;
        seen[id] = 1;
        var name = m[2] ? m[2].trim() : '';
        // 取图片（在链接后 600 字符内找 img）
        var seg = html.substring(m.index, m.index + 600);
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

function home(filter) {
    try {
        var html = req(rule.host + rule.homeUrl, { 'User-Agent': rule.headers['User-Agent'] });
        var body = (html && html.string) ? html.string : String(html);
        var list = parseList(body);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

function category(tid, pg, filter, ext) {
    if (pg <= 0) pg = 1;
    try {
        var url = rule.host + rule.url.replace('fyclass', tid).replace('fypage', '' + pg);
        var html = req(url, { 'User-Agent': rule.headers['User-Agent'] });
        var body = (html && html.string) ? html.string : String(html);
        var list = parseList(body);
        return JSON.stringify({ list: list, page: parseInt(pg), pagecount: 999, total: list.length });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

function detail(ids) {
    try {
        var id = ids[0];
        var html = req(rule.host + '/cn/movie/' + id + '.html', { 'User-Agent': rule.headers['User-Agent'] });
        var body = (html && html.string) ? html.string : String(html);
        var name = '';
        var pic = '';
        var nm = body.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/);
        if (!nm) nm = body.match(/<title>([^<]+)<\/title>/);
        name = nm ? nm[1].trim() : ('影片' + id);
        var pm = body.match(/<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]*)"/);
        if (!pm) pm = body.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*thumb[^"]*"/);
        pic = pm ? pm[1] : '';

        // 提取播放集数（data-quality 或 /info/m3u8/ID/QUALITY.m3u8）
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
        return JSON.stringify({ list: [{ vod_id: ids[0], error: String(e) }] });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = 1;
    try {
        var url = rule.host + '/cn/?s=' + encodeURIComponent(key) + '&page=' + pg;
        var html = req(url, { 'User-Agent': rule.headers['User-Agent'] });
        var body = (html && html.string) ? html.string : String(html);
        var list = parseList(body);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

function play(flag, id, flags) {
    return JSON.stringify({ url: id, parse: 0 });
}

var spiderObj = {
    home: home,
    category: category,
    detail: detail,
    search: search,
    play: play
};

// 只导出 default，不手动设置 globalThis.__JS_SPIDER__
// （FongMi 的 content.replace 会破坏 globalThis.__JS_SPIDER__ 赋值）
export default spiderObj;

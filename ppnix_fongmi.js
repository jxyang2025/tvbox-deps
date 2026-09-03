// PPnix 影视 — FongMi/TV 原生 Spider（v6 真实搜索版）
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
    searchable: 1,
    quickSearch: 1,
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
// ppnix 详情页播放列表藏在 <script>m3u8=['1080P']</script>（电影=清晰度，剧集=集数编号）
// 真实播放 URL = https://www.ppnix.com/info/m3u8/{id}/{code}.m3u8
function detail(ids) {
    try {
        var id = (typeof ids === 'string') ? ids : (ids[0] || '');
        if (!/^\d+$/.test(id)) return JSON.stringify({ list: [] });
        var body = null, pageUrl = '';
        // 电影/剧集 id 空间不同：先试 movie，失败再试 tv
        var tries = ['/cn/movie/' + id + '.html', '/cn/tv/' + id + '.html'];
        for (var ti = 0; ti < tries.length; ti++) {
            var resp = http(rule.host + tries[ti], { headers: rule.headers, async: false });
            if (resp && resp.code === 200 && resp.content && /infoid=\d+/.test(resp.content)) {
                body = resp.content;
                pageUrl = tries[ti];
                break;
            }
        }
        if (!body) throw 'detail page not found for ' + id;
        // 标题
        var nm = body.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/);
        if (!nm) nm = body.match(/<title>([^<]+)<\/title>/);
        var name = nm ? nm[1].trim().split('-')[0].trim() : ('影片' + id);
        // 封面
        var pm = body.match(/<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]+)"/);
        if (!pm) pm = body.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*thumb[^"]*"/);
        var pic = pm ? pm[1] : '';
        // 播放列表：解析 m3u8=[...]（引号内取值）
        var codes = [];
        var sm = body.match(/m3u8=\[([^\]]*)\]/);
        if (sm) {
            var qre = /'([^']*)'/g, qm;
            while ((qm = qre.exec(sm[1])) !== null) {
                var c = qm[1].trim();
                if (c) codes.push(c);
            }
        }
        if (codes.length === 0) codes.push('1080P'); // 兜底：默认清晰度
        var isTv = pageUrl.indexOf('/tv/') >= 0;
        var episodes = [];
        for (var ei = 0; ei < codes.length; ei++) {
            var code = codes[ei];
            var label = /^\d+$/.test(code) ? '第' + code + '集' : code;
            episodes.push(label + '$https://www.ppnix.com/info/m3u8/' + id + '/' + code + '.m3u8');
        }
        var vod = {
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_year: '',
            vod_area: '',
            vod_remarks: isTv ? '共' + codes.length + '集' : '',
            vod_content: '',
            vod_play_from: 'PPnix',
            vod_play_url: episodes.join('$$$')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

// FongMi 调用 search(key, quick) 或 search(key, quick, pg)
// ppnix 真实搜索接口：GET /cn/search/{关键词}--.html（必须带 -- 后缀）
// 返回结果卡片与分类页结构相同（/cn/movie|tv/{id}.html + <h2> 标题），直接复用 parseList
function search(key, quick, pg) {
    if (!pg) pg = 1;
    try {
        var kw = encodeURIComponent(String(key || '').trim());
        if (!kw) return JSON.stringify({ list: [], page: parseInt(pg), pagecount: 1, total: 0 });
        var resp = http(rule.host + '/cn/search/' + kw + '--.html', { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: list.length > 0 ? 1 : 0,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e) });
    }
}

// FongMi 调用 play(flag, id, flags)
// id 是 detail 生成的完整绝对 m3u8 URL，直接透传
function play(flag, id, flags) {
    try {
        return JSON.stringify({ url: id, parse: 0 });
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

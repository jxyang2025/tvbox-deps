// juok3.top (剧OK) — FongMi 原生 Spider v2
// AppleCMS v10 模板，HTML 解析
// 参照 PPnix 结构：全函数实现 + 错误标题提示

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    homeUrl: '/category/movie',
    url: '/category/fyclass',
    searchUrl: '/vod/search/**-fypage.html',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    },
    class_name: '电影&电视剧&综艺&动漫&短剧',
    class_url: '1&2&3&4&5',
    play_parse: 0,
    lazy: ''
};

function parseList(body) {
    var items = [];
    var seen = {};
    // Pattern: <a href="/detail/{cid}/{sid}" ... > ... </a>
    var re = /<a[^>]+href="\/detail\/(\d+)\/([A-Za-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(body)) !== null) {
        var cid = m[1], sid = m[2];
        var key = cid + '_' + sid;
        if (seen[key]) continue;
        seen[key] = 1;
        var seg = m[3];
        // Image: <img src="..." alt="..." />
        var imgM = seg.match(/<img[^>]+src="([^"]+)"/);
        var pic = imgM ? imgM[1] : '';
        if (!pic) imgM = seg.match(/data-src="([^"]+)"/);
        if (imgM) pic = imgM[1];
        // Title: <span class="name"> or **title** or text
        var nameM = seg.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</);
        if (!nameM) nameM = seg.match(/\*\*([^\*]+)\*\*/);
        if (!nameM) nameM = seg.match(/alt="([^"]+)"/);
        var name = nameM ? nameM[1].trim() : '';
        // Remark: 全XX集 / 更新至XX集
        var remM = seg.match(/(全\d+集|更新至\d+集|更新至(\d+)集)/);
        var remark = remM ? remM[1] : '';
        if (!name) continue;
        items.push({ vod_id: key, vod_name: name, vod_pic: pic, vod_remarks: remark });
        if (items.length >= 40) break;
    }
    return items;
}

function init(ext) { return ''; }

function home(filter) {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        // 首页也有列表，复用 parseList
        var list = parseList(resp.content).slice(0, 20);
        var cls = rule.class_name.split('&').map(function(n, i) {
            return { type_id: rule.class_url.split('&')[i], type_name: n };
        });
        return JSON.stringify({ class: cls, list: list });
    } catch (e) {
        return JSON.stringify({ class: [], list: [], error: '❌ 剧OK连接失败，请检查域名是否生效' });
    }
}

function homeVod() {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        return JSON.stringify({ list: parseList(resp.content).slice(0, 12) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

function category(tid, pg, filter, ext) {
    if (!pg) pg = '1';
    try {
        var url = '/category/' + tid;
        if (parseInt(pg) > 1) url += '/p/' + pg + '/';
        var resp = http(rule.host + url, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 999,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: '❌ 剧OK' + (pg > 1 ? '第' + pg + '页' : '分类') + '加载失败: ' + e });
    }
}

function detail(ids) {
    try {
        var id = typeof ids === 'string' ? ids : (ids[0] || '');
        if (!id) return JSON.stringify({ list: [] });
        var parts = id.split('_');
        var cid = parts[0], sid = parts[1];
        if (!sid) return JSON.stringify({ list: [] });
        var resp = http(rule.host + '/detail/' + cid + '/' + sid, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) return JSON.stringify({ list: [] });
        var body = resp.content;
        // 标题
        var nm = body.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (!nm) nm = body.match(/<title>([^<]+)<\/title>/);
        var name = nm ? nm[1].trim() : sid;
        // 封面
        var pm = body.match(/<img[^>]+src="(https?:\/\/[^"]+\.jpg[^"]*)"/);
        var pic = pm ? pm[1] : '';
        if (!pic) pm = body.match(/<img[^>]+data-src="(https?:\/\/[^"]+\.jpg[^"]*)"/);
        if (pm) pic = pm[1];
        // 简介
        var descM = body.match(/<div[^>]*class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        var content = '';
        if (descM) {
            content = descM[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        }
        if (!content) {
            var dM = body.match(/<span[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]*)<\/span>/);
            content = dM ? dM[1] : '';
        }
        // 演员/导演
        var actorM = body.match(/<span[^>]*class="[^"]*actor[^"]*"[^>]*>([^<]*)<\/span>/i);
        var directorM = body.match(/<span[^>]*class="[^"]*director[^"]*"[^>]*>([^<]*)<\/span>/i);
        var yearM = body.match(/<span[^>]*class="[^"]*year[^"]*"[^>]*>([^<]*)<\/span>/i);
        // 选集
        var eps = [];
        var playRe = /<a[^>]+href="\/play\/\d+\/[A-Za-z0-9]+\/(\d+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
        var pm2;
        while ((pm2 = playRe.exec(body)) !== null) {
            var ep = pm2[2] ? pm2[2].trim() : ('第' + pm2[1] + '集');
            eps.push(ep + '$' + rule.host + '/play/' + cid + '/' + sid + '/' + pm2[1] + '?s=qiyi');
        }
        // 如果没有找到选集，尝试另一种格式
        if (eps.length === 0) {
            var altRe = /<a[^>]+href="(\/play\/\d+\/[A-Za-z0-9]+\/\d+[^"]*)"[^>]*>([^<]+)<\/a>/gi;
            var am;
            while ((am = altRe.exec(body)) !== null) {
                var murl = am[1].split('?')[0];
                var numM = murl.match(/\/(\d+)$/, murl);
                var epname = am[2] ? am[2].trim() : '第' + numM + '集';
                eps.push(epname + '$' + rule.host + murl);
            }
        }
        if (eps.length > 0) {
            var vod = {
                vod_id: id,
                vod_name: name,
                vod_pic: pic,
                vod_content: content,
                vod_actor: actorM ? actorM[1] : '',
                vod_director: directorM ? directorM[1] : '',
                vod_year: yearM ? yearM[1] : '',
                vod_play_from: '剧OK',
                vod_play_url: eps.join('#')
            };
            return JSON.stringify({ list: [vod] });
        }
        // 失败提示
        return JSON.stringify({ list: [], error: '❌ 剧OK 未找到播放列表，请检查视频页面' });
    } catch (e) {
        return JSON.stringify({ list: [], error: '❌ 剧OK 详情加载失败: ' + e });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = '1';
    try {
        var kw = encodeURIComponent(key);
        var resp = http(rule.host + '/vod/search/' + kw + '-' + pg + '.html', {
            headers: rule.headers, async: false, timeout: rule.timeout
        });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 999,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: '❌ 剧OK 搜索失败: ' + e });
    }
}

function play(flag, id, flags) {
    try {
        var resp = http(rule.host + id, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) return JSON.stringify({ url: '', parse: 1 });
        var body = resp.content;
        // 1. var url = "..." 或 var player_url = "..."
        var urlM = body.match(/var\s+(?:url|player_url|current_url)\s*=\s*"([^"]+)"/);
        if (urlM) {
            var u = urlM[1];
            return JSON.stringify({ url: u, parse: /m3u8|mp4/.test(u) ? 0 : 1 });
        }
        // 2. iframe src
        var iframeM = body.match(/<iframe[^>]+src="(https?:\/\/[^"]+)"/);
        if (iframeM) return JSON.stringify({ url: iframeM[1], parse: 1 });
        // 3. base64 encoded player data
        var b64M = body.match(/data-play="([A-Za-z0-9+\/=]+)"/);
        if (b64M) {
            try { var u = atob(b64M[1]); return JSON.stringify({ url: u, parse: /m3u8/.test(u) ? 0 : 1 }); } catch(e) {}
        }
        // 无结果
        return JSON.stringify({ url: '', parse: 1, error: '❌ 剧OK 播放地址解析失败' });
    } catch (e) {
        return JSON.stringify({ url: '', parse: 1, error: '❌ 剧OK 播放请求失败: ' + e });
    }
}

function proxy(params) { return []; }
function sniffer() { return false; }
function isVideo(url) { return /m3u8|mp4|flv|avi|mkv|ts|webm/.test(url.toLowerCase()); }

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

// 剧OK (juok3.top) — FongMi/TV 原生 spider v14
// 严格遵循 FongMi SPIDER.md 函数命名规范
// QuickJS export default spiderObj
// AppleCMS v10 短剧站
// 2026-09-04

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    homeUrl: '/category/movie',
    class_name: '电影&电视剧&综艺&动漫',
    class_url: 'movie&tv&variety&anime',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    play_parse: 0,
    lazy: ''
};

// 从HTML或markdown中解析列表
// FongMi http() 返回原始HTML；web_extract缓存为markdown
function parseList(body) {
    var list = [];
    var seen = {};
    if (!body) return list;

    // 格式1: AppleCMS v10 标准HTML
    var htmlRe = /<a[^>]*href=["']\/detail\/(\d+)\/([A-Za-z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = htmlRe.exec(body)) !== null) {
        var typeId = m[1];
        var uid = m[2];
        var inner = m[3];
        var picM = inner.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i);
        var pic = picM ? picM[1] : '';
        var nameM = inner.match(/alt=["']([^"']+)["']/i) || inner.match(/title=["']([^"']+)["']/i) || inner.match(/<span[^>]*>([^<]+)<\/span>/i);
        var name = nameM ? nameM[1].trim() : '';
        if (!name || name.length < 2) continue;
        var key = uid;
        if (!seen[key]) {
            seen[key] = 1;
            list.push({ vod_id: key, vod_name: name, vod_pic: pic, vod_remarks: '' });
        }
        if (list.length >= 30) break;
    }

    // 格式2: markdown格式 (drpy2/fetch返回)
    if (list.length === 0) {
        var mdRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[\s\S]*?\]\((https?:\/\/[^)]+)\)/gi;
        while ((m = mdRe.exec(body)) !== null) {
            var name2 = m[1].trim();
            var pic2 = m[2];
            var url2 = m[3];
            var uidM = url2.match(/\/detail\/(\d+)\/([A-Za-z0-9]+)$/);
            if (!uidM) continue;
            var uid2 = uidM[2];
            if (!name2 || name2.length < 2) continue;
            if (!seen[uid2]) {
                seen[uid2] = 1;
                list.push({ vod_id: uid2, vod_name: name2, vod_pic: pic2, vod_remarks: '' });
            }
            if (list.length >= 30) break;
        }
    }

    // 格式3: 宽松配对
    if (list.length === 0) {
        var imgs = body.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g) || [];
        var details = body.match(/\[([^\]]+)\]\((https?:\/\/[^)]+\/detail\/\d+\/[A-Za-z0-9]+)\)/g) || [];
        var cnt = Math.min(imgs.length, details.length, 30);
        for (var i = 0; i < cnt; i++) {
            var imgM = imgs[i].match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
            var detM = details[i].match(/\[([^\]]+)\]\((https?:\/\/[^)]+\/detail\/(\d+)\/([A-Za-z0-9]+))\)/);
            if (imgM && detM) {
                var name3 = imgM[1].trim() || detM[1].trim();
                var pic3 = imgM[2];
                var uid3 = detM[3];
                if (name3.length > 1 && !seen[uid3]) {
                    seen[uid3] = 1;
                    list.push({ vod_id: uid3, vod_name: name3, vod_pic: pic3, vod_remarks: '' });
                }
            }
        }
    }

    return list;
}

function init(ext) {
    return '';
}

// SPIDER.md: homeContent(filter)
function homeContent(filter) {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content);
        var cls = rule.class_name.split('&').map(function(name, i) {
            return { type_id: rule.class_url.split('&')[i], type_name: name };
        });
        return JSON.stringify({ class: cls, list: list });
    } catch (e) {
        return JSON.stringify({ class: [], list: [] });
    }
}

// SPIDER.md: homeVideoContent()
function homeVideoContent() {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content).slice(0, 10);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// SPIDER.md: categoryContent(tid, pg, filter, extend)
function categoryContent(tid, pg, filter, extend) {
    if (!pg || parseInt(pg) <= 0) pg = '1';
    try {
        var clsMap = { 'movie': '电影', 'tv': '电视剧', 'variety': '综艺', 'anime': '动漫' };
        var clsName = clsMap[tid] || tid;
        var urlPath = '/category/' + tid;
        if (parseInt(pg) > 1) urlPath += '/page/' + pg + '.html';

        var resp = http(rule.host + urlPath, { headers: rule.headers, async: false });
        var list = [];
        if (resp && resp.code === 200 && resp.content) {
            list = parseList(resp.content);
        }

        // 备选：搜索页
        if (list.length === 0) {
            var searchUrl = rule.host + '/search?q=' + encodeURIComponent(clsName);
            if (parseInt(pg) > 1) searchUrl += '&page=' + pg;
            var resp2 = http(searchUrl, { headers: rule.headers, async: false });
            if (resp2 && resp2.code === 200) {
                list = parseList(resp2.content);
            }
        }

        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 999,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: 1, pagecount: 1, total: 0 });
    }
}

// SPIDER.md: detailContent(ids)
function detailContent(ids) {
    try {
        var id = ids || '';
        if (!id) return JSON.stringify({ list: [] });
        // ids 可能是数组
        if (Array.isArray(id)) id = id[0];

        var types = ['1', '2', '3', '4'];
        var body = null;
        for (var ti = 0; ti < types.length; ti++) {
            var url = rule.host + '/detail/' + types[ti] + '/' + id;
            var resp = http(url, { headers: rule.headers, async: false });
            if (resp && resp.code === 200 && resp.content) {
                if (/play|episodes|集|vod_play/.test(resp.content)) {
                    body = resp.content;
                    break;
                }
            }
        }
        if (!body) throw 'detail not found for ' + id;

        var nm = body.match(/<title>([^<]+)<\/title>/);
        var name = nm ? nm[1].trim().split('-')[0].split('|')[0].trim() : '';
        if (!name) {
            var h1M = body.match(/<h1[^>]*>([^<]+)<\/h1>/);
            name = h1M ? h1M[1].trim() : ('影片' + id);
        }
        var year = '';
        var ym = name.match(/(\d{4})/);
        if (ym) year = ym[1];

        var pm = body.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
        var pic = pm ? pm[1] : '';
        if (!pic) {
            pm = body.match(/<meta[^>]*property="og:image"[^>]*content="(.*?)"/i);
            pic = pm ? pm[1] : '';
        }

        var content = '';
        var descM = body.match(/<meta[^>]*name="description"[^>]*content="(.*?)"/i);
        if (descM) content = descM[1].replace(/<[^>]+>/g, '');
        if (!content) {
            var introM = body.match(/<span[^>]*class=["']intro["'][^>]*>([\s\S]*?)<\/span>/i);
            if (introM) content = introM[1].replace(/<[^>]+>/g, '');
        }

        var actorM = body.match(/主演[：:]\s*([^<\n]+)/);
        var actor = actorM ? actorM[1].replace(/<[^>]+>/g, '').trim() : '';
        var dirM = body.match(/导演[：:]\s*([^<\n]+)/);
        var director = dirM ? dirM[1].replace(/<[^>]+>/g, '').trim() : '';

        // 播放列表
        var playFroms = {};
        var playRe = /<a[^>]*href="(\/play\/\d+\/[^"]+\/\d+(?:\.html)?)"[^>]*>([^<]+)<\/a>/gi;
        var pm2;
        while ((pm2 = playRe.exec(body)) !== null) {
            var label = pm2[2].trim() || ('第' + playRe.lastIndex + '集');
            var playUrl = rule.host + pm2[1];
            if (!playFroms['默认']) playFroms['默认'] = [];
            playFroms['默认'].push(label + '$' + playUrl);
        }

        if (!playFroms['默认'] || playFroms['默认'].length === 0) {
            var playRe2 = /<a[^>]*href="(\/detail\/\d+\/[^"]+\/\d+\.html)"[^>]*>([^<]+)<\/a>/gi;
            while ((pm2 = playRe2.exec(body)) !== null) {
                var label2 = pm2[2].trim();
                var url2 = rule.host + pm2[1];
                if (!playFroms['默认']) playFroms['默认'] = [];
                playFroms['默认'].push(label2 + '$' + url2);
            }
        }

        if (!playFroms['默认'] || playFroms['默认'].length === 0) {
            var sources = body.match(/href="(\/play\/\d+\/[^"]+\.html)"/g) || [];
            var unique = {};
            sources.forEach(function(s) {
                var uM = s.match(/href="(\/play\/\d+\/[^"]+\.html)"/);
                if (uM && !unique[uM[1]]) unique[uM[1]] = 1;
            });
            var epList = [];
            var epIdx = 1;
            for (var key in unique) {
                epList.push('第' + epIdx + '集$' + rule.host + key);
                epIdx++;
            }
            if (epList.length > 0) {
                playFroms['默认'] = epList;
            } else {
                playFroms['默认'] = ['第1集$' + rule.host + '/play/1/' + id];
            }
        }

        var vod = {
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_year: year,
            vod_content: content,
            vod_actor: actor,
            vod_director: director,
            vod_play_from: '默认',
            vod_play_url: playFroms['默认'].join('#')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// SPIDER.md: searchContent(key, quick, pg)
function searchContent(key, quick, pg) {
    if (!pg) pg = '1';
    try {
        var kw = encodeURIComponent(String(key || '').trim());
        if (!kw) return JSON.stringify({ list: [], pagecount: 1 });
        var url = rule.host + '/search?q=' + kw;
        if (parseInt(pg) > 1) url += '&page=' + pg;
        var resp = http(url, { headers: rule.headers, async: false });
        var list = [];
        if (resp && resp.code === 200) {
            list = parseList(resp.content);
        }
        return JSON.stringify({ list: list, pagecount: 1 });
    } catch (e) {
        return JSON.stringify({ list: [], pagecount: 1 });
    }
}

// SPIDER.md: playerContent(flag, id, vipFlags)
function playerContent(flag, id, vipFlags) {
    try {
        return JSON.stringify({ url: id, parse: 0 });
    } catch (e) {
        return JSON.stringify({ url: '', parse: 0 });
    }
}

function proxy(params) { return []; }

// SPIDER.md 要求 export default
var spiderObj = {
    init: init,
    homeContent: homeContent,
    homeVideoContent: homeVideoContent,
    categoryContent: categoryContent,
    detailContent: detailContent,
    searchContent: searchContent,
    playerContent: playerContent,
    proxy: proxy
};

export default spiderObj;

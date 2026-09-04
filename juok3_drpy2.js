// 剧OK (juok3.top) — FongMi/TV 原生 spider v13
// 格式：FongMi native spider (spiderObj, http(), resp.content)
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
// 匹配多种格式：HTML (AppleCMS v10) 和 markdown
function parseList(body) {
    var list = [];
    var seen = {};
    if (!body) return list;

    // 格式1: AppleCMS v10 标准HTML模板
    // <a href="/detail/{id}/{uid}" title="NAME"><img src="pic" /><em>集数</em></a>
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

    // 格式2: markdown格式 (web_extract转换后 / drpy2 fetch)
    // [![alt](pic)\n集数\n\n**title**](https://juok3.top/detail/X/uid)
    if (list.length === 0) {
        var mdRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[\s\S]*?\]\((https?:\/\/[^)]+)\)/gi;
        while ((m = mdRe.exec(body)) !== null) {
            var name2 = m[1].trim();
            var pic2 = m[2];
            var url2 = m[3];
            var uidM = url2.match(/\/detail\/\d+\/([A-Za-z0-9]+)$/);
            if (!uidM) continue;
            var uid2 = uidM[1];
            if (!name2 || name2.length < 2) continue;
            if (!seen[uid2]) {
                seen[uid2] = 1;
                list.push({ vod_id: uid2, vod_name: name2, vod_pic: pic2, vod_remarks: '' });
            }
            if (list.length >= 30) break;
        }
    }

    // 格式3: 更宽松的markdown配对 (图片+detail链接分开)
    if (list.length === 0) {
        var imgs = body.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g) || [];
        var details = body.match(/\[([^\]]+)\]\((https?:\/\/[^)]+\/detail\/\d+\/[A-Za-z0-9]+)\)/g) || [];
        var cnt = Math.min(imgs.length, details.length, 30);
        for (var i = 0; i < cnt; i++) {
            var imgM = imgs[i].match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
            var detM = details[i].match(/\[([^\]]+)\]\((https?:\/\/[^)]+\/detail\/\d+\/([A-Za-z0-9]+))\)/);
            if (imgM && detM) {
                var name3 = imgM[1].trim() || detM[1].trim();
                var pic3 = imgM[2];
                var uid3 = detM[2];
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

function home(filter) {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false });
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
        var resp = http(rule.host, { headers: rule.headers, async: false });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var list = parseList(resp.content).slice(0, 10);
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

function category(tid, pg, filter, ext) {
    if (!pg || parseInt(pg) <= 0) pg = 1;
    try {
        // AppleCMS v10 分类页: /category/{type}/page/{page}.html
        // 也尝试 /search?q={name} 作为备选
        var clsMap = { 'movie': '电影', 'tv': '电视剧', 'variety': '综艺', 'anime': '动漫' };
        var clsName = clsMap[tid] || tid;
        var urlPath = '/category/' + tid;
        if (pg > 1) urlPath += '/page/' + pg + '.html';

        var resp = http(rule.host + urlPath, { headers: rule.headers, async: false });
        var list = [];
        if (resp && resp.code === 200 && resp.content) {
            list = parseList(resp.content);
        }

        // 备选：如果分类页为空，尝试搜索页
        if (list.length === 0) {
            var searchUrl = rule.host + '/search?q=' + encodeURIComponent(clsName);
            if (pg > 1) searchUrl += '&page=' + pg;
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
        return JSON.stringify({ list: [], error: String(e), page: 1, pagecount: 1, total: 0 });
    }
}

function detail(ids) {
    try {
        var id = ids || '';
        if (!id) return JSON.stringify({ list: [] });
        // id 是 uid (如 PbZtbH7nTG8uM3)，需要找到对应的 typeId
        // 尝试 movie=1, tv=2, variety=3, anime=4
        var types = ['1', '2', '3', '4'];
        var body = null;
        for (var ti = 0; ti < types.length; ti++) {
            var url = rule.host + '/detail/' + types[ti] + '/' + id;
            var resp = http(url, { headers: rule.headers, async: false });
            if (resp && resp.code === 200 && resp.content) {
                // 验证是否找到了正确的详情页（包含播放链接）
                if (/play|episodes|集|vod_play/.test(resp.content)) {
                    body = resp.content;
                    break;
                }
            }
        }
        if (!body) throw 'detail not found for ' + id;

        // 标题
        var nm = body.match(/<title>([^<]+)<\/title>/);
        var name = nm ? nm[1].trim().split('-')[0].split('|')[0].trim() : '';
        if (!name) {
            var h1M = body.match(/<h1[^>]*>([^<]+)<\/h1>/);
            name = h1M ? h1M[1].trim() : ('影片' + id);
        }
        // 剥离年份
        var year = '';
        var ym = name.match(/(\d{4})/);
        if (ym) year = ym[1];

        // 封面
        var pm = body.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
        var pic = pm ? pm[1] : '';
        if (!pic) {
            pm = body.match(/<meta[^>]*property="og:image"[^>]*content="(.*?)"/i);
            pic = pm ? pm[1] : '';
        }

        // 简介
        var content = '';
        var descM = body.match(/<meta[^>]*name="description"[^>]*content="(.*?)"/i);
        if (descM) content = descM[1].replace(/<[^>]+>/g, '');
        if (!content) {
            var introM = body.match(/<span[^>]*class=["']intro["'][^>]*>([\s\S]*?)<\/span>/i);
            if (introM) content = introM[1].replace(/<[^>]+>/g, '');
        }

        // 演员/导演
        var actorM = body.match(/主演[：:]\s*([^<\n]+)/);
        var actor = actorM ? actorM[1].replace(/<[^>]+>/g, '').trim() : '';
        var dirM = body.match(/导演[：:]\s*([^<\n]+)/);
        var director = dirM ? dirM[1].replace(/<[^>]+>/g, '').trim() : '';

        // 播放列表: 尝试从播放链接中提取
        // AppleCMS 短剧站播放链接格式: /play/{typeId}/{uid}/{ep}.html 或 /play/{typeId}/{uid}/1?s=xxx
        var playRe = /<a[^>]*href="\/play\/\d+\/[^"]+\/(\d+)(?:\.html)?"[^>]*>([^<]+)<\/a>/gi;
        var playFroms = {};
        var pm2;
        while ((pm2 = playRe.exec(body)) !== null) {
            var ep = pm2[1];
            var label = pm2[2].trim() || ('第' + ep + '集');
            var playUrl = rule.host + '/play/' + ep; // 简化，实际需要完整URL
            // 重新匹配完整URL
            var fullUrlM = body.match(new RegExp('<a[^>]*href="(/play/\\d+/' + id + '/' + ep + '[^"]*)"'));
            var playUrl2 = fullUrlM ? rule.host + fullUrlM[1] : '';
            if (!playUrl2) playUrl2 = rule.host + '/play/' + ep;
            if (!playFroms['默认']) playFroms['默认'] = [];
            playFroms['默认'].push(label + '$' + playUrl2);
        }

        // 如果上面没匹配到，尝试另一种格式: /detail/{typeId}/{uid}/1.html
        if (!playFroms['默认'] || playFroms['默认'].length === 0) {
            var playRe2 = /<a[^>]*href="(\/detail\/\d+\/[^"]+\/\d+\.html)"[^>]*>([^<]+)<\/a>/gi;
            while ((pm2 = playRe2.exec(body)) !== null) {
                var label2 = pm2[2].trim();
                var url2 = rule.host + pm2[1];
                if (!playFroms['默认']) playFroms['默认'] = [];
                playFroms['默认'].push(label2 + '$' + url2);
            }
        }

        // 兜底：直接返回播放链接
        if (!playFroms['默认'] || playFroms['默认'].length === 0) {
            // AppleCMS 短剧常用格式: /play/{typeId}/{uid}/1
            // 详情页可能有多个播放源
            var sources = body.match(/href="(\/play\/\d+\/[^"]+\.html)"/g) || [];
            var unique = {};
            sources.forEach(function(s) {
                var uM = s.match(/href="(\/play\/\d+\/[^"]+\.html)"/);
                if (uM && !unique[uM[1]]) {
                    unique[uM[1]] = 1;
                }
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
                // 最终兜底
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
        return JSON.stringify({ list: [], error: String(e) });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = 1;
    try {
        var kw = encodeURIComponent(String(key || '').trim());
        if (!kw) return JSON.stringify({ list: [], page: 1, pagecount: 1, total: 0 });
        var url = rule.host + '/search?q=' + kw;
        if (pg > 1) url += '&page=' + pg;
        var resp = http(url, { headers: rule.headers, async: false });
        var list = [];
        if (resp && resp.code === 200) {
            list = parseList(resp.content);
        }
        return JSON.stringify({
            list: list,
            page: parseInt(pg),
            pagecount: 1,
            total: list.length
        });
    } catch (e) {
        return JSON.stringify({ list: [], error: String(e), page: 1, pagecount: 1, total: 0 });
    }
}

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

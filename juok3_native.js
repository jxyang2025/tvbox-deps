// juok3 (剧OK) — FongMi 原生 Spider v6
// v5 修复：pairItems 空结果时不返回错误；emoji 导致显示异常
// v6：pairItems 空结果时返回错误条目；去除 emoji

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/',
    homeUrl: '/',
    searchUrl: '/vod/search/**fypage.html',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://juok3.top/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    },
    play_parse: 0,
    lazy: ''
};

function httpGet(url, isDetail) {
    var h = {};
    for (var k in rule.headers) h[k] = rule.headers[k];
    if (isDetail) h['Referer'] = rule.host + '/category/tv';
    try {
        var resp = http(url, { headers: h, async: false, timeout: rule.timeout });
        if (resp && resp.code === 403) {
            h['Referer'] = rule.host + '/';
            resp = http(url, { headers: h, async: false, timeout: rule.timeout });
        }
        if (resp && resp.code === 403) {
            delete h['Referer'];
            resp = http(url, { headers: h, async: false, timeout: rule.timeout });
        }
        return resp;
    } catch (e) { return null; }
}

function pairItems(body) {
    if (!body || body.length < 100) return [];
    var items = [];
    var detailRe = /https:\/\/juok3\.top\/detail\/(\d+)\/(\w+)/g;
    var urls = [];
    var m;
    while ((m = detailRe.exec(body)) !== null) {
        urls.push({ cid: m[1], sid: m[2] });
    }
    var imgRe = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    var imgs = [];
    while ((m = imgRe.exec(body)) !== null) imgs.push({ alt: m[1], src: m[2] });
    var boldRe = /\*\*([^*]+)\*\*/g;
    var titles = [];
    while ((m = boldRe.exec(body)) !== null) titles.push(m[1].trim());
    var remRe = /(全\d+集|更新至\d+集|\d{4}-\d{2}-\d{2}期)/g;
    var remarks = [];
    while ((m = remRe.exec(body)) !== null) remarks.push(m[1]);
    var maxLen = Math.max(urls.length, imgs.length, titles.length);
    for (var i = 0; i < maxLen; i++) {
        if (i >= urls.length || i >= titles.length) continue;
        var name = titles[i] || (imgs[i] ? imgs[i].alt : '');
        if (!name) continue;
        items.push({
            vod_id: urls[i].cid + '_' + urls[i].sid,
            vod_name: name,
            vod_pic: imgs[i] ? imgs[i].src : '',
            vod_remarks: remarks[i] || ''
        });
        if (items.length >= 40) break;
    }
    return items;
}

function filterByCid(items, cid) {
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
        var parts = items[i].vod_id.split('_');
        if (parts[0] === cid) filtered.push(items[i]);
    }
    return filtered;
}

function init(ext) { return ''; }

function home(filter) {
    try {
        var resp = httpGet(rule.host, false);
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var items = pairItems(resp.content).slice(0, 20);
        if (items.length === 0) throw '首页解析无数据';
        var cls = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '电视剧' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ];
        return JSON.stringify({ class: cls, list: items });
    } catch (e) {
        return JSON.stringify({ class: [], list: [{ vod_id: 'err_home', vod_name: '[剧OK] 首页失败: ' + e, vod_pic: '', vod_remarks: '请检查网络' }] });
    }
}

function homeVod() {
    try {
        var resp = httpGet(rule.host, false);
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var items = pairItems(resp.content).slice(0, 12);
        if (items.length === 0) throw '首页解析无数据';
        return JSON.stringify({ list: items });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_vod', vod_name: '[剧OK] 推荐失败: ' + e, vod_pic: '', vod_remarks: '请检查网络' }] });
    }
}

function category(tid, pg, filter, ext) {
    if (pg > 1) return JSON.stringify({ list: [], page: pg, pagecount: 1, total: 0 });
    try {
        var resp = httpGet(rule.host, false);
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var allItems = pairItems(resp.content);
        if (allItems.length === 0) throw '首页解析无数据';
        var filtered = filterByCid(allItems, tid);
        return JSON.stringify({ list: filtered, page: 1, pagecount: 1, total: filtered.length });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_cat', vod_name: '[剧OK] 分类' + tid + '失败: ' + e, vod_pic: '', vod_remarks: '请检查网络' }] });
    }
}

function detail(ids) {
    try {
        var id = typeof ids === 'string' ? ids : (ids[0] || '');
        if (!id) return JSON.stringify({ list: [] });
        var parts = id.split('_');
        var cid = parts[0], sid = parts[1];
        if (!sid) return JSON.stringify({ list: [] });
        var resp = httpGet(rule.host + '/detail/' + cid + '/' + sid, true);
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var body = resp.content;
        var nm = body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (!nm) nm = body.match(/^# (.+)$/m);
        var name = nm ? nm[1].trim().replace(/\s*-\s*[^-]+$/, '') : sid;
        var pm = body.match(/<img[^>]+src="(https?:\/\/[^"]+\.jpe?g[^"]+)"/i);
        if (!pm) pm = body.match(/<img[^>]+data-src="(https?:\/\/[^"]+)"\s*>/i);
        var pic = pm ? pm[1] : '';
        if (!pic) { pm = body.match(/!(?:[^\[]*)?\((https?:\/\/[^)]+\.jpe?g)/i); if (pm) pic = pm[1]; }
        var content = '';
        var cm = body.match(/<div[^>]*class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (!cm) cm = body.match(/<p[^>]*>([\s\S]*?)(?:\n|<|$)/i);
        if (cm) content = cm[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        var eps = [];
        var seenEp = {};
        var epRe = /\[([^\]]+)\]\((https?:\/\/juok3\.top\/play\/\d+\/\w+\/\d+[^)]*)\)/g;
        var em;
        while ((em = epRe.exec(body)) !== null) {
            var epText = em[1].trim();
            if (epText.indexOf('立即') !== -1) continue;
            if (seenEp[em[2]]) continue;
            seenEp[em[2]] = 1;
            eps.push(epText + '$' + em[2]);
        }
        if (eps.length === 0) {
            var rawRe = /\/play\/(\d+)\/(\w+)\/(\d+)/g;
            while ((em = rawRe.exec(body)) !== null) {
                if (seenEp[em[2] + '/' + em[3]]) continue;
                seenEp[em[2] + '/' + em[3]] = 1;
                eps.push('第' + em[3] + '集$' + rule.host + '/play/' + em[1] + '/' + em[2] + '/' + em[3] + '?s=qiyi');
            }
        }
        if (eps.length === 0) return JSON.stringify({ list: [{ vod_id: id, vod_name: '[剧OK] 未找到播放源', vod_pic: '', vod_content: name }] });
        return JSON.stringify({ list: [{
            vod_id: id, vod_name: name, vod_pic: pic, vod_content: content,
            vod_play_from: '剧OK', vod_play_url: eps.join('#')
        }] });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_det', vod_name: '[剧OK] 详情失败: ' + e, vod_pic: '', vod_remarks: id }] });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = '1';
    try {
        var kw = encodeURIComponent(key);
        var resp = httpGet(rule.host + '/vod/search/' + kw + '-' + pg + '.html', false);
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var items = pairItems(resp.content);
        return JSON.stringify({ list: items, page: parseInt(pg), pagecount: 999, total: items.length });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_search', vod_name: '[剧OK] 搜索失败: ' + e, vod_pic: '', vod_remarks: key }] });
    }
}

function play(flag, id, flags) {
    try {
        var resp = httpGet(id, true);
        if (!resp || resp.code !== 200) return JSON.stringify({ url: id, parse: 1 });
        var body = resp.content;
        var fm = body.match(/<iframe[^>]+src="([^"]+)"/);
        if (fm) return JSON.stringify({ url: fm[1], parse: 1 });
        var vm = body.match(/<video[^>]+src="([^"]+)"/);
        if (vm) return JSON.stringify({ url: vm[1], parse: 0 });
        var um = body.match(/var\s+url\s*=\s*["']([^"']+)["']/);
        if (um) return JSON.stringify({ url: um[1], parse: /m3u8/.test(um[1]) ? 0 : 1 });
        return JSON.stringify({ url: id, parse: 1 });
    } catch (e) {
        return JSON.stringify({ url: '', parse: 1 });
    }
}

function proxy(params) { return []; }
function sniffer() { return false; }
function isVideo(url) { return /m3u8|mp4|flv|avi|mkv|ts|webm/.test(url.toLowerCase()); }

var spiderObj = {
    rule: rule,
    home: home, homeVod: homeVod, category: category,
    detail: detail, search: search, play: play,
    proxy: proxy, sniffer: sniffer, isVideo: isVideo, init: init
};

export default spiderObj;
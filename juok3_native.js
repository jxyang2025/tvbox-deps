// juok3 (剧OK) — FongMi 原生 Spider v4
// 配对法解析首页 + 搜索，分类页 JS 渲染回退首页过滤

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/vod/indexindex.html',
    homeUrl: '/',
    searchUrl: '/vod/search/**fypage.html',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    play_parse: 0,
    lazy: ''
};

// 配对法：分别提取 detail_url、img、title、remark 后按顺序配对
function pairItems(body) {
    var items = [];
    // 1) detail URL
    var detailRe = /https:\/\/juok3\.top\/detail\/(\d+)\/(\w+)/g;
    var urls = [];
    var m;
    while ((m = detailRe.exec(body)) !== null) {
        urls.push({ cid: m[1], sid: m[2] });
    }
    // 2) img
    var imgRe = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    var imgs = [];
    while ((m = imgRe.exec(body)) !== null) {
        imgs.push({ alt: m[1], src: m[2] });
    }
    // 3) **title**
    var boldRe = /\*\*([^*]+)\*\*/g;
    var titles = [];
    while ((m = boldRe.exec(body)) !== null) {
        titles.push(m[1].trim());
    }
    // 4) remark
    var remRe = /(全\d+集|更新至\d+集|\d{4}-\d{2}-\d{2}期)/g;
    var remarks = [];
    while ((m = remRe.exec(body)) !== null) {
        remarks.push(m[1]);
    }
    // 配对
    var maxLen = Math.max(urls.length, imgs.length, titles.length);
    for (var i = 0; i < maxLen; i++) {
        if (i >= urls.length || i >= titles.length || !urls[i] || !titles[i]) continue;
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
        if (parts[0] === cid) {
            filtered.push(items[i]);
        }
    }
    return filtered;
}

function init(ext) { return ''; }

function home(filter) {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp ? resp.code : 'null');
        var items = pairItems(resp.content).slice(0, 20);
        var cls = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '电视剧' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ];
        return JSON.stringify({ class: cls, list: items });
    } catch (e) {
        return JSON.stringify({ class: [], list: [{ vod_id: 'err_home', vod_name: '❌ 首页加载失败: ' + e, vod_pic: '', vod_remarks: '检查网络或域名' }] });
    }
}

function homeVod() {
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp.code || 'null');
        var items = pairItems(resp.content).slice(0, 12);
        return JSON.stringify({ list: items });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_vod', vod_name: '❌ homeVod失败: ' + e, vod_pic: '', vod_remarks: '' }] });
    }
}

function category(tid, pg, filter, ext) {
    if (pg > 1) {
        return JSON.stringify({ list: [], page: pg, pagecount: 1, total: 0 });
    }
    try {
        var resp = http(rule.host, { headers: rule.headers, async: false, timeout: rule.timeout });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp.code || 'null');
        var allItems = pairItems(resp.content);
        var filtered = filterByCid(allItems, tid);
        return JSON.stringify({
            list: filtered,
            page: 1,
            pagecount: 1,
            total: filtered.length
        });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_cat', vod_name: '❌ 分类加载失败: ' + e, vod_pic: '', vod_remarks: tid }] });
    }
}

function detail(ids) {
    try {
        var id = typeof ids === 'string' ? ids : (ids[0] || '');
        if (!id) return JSON.stringify({ list: [] });
        var parts = id.split('_');
        var cid = parts[0], sid = parts[1];
        if (!sid) return JSON.stringify({ list: [] });
        var resp = http(rule.host + '/detail/' + cid + '/' + sid, {
            headers: rule.headers, async: false, timeout: rule.timeout
        });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp.code || 'null');
        var body = resp.content;
        // 标题
        var nm = body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (!nm) nm = body.match(/^# (.+)$/m);
        var name = nm ? nm[1].trim().replace(/\s*-\s*[^-]+$/, '') : sid;
        // 封面
        var pm = body.match(/<img[^>]+src="(https?:\/\/[^"]+\.jpe?g[^"]+)"/i);
        if (!pm) pm = body.match(/<img[^>]+data-src="(https?:\/\/[^"]+)"\s*>/i);
        var pic = pm ? pm[1] : '';
        if (!pic) { pm = body.match(/!(?:[^\[]*)?\((https?:\/\/[^)]+\.jpe?g)/i); if (pm) pic = pm[1]; }
        // 简介
        var content = '';
        var cm = body.match(/<div[^>]*class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (!cm) cm = body.match(/<p[^>]*>([\s\S]*?)(?:\n|<|$)/i);
        if (cm) {
            content = cm[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }
        // 选集
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
        if (eps.length === 0) {
            return JSON.stringify({ list: [{ vod_id: id, vod_name: '❌ 未找到播放源', vod_pic: '', vod_content: name }] });
        }
        return JSON.stringify({ list: [{
            vod_id: id, vod_name: name, vod_pic: pic, vod_content: content,
            vod_play_from: '剧OK', vod_play_url: eps.join('#')
        }] });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_det', vod_name: '❌ 详情加载失败: ' + e, vod_pic: '', vod_remarks: id }] });
    }
}

function search(key, quick, pg) {
    if (!pg) pg = '1';
    try {
        var kw = encodeURIComponent(key);
        var resp = http(rule.host + '/vod/search/' + kw + '-' + pg + '.html', {
            headers: rule.headers, async: false, timeout: rule.timeout
        });
        if (!resp || resp.code !== 200) throw 'HTTP ' + (resp.code || 'null');
        var items = pairItems(resp.content);
        return JSON.stringify({ list: items, page: parseInt(pg), pagecount: 999, total: items.length });
    } catch (e) {
        return JSON.stringify({ list: [{ vod_id: 'err_search', vod_name: '❌ 搜索失败: ' + e, vod_pic: '', vod_remarks: key }] });
    }
}

function play(flag, id, flags) {
    try {
        var resp = http(id, { headers: rule.headers, async: false, timeout: rule.timeout });
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
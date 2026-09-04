// 剧OK (juok3.top) - drpy2 规则
// AppleCMS v10 - HTML 解析（API 已 404）
var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    homeUrl: '/',
    url: '/vod/type/fyclass-fypage.html',
    searchUrl: '/vod/search/**-fypage.html',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    class_name: '电影&电视剧&动漫&综艺&短剧',
    class_url: '1&2&3&4&5',
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    timeout: 10000,
    limit: 20,
    play_parse: true,
    lazy: $js.toString(() => {
        // 本地播放直接返回
        input = input || VOD.vod_play_url;
        if (input && /^https?:\/\//.test(input)) {
            return JSON.stringify({
                parse: 0,
                url: input,
                header: rule.headers
            });
        }
        return JSON.stringify({ parse: 0, url: input || '' });
    }),
    // 列表页解析
    一级: $js.toString(() => {
        // 尝试请求页面
        let html = request(input, { headers: rule.headers });
        if (!html || html.length < 100) {
            // 试试备选URL模式
            let altUrl = input.replace('/vod/type/', '/vodtype/');
            html = request(altUrl, { headers: rule.headers });
        }
        if (!html || html.length < 100) {
            console.log('[juok3] 请求失败: ' + input);
            VODS = [{
                vod_name: '❌ juok3.top 请求失败 - 域名可能已过期或网站维护',
                vod_id: 'error',
                vod_pic: '',
                vod_remarks: '请检查 https://juok3.top 是否可访问'
            }];
            return;
        }

        let items = [];
        // 尝试多种选择器匹配AppleCMS HTML列表
        let patterns = [
            /<a[^>]*href="\/voddetail\/(\d+)\.html"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*">([^<]*)<\/span>[\s\S]*?<em[^>]*>([^<]*)<\/em>/gi,
            /<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]{0,500}?<\/a>/gi,
            /<a[^>]*href="\/detail\/(\d+)\/(\d+)\.html"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[\s\S]*?alt="([^"]*)"[\s\S]*?<\/a>/gi,
            /<a[^>]*href="\/[^"]*detail[^"]*"[\s\S]{0,200}?<img[^>]+src="([^"]*)"[^>]*>[\s\S]{0,200}?<([a-z]+)[^>]*>([^<]*)<\/([a-z]+)>/gi
        ];

        for (let pi = 0; pi < patterns.length; pi++) {
            let match;
            while ((match = patterns[pi].exec(html)) !== null) {
                let vodId, name, pic, remarks;
                if (pi === 0) {
                    vodId = match[1];
                    pic = match[2] || '';
                    name = match[3] || '';
                    remarks = match[4] || '';
                } else if (pi === 1) {
                    let href = match[1];
                    let idMatch = href.match(/(\d+)/);
                    vodId = idMatch ? idMatch[1] : href;
                    pic = match[2];
                    name = match[3];
                    remarks = '';
                } else if (pi === 2) {
                    vodId = match[1];
                    pic = match[3] || '';
                    name = match[4] || '';
                    remarks = '';
                } else {
                    vodId = 'unknown';
                    pic = match[1] || '';
                    name = match[3] || match[2] || '';
                    remarks = '';
                }
                if (name && name.trim().length > 0) {
                    items.push({
                        vod_id: vodId + '',
                        vod_name: name.trim(),
                        vod_pic: pic || '',
                        vod_remarks: (remarks || '').trim()
                    });
                }
                if (items.length >= rule.limit) break;
            }
            if (items.length > 0) break;
        }

        if (items.length === 0) {
            // 尝试JSON API
            let apiUrl = 'https://juok3.top/api.php/provide/vod/?ac=list&t=' + (VOD ? VOD.type_id || '1' : '1');
            try {
                let apiHtml = request(apiUrl, { headers: rule.headers });
                if (apiHtml) {
                    // Try to parse JSON
                    let json = JSON.parse(apiHtml);
                    if (json && json.list && json.list.length > 0) {
                        json.list.forEach(function(v) {
                            if (v.vod_id) {
                                items.push({
                                    vod_id: v.vod_id + '',
                                    vod_name: v.vod_name || '未知',
                                    vod_pic: v.vod_pic || '',
                                    vod_remarks: v.vod_remarks || '',
                                    vod_content: v.vod_content || ''
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                console.log('[juok3] API fallback failed: ' + e.message);
            }
        }

        if (items.length === 0) {
            VODS = [{
                vod_name: '❌ juok3.top 解析失败，无可用数据',
                vod_id: 'error',
                vod_pic: '',
                vod_remarks: '可能被Cloudflare拦截或域名已失效'
            }];
        } else {
            VODS = items;
        }
    }),
    // 详情页解析
    二级: $js.toString(() => {
        let id = VOD.vod_id + '';
        // 尝试多种URL模式获取详情
        let urls = [
            rule.host + '/voddetail/' + id + '.html',
            rule.host + '/detail/' + id + '.html',
            rule.host + '/vod/' + id + '.html',
            rule.host + '/play/' + id + '.html'
        ];

        let html = '';
        for (let ui = 0; ui < urls.length; ui++) {
            html = request(urls[ui], { headers: rule.headers });
            if (html && html.length > 200) break;
        }

        if (!html || html.length < 100) {
            console.log('[juok3] 详情请求失败: id=' + id);
            VOD.vod_play_from = '❌ 详情加载失败';
            VOD.vod_play_url = '请检查juok3.top是否可访问$';
            return;
        }

        // 提取播放线路和集数
        // AppleCMS v10 常见的播放列表格式
        let allPlayUrls = [];

        // 匹配播放列表，常见格式：<ul class="stui-content__playlist clearfix">
        let playlistBlocks = html.match(/<ul[^>]*class=["'][^"']*playlist[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi)
            || html.match(/<div[^>]*class=["'][^"']*playlist[^"']*["'][^>]*>[\s\S]*?<\/div>/gi)
            || html.match(/<ul[^>]*class=["'][^"']*content__playlist[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi)
            || [];

        let playGroups = [];

        // 查找线路名称
        let lineNames = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || [];

        if (playlistBlocks.length === 0) {
            // 直接找所有播放链接
            let allLinks = html.match(/<a[^>]+href=["']([^"']+\d+[^"']*)["'][^>]*>([^<]{1,30})<\/a>/gi) || [];
            let eps = [];
            for (let li = 0; li < allLinks.length; li++) {
                let hrefMatch = allLinks[li].match(/href=["']([^"']+)["']/i);
                let nameMatch = allLinks[li].match(/>([^<]+)</i);
                let href = hrefMatch ? hrefMatch[1].trim() : '';
                let name = nameMatch ? nameMatch[1].trim() : '';
                // 只保留含"集"、"第"、"集数"字样的链接
                if (/[集第\d]/.test(name) || /\d/.test(name)) {
                    eps.push(name + '$' + href);
                }
            }
            if (eps.length > 0) {
                playGroups.push({
                    from: '线路1',
                    urls: eps.join('#')
                });
            }
        } else {
            for (let bi = 0; bi < playlistBlocks.length; bi++) {
                let block = playlistBlocks[bi];
                let fromName = '线路' + (bi + 1);
                if (bi < lineNames.length && lineNames[bi]) {
                    let nMatch = lineNames[bi].match(/>([^<]+)</);
                    if (nMatch) fromName = nMatch[1].trim();
                }
                let links = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi) || [];
                let eps = [];
                for (let li = 0; li < links.length; li++) {
                    let hrefMatch = links[li].match(/href=["']([^"']+)["']/i);
                    let nameMatch = links[li].match(/>([^<]+)</i);
                    let href = hrefMatch ? hrefMatch[1].trim() : '';
                    let name = nameMatch ? nameMatch[1].trim() : '';
                    if (href && name) {
                        eps.push(name + '$' + href);
                    }
                }
                if (eps.length > 0) {
                    playGroups.push({
                        from: fromName,
                        urls: eps.join('#')
                    });
                }
            }
        }

        if (playGroups.length === 0) {
            // 尝试匹配任何带数字的链接
            VOD.vod_play_from = '❌ 未找到播放源';
            VOD.vod_play_url = '该视频可能已下架或域名失效$';
            return;
        }

        VOD.vod_play_from = playGroups.map(function(g) { return g.from; }).join('$$$');
        VOD.vod_play_url = playGroups.map(function(g) { return g.urls; }).join('$$$');
    }),
    // 搜索
    搜索: $js.toString(() => {
        let kw = input;
        if (!kw || kw === '**') {
            VODS = [];
            return;
        }
        let searchUrl = rule.host + '/vod/search/' + encodeURIComponent(kw) + '-1.html';
        let html = request(searchUrl, { headers: rule.headers });
        if (!html || html.length < 50) {
            // 尝试备选搜索URL
            let altUrl = rule.host + '/index.php/vod/search/wd/' + encodeURIComponent(kw) + '.html';
            html = request(altUrl, { headers: rule.headers });
        }
        if (!html || html.length < 50) {
            VODS = [{
                vod_name: '❌ 搜索请求失败',
                vod_id: 'error',
                vod_pic: '',
                vod_remarks: 'juok3.top 可能不可用'
            }];
            return;
        }

        // 复用列表页的解析逻辑
        let patterns = [
            /<a[^>]*href="\/voddetail\/(\d+)\.html"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*">([^<]*)<\/span>[\s\S]*?<em[^>]*>([^<]*)<\/em>/gi,
            /<a[^>]+href="(\/detail\/(\d+)\/(\d+)\.html)"[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[\s\S]*?alt="([^"]*)"[\s\S]*?<\/a>/gi,
            /<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,200}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]{0,200}?<\/a>/gi
        ];

        let items = [];
        for (let pi = 0; pi < patterns.length; pi++) {
            let match;
            while ((match = patterns[pi].exec(html)) !== null) {
                let vodId = match[1] || 'unknown';
                let name = match[match.length - 2] || match[match.length - 1] || '';
                let pic = match[match.length - 3] || match[match.length - 2] || '';
                let remarks = match[match.length - 1] || '';
                if (name && name.trim().length > 1) {
                    items.push({
                        vod_id: vodId + '',
                        vod_name: name.trim(),
                        vod_pic: pic || '',
                        vod_remarks: (remarks || '').trim()
                    });
                }
                if (items.length >= rule.limit) break;
            }
            if (items.length > 0) break;
        }

        if (items.length === 0) {
            VODS = [{
                vod_name: '❌ 搜索"' + kw + '"无结果',
                vod_id: 'error',
                vod_pic: '',
                vod_remarks: 'juok3.top 可能不可用或无此资源'
            }];
        } else {
            VODS = items;
        }
    })
};
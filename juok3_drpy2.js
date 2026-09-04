// drpy2 spider for juok3.top (剧OK) v3
// 修复：分类页JS渲染无数据 → 改用首页解析
// 改进：支持HTML和markdown两种链接格式

var rule = {
    title: '剧OK',
    host: 'https://juok3.top',
    url: '/',
    searchUrl: '/search?q=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    class_parse: function() {
        return [
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'anime', type_name: '动漫' }
        ];
    },
    double: false,
    timeout: 15000,
    play_parse: true,
    lazy: 'js:',

    // 一级：解析首页对应分类区块
    一级: function(tid, pg, c, f) {
        var html = fetch(this.host + '/', this.headers);
        var list = [];
        
        var sectionMap = {
            'tv': '电视剧热播',
            'movie': '电影热播',
            'variety': '综艺热播',
            'anime': '动漫热播'
        };
        var sectionName = sectionMap[tid] || '电视剧热播';
        
        // 提取对应区块内容
        var sectionRe = new RegExp('##\\s*' + sectionName + '[\\s\\S]*?(?=##|$)', 'i');
        var sectionM = html.match(sectionRe);
        if (!sectionM) {
            return JSON.stringify({ list: [], page: 1, pagecount: 1, limit: 12 });
        }
        var sectionHtml = sectionM[0];
        
        // 匹配视频项 - HTML格式: <a href="/detail/..."><img src="..." alt="..."></a>
        var htmlItemRe = /<a[^>]*href="(\/detail\/(\d+)\/([A-Za-z0-9]+))"[^>]*>[\s\S]*?<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g;
        var m;
        while ((m = htmlItemRe.exec(sectionHtml)) !== null) {
            var name = sectionHtml.substring(m.index, m.index + 200).match(/alt="([^"]+)"/);
            list.push({
                vod_id: m[2] + '/' + m[3],
                vod_name: name ? name[1].trim() : '',
                vod_pic: m[4],
                type_name: ['电影','电视剧','综艺','动漫'][parseInt(m[2])-1] || '其他'
            });
        }
        
        // 匹配视频项 - markdown格式: [![title](img)](detail_url)
        var mdItemRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[^\]]*\]\((https:\/\/juok3\.top\/detail\/(\d+)\/([A-Za-z0-9]+))\)/g;
        while ((m = mdItemRe.exec(sectionHtml)) !== null) {
            var name2 = m[1].trim();
            var pic2 = m[2];
            var typeId2 = m[4];
            var uid2 = m[5];
            if (name2 && name2.length > 1) {
                list.push({
                    vod_id: typeId2 + '/' + uid2,
                    vod_name: name2,
                    vod_pic: pic2,
                    type_name: ['电影','电视剧','综艺','动漫'][parseInt(typeId2)-1] || '其他'
                });
            }
        }
        
        // 也匹配 external 类型 - HTML格式
        var htmlExtRe = /<a[^>]*href="(\/detail\/(external\/\S+?))"[^>]*>[\s\S]*?<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g;
        while ((m = htmlExtRe.exec(sectionHtml)) !== null) {
            list.push({
                vod_id: m[2],
                vod_name: m[1].split('/').pop().trim(),
                vod_pic: m[3],
                type_name: '其他'
            });
        }
        
        // 也匹配 external 类型 - markdown格式
        var mdExtRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[^\]]*\]\((https:\/\/juok3\.top\/detail\/(external\/\S+?))\)/g;
        while ((m = mdExtRe.exec(sectionHtml)) !== null) {
            var name3 = m[1].trim();
            var pic3 = m[2];
            var extPath = m[4];
            if (name3 && name3.length > 1) {
                list.push({
                    vod_id: extPath,
                    vod_name: name3,
                    vod_pic: pic3,
                    type_name: '其他'
                });
            }
        }
        
        return JSON.stringify({ list: list, page: 1, pagecount: 1, limit: list.length });
    },

    // 二级：解析详情页
    二级: function(id) {
        var url = this.host + '/detail/' + id;
        var html = fetch(url, this.headers);
        var vod = {};
        
        // 标题
        var titleM = html.match(/<title>([^<]+)/);
        vod.vod_name = titleM ? titleM[1].replace(/[_\-].*$/, '').trim() : '';
        if (!vod.vod_name) {
            var h1M = html.match(/<h1[^>]*>([^<]+)/);
            vod.vod_name = h1M ? h1M[1].trim() : '';
        }
        
        // 图片
        var picM = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        if (!picM) picM = html.match(/<img[^>]*src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/);
        if (!picM) picM = html.match(/\[!\[.*?\]\((https?:\/\/[^)]+)\)/);
        vod.vod_pic = picM ? picM[1] : '';
        
        // 描述
        var descM = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
        vod.vod_content = descM ? descM[1] : '';
        if (!vod.vod_content) {
            var descM2 = html.match(/简介[\s\S]*?展开全部\s*([\s\S]*?)\s*手机/);
            if (descM2) vod.vod_content = descM2[1].trim();
        }
        
        // 年份
        var yearM = html.match(/(\d{4})[年\-]/);
        vod.vod_year = yearM ? yearM[1] : '';
        
        // 演员
        var actorM = html.match(/主演[：:]\s*([^<\n]+)/);
        vod.vod_actor = actorM ? actorM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';
        
        // 导演
        var dirM = html.match(/导演[：:]\s*([^<\n]+)/);
        vod.vod_director = dirM ? dirM[1].replace(/\[([^\]]+)\]/g, '$1').trim() : '';
        
        // 播放链接 - 多种格式
        var playFroms = {};
        var playUrls = {};
        
        // 格式1: markdown链接 [第N集](url) 或 [播放中第N集](url)
        var mdEpRe = /\[(?:播放中)?第(\d+)集?\]\((https:\/\/juok3\.top\/play\/[^)]+)\)/g;
        var epM;
        while ((epM = mdEpRe.exec(html)) !== null) {
            var epNum = parseInt(epM[1]);
            var epUrl = epM[2];
            var flag = '默认';
            var sM = epUrl.match(/s=([A-Za-z0-9]+)/);
            if (sM) flag = sM[1];
            if (!playFroms[flag]) playFroms[flag] = [];
            playFroms[flag].push({ num: epNum, url: epUrl, label: '第' + epNum + '集' });
        }
        
        // 格式2: HTML链接 <a href="/play/...">第N集</a>
        var htmlEpRe = /<a[^>]*href="(\/play\/[^"]+)"[^>]*>[^<]*第(\d+)集[^<]*<\/a>/g;
        while ((epM = htmlEpRe.exec(html)) !== null) {
            var epNum2 = parseInt(epM[2]);
            var epUrl2 = this.host + epM[1];
            var flag2 = '默认';
            var sM2 = epUrl2.match(/s=([A-Za-z0-9]+)/);
            if (sM2) flag2 = sM2[1];
            if (!playFroms[flag2]) playFroms[flag2] = [];
            playFroms[flag2].push({ num: epNum2, url: epUrl2, label: '第' + epNum2 + '集' });
        }
        
        // 格式3: external播放链接
        var extPlayRe = /href="(\/play\/(external\/\S+?\/\d+)\?ep=(\d+)&from=\d+)"/g;
        while ((epM = extPlayRe.exec(html)) !== null) {
            var epNum3 = parseInt(epM[3]) + 1;
            var epUrl3 = this.host + epM[1];
            if (!playFroms['external']) playFroms['external'] = [];
            playFroms['external'].push({ num: epNum3, url: epUrl3, label: '第' + epNum3 + '集' });
        }
        
        // 按集数排序并格式化
        if (Object.keys(playFroms).length > 0) {
            var playFromArr = Object.keys(playFroms);
            var playUrlArr = playFromArr.map(function(f) {
                playFroms[f].sort(function(a, b) { return a.num - b.num; });
                return playFroms[f].map(function(e) { return e.label + '$' + e.url; }).join('#');
            });
            vod.vod_play_from = playFromArr.join('$$$');
            vod.vod_play_url = playUrlArr.join('$$$');
        } else {
            // 没有播放链接，尝试构造
            vod.vod_play_from = '默认';
            vod.vod_play_url = '第1集$' + '/play/' + id + '/1?s=qiyi';
        }
        
        return JSON.stringify({ list: [vod], page: 1, pagecount: 1, limit: 60 });
    },

    // 搜索
    搜索: function(wd, quick, pg) {
        var url = this.host + '/search?q=' + encodeURIComponent(wd);
        var html = fetch(url, this.headers);
        var list = [];
        
        // 匹配搜索结果 - markdown格式
        var itemRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[^\]]*\]\((https:\/\/juok3\.top\/detail\/(\d+)\/([A-Za-z0-9]+))\)/g;
        var m;
        while ((m = itemRe.exec(html)) !== null) {
            var name = m[1].trim();
            var pic = m[2];
            var typeId = m[4];
            var uid = m[5];
            if (name && name.length > 1) {
                list.push({
                    vod_id: typeId + '/' + uid,
                    vod_name: name,
                    vod_pic: pic,
                    type_name: ['电影','电视剧','综艺','动漫'][parseInt(typeId)-1] || '其他'
                });
            }
        }
        
        // 也匹配 external 类型
        var extRe = /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)[^\]]*\]\((https:\/\/juok3\.top\/detail\/(external\/\S+?\/\d+))\)/g;
        while ((m = extRe.exec(html)) !== null) {
            var name2 = m[1].trim();
            var pic2 = m[2];
            var extPath = m[4];
            if (name2 && name2.length > 1) {
                list.push({
                    vod_id: extPath,
                    vod_name: name2,
                    vod_pic: pic2,
                    type_name: '其他'
                });
            }
        }
        
        // HTML格式
        var htmlRe = /<a[^>]*href="(\/detail\/\d+\/[A-Za-z0-9]+)"[^>]*>[\s\S]*?<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g;
        while ((m = htmlRe.exec(html)) !== null) {
            var idPart = m[1];
            var parts = idPart.split('/');
            var typeId2 = parts[1];
            var uid2 = parts[2];
            var name3 = html.substring(m.index, m.index + 300).match(/<[^>]+>([^<]+)/);
            list.push({
                vod_id: typeId2 + '/' + uid2,
                vod_name: name3 ? name3[1].trim() : '',
                vod_pic: m[2],
                type_name: ['电影','电视剧','综艺','动漫'][parseInt(typeId2)-1] || '其他'
            });
        }
        
        return JSON.stringify({ list: list });
    },

    // 播放
    lazy: function(url) {
        return 'parslet://' + url;
    }
};

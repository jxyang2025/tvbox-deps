var rule = {
    title: 'PPnix',
    host: 'https://www.ppnix.com',
    homeUrl: '/movie/-----.html',
    url: '/fyclass/-----.html',
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    searchUrl: '/search/**',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
    },
    timeout: 8000,
    limit: 20,
    play_parse: true,
    lazy: '',
    "一级": "js:var d=[];pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;var html=request(input);var items=pdfa(html,'.lists-content&&ul&&li');items.forEach(function(it){d.push({title:pdfh(it,'h2 a&&Text').trim(),img:pd(it,'img&&src'),desc:pdfh(it,'.rate&&Text').trim(),url:pdfh(it,'a&&href')})});setResult(d);",
    "二级": `js:
        var html=request(input);
        var $=cheerio.load(html);
        var title=$('h1.product-title').text().trim();
        var img=$('header.product-header img.thumb').attr('src')||'';
        var desc=$('meta[name="description"]').attr('content')||'';
        var epArr=[];
        var m=html.match(/classid=(\\d+);classurl='([^']+?)';infoid=(\\d+);sub='([^']*?)';m3u8=(\\[.*?\\])/);
        if(m){
            try{epArr=JSON.parse(m[5].replace(/'/g,'"'));}catch(e){}
        }
        var vod_play_url='';
        if(epArr.length>0){
            vod_play_url=epArr.map(function(ep){return 'https://www.ppnix.com/info/m3u8/'+m[3]+'/'+ep+'.m3u8'}).join('#');
        }
        VOD={
            vod_name:title,
            vod_pic:img,
            vod_content:desc,
            vod_play_from:'PPnix',
            vod_play_url:vod_play_url
        };
    `,
    "搜索": "js:var d=[];pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;var html=request(input);var items=pdfa(html,'.lists-content&&ul&&li');items.forEach(function(it){d.push({title:pdfh(it,'h2 a&&Text').trim(),img:pd(it,'img&&src'),desc:pdfh(it,'.rate&&Text').trim(),url:pdfh(it,'a&&href')})});setResult(d);"
};
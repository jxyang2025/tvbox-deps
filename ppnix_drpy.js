var rule = {
    "title": "PPnix",
    "host": "https://www.ppnix.com",
    "homeUrl": "/cn/movie/",
    "url": "/cn/fyclass/",
    "class_name": "电影&电视剧",
    "class_url": "movie&tv",
    "searchUrl": "/cn/?s=**",
    "searchable": 2,
    "quickSearch": 0,
    "filterable": 0,
    "changeable": 0,
    "timeout": 15000,
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    "一级": ".lists-content li;img&&alt;img&&src;.rate&&Text;a&&href",
    "二级": "js:var html=request(input);var m=html.match(/classid=(\\d+);classurl='([^']+?)';infoid=(\\d+);sub='([^']*?)';m3u8=(\\[.*?\\])/);if(m){var infoid=parseInt(m[3]);var qualities=eval(m[5]);var eps=qualities.map(function(q,i){return q+'$'+rule.host+'/info/m3u8/'+infoid+'/'+q+'.m3u8'});var pname=html.match(/<h1[^>]*class=\"product-title\"[^>]*>([^<]+)</);var vname=pname?pname[1].trim():'';var ppic=html.match(/<img[^>]*class=\"thumb\"[^>]*src=\"([^\"]+)\"/);var vpic=ppic?ppic[1]:'';var vod={vod_id:String(infoid),vod_name:vname,vod_pic:vpic,vod_play_from:'PPnix',vod_play_url:eps.join('#')};VOD=vod;}",
    "lazy": "js:var m3u8=request(input);var keyUrl='https://www.ppnix.com/info/m3u8/key';m3u8=m3u8.replace(/\\.\\.\\/key/g,keyUrl);var segs=m3u8.match(/https:\\/\\/ipfs\\.ppnix\\.com\\/ipfs\\/[a-zA-Z0-9]+/g)||[];for(var i=0;i<segs.length;i++){var seg=segs[i];if(!seg.endsWith('.ts')){m3u8=m3u8.split(seg).join(seg+'.ts');}}input={parse:1,url:m3u8};",
    "搜索": "*",
    "pagecount": {"movie":"1","tv":"1"},
    "playparse": 1,
    "parse_url": ""
}
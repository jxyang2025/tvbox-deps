var rule = {
    "name": "PPnix",
    "rule": "js",
    "type": 4,
    "flag": [
        "qq",
        "qh"
    ],
    "searchable": "*",
    "quickSearch": "0",
    "filterable": 0,
    "timeout": 30,
    "class_parse": "*;###;;https://www.ppnix.com/cn{class:name;type;arg}\n*;;https://www.ppnix.com/cn/movie/{cateId}.html",
    "cate_url": "https://www.ppnix.com/cn/movie/{cateId}_{catePg}.html",
    "一级": ".lists-content li;img&&alt;img&&src;.rate&&Text;a&&href",
    "二级": "js:var html=request(input);var m=html.match(/classid=(\\d+);classurl='([^']+?)';infoid=(\\d+);sub='([^']*?)';m3u8=(\\[.*?\\])/);if(m){var infoid=parseInt(m[3]);var qualities=eval(m[5]);var eps=qualities.map(function(q,i){return q+'$'+rule.host+'/info/m3u8/'+infoid+'/'+q+'.m3u8'});var pname=html.match(/<h1[^>]*class=\"product-title\"[^>]*>([^<]+</);var vname=pname?pname[1].trim():'';var ppic=html.match(/<img[^>]*src=\"([^\"]+)\"[^>]*class=\"thumb\"/);var vpic=ppic?ppic[1]:'';var vod={vod_id:String(infoid),vod_name:vname,vod_pic:vpic,vod_play_from:'PPnix',vod_play_url:eps.join('#')};VOD=vod;}",
    "lazy": "js:input={parse:0,url:input};",
    "playparse": 1,
    "parse_url": "",
    "play_json": []
};
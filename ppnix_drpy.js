var rule = {
"title": "PPnix",
"host": "https://www.ppnix.com",
"homeUrl": "/cn/movie/",
"url": "/cn/fyclass/",
"class_name": "电影&电视剧",
"class_url": "movie&tv",
"searchable": 2,
"搜索": "*",
"playparse": 0,
"parse_url": "",
"class_parse": false,
"fl": true,
"filterable": 0,
"cate_exclude": "",
"header": {
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
"Referer": "https://www.ppnix.com/"
},
"latcharset": "utf-8",
"tab_rename": {
"电影": "电影",
"电视剧": "电视剧"
},
"limit": 20,
"timeout": 10,
"多级": "1",
"play_json": [],
"cate_excludes": [
"今日更新"
],
"多级分类": "1",
"二级": "js:var html=request(input);var m=html.match(/classid=(\\d+);classurl='([^']+?)';infoid=(\\d+);sub='([^']+?)';m3u8=(\\[.*?\\])/);var cid=m?m[1]:'';var cpage=(m&&m[2])||input;var pn='';var ppic='';var pd='';var StUrl3='m3u8=[\\''+m[1]+'\\']';m=html.match(eval(StUrl3));var qname=m?m[0].match(/m3u8=\\['([^']+)'/)[1]:'';var m3u8Url='https://www.ppnix.com/info/m3u8/'+cid+'/'+qname+'.m3u8';var vod={vod_id:cid,vod_name:'',vod_pic:'',vod_year:'',vod_content:'',vod_play_from:'PPnix',vod_play_url:''};vod.vod_pic=ppic||vod.vod_pic;vod.vod_year=pn||vod.vod_year;vod.vod_content=pd||vod.vod_content;vod.vod_play_url=vod.vod_play_url+pn+'$'+m3u8Url;result=JSON.stringify(vod);",
"lazy": "js:var m3u8=request(input);var keyUrl='https://www.ppnix.com/info/m3u8/key';m3u8=m3u8.replace(/\\.\\.\\/key/g,keyUrl);m3u8=m3u8.replace(/https:\\/\\/ipfs\\.ppnix\\.com\\/ipfs\\//g,'https://walkah.cloud/ipfs/');input={parse:1,url:m3u8};"
};
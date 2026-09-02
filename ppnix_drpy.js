var rule = {
    title: 'PPnix',
    host: 'https://www.ppnix.com',
    homeUrl: '/cn/movie/-----.html',
    url: '/cn/fyclass/-----.html',
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    searchUrl: '/cn/search/**',
    detailUrl: '/cn/fyclass/fid.html',
    搜索: 'js:var d=[];var items=pdfa(html,".lists-content li");items.forEach(function(it){var title=pdfh(it,"h2 a&&Text");var href=pd(it,"a&&href");var img=pd(it,"img&&src");var rate=pdfh(it,".rate&&Text");if(title&&href){d.push({url:href,title:title,img:img,desc:rate})}});setResult(d);',
    lazy: 'js:var m3u8=request(input);var keyUrl="https://www.ppnix.com/info/m3u8/key";m3u8=m3u8.replace(/URI="\\.\\.\\/key"/g,"URI=\\""+keyUrl+"\\"");VOD={parse:m3u8,url:input};',
    一级: 'js:var d=[];var items=pdfa(html,".lists-content li");items.forEach(function(it){var title=pdfh(it,"h2 a&&Text");var href=pd(it,"a&&href");var img=pd(it,"img&&src");var rate=pdfh(it,".rate&&Text");if(title&&href){d.push({url:href,title:title,img:img,desc:rate})}});setResult(d);',
    二级: 'js:var html=request(input);var m=html.match(/classid=(\\d+);classurl=\'([^\']+?)\';infoid=(\\d+);sub=\'([^\']*?)\';m3u8=(\\[.*?\\])/);if(!m){print("no match");return;}var infoid=parseInt(m[3]);var qualities=eval(m[5]);var eps=qualities.map(function(q,i){return q+"$"+rule.host+"/info/m3u8/"+infoid+"/"+q+".m3u8"});var vod={vod_id:String(infoid),vod_name:"",vod_pic:"",vod_play_from:"PPnix",vod_play_url:eps.join("#")};VOD=vod;',
}
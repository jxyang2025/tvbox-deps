var rule = {
    title: 'PPnix影视',
    host: 'https://www.ppnix.com',
    url: '/fyclass/fyfilter.html',
    searchUrl: ';post=keyboard=$kw',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    filter_url: '{{fl.type}}-{{fl.country}}-{{fl.year}}-{{fl.by}}',
    filter: {
       movie: [
            {key: "type", name: "类型", value: [
                {n: "全部", v: ""},
                {n: "Drama", v: "Drama"},
                {n: "Thriller", v: "Thriller"},
                {n: "Comedy", v: "Comedy"},
                {n: "Action", v: "Action"},
                {n: "Romance", v: "Romance"},
                {n: "Crime", v: "Crime"},
                {n: "Adventure", v: "Adventure"},
                {n: "Horror", v: "Horror"},
                {n: "Mystery", v: "Mystery"},
                {n: "Fantasy", v: "Fantasy"},
                {n: "Sci-Fi", v: "Sci Fi"},
                {n: "Family", v: "Family"},
                {n: "Animation", v: "Animation"},
                {n: "Biography", v: "Biography"},
                {n: "History", v: "History"},
                {n: "War", v: "War"},
                {n: "Music", v: "Music"},
                {n: "Sport", v: "Sport"},
                {n: "Musical", v: "Musical"},
                {n: "Documentary", v: "Documentary"},
                {n: "Western", v: "Western"},
                {n: "Short", v: "Short"},
                {n: "Film-Noir", v: "Film Noir"},
                {n: "Talk-Show", v: "Talk Show"},
                {n: "News", v: "News"}
            ]},
            {key: "country", name: "国家", value: [
                {n: "全部", v: ""},
                {n: "美国", v: "United States"},
                {n: "中国大陆", v: "China"},
                {n: "中国香港", v: "Hong Kong"},
                {n: "中国台湾", v: "Taiwan"},
                {n: "英国", v: "United Kingdom"},
                {n: "日本", v: "Japan"},
                {n: "法国", v: "France"},
                {n: "韩国", v: "South Korea"},
                {n: "德国", v: "Germany"},
                {n: "加拿大", v: "Canada"},
                {n: "意大利", v: "Italy"},
                {n: "澳大利亚", v: "Australia"},
                {n: "西班牙", v: "Spain"},
                {n: "印度", v: "India"},
                {n: "泰国", v: "Thailand"},
                {n: "俄罗斯", v: "Russia"},
                {n: "新加坡", v: "Singapore"},
                {n: "丹麦", v: "Denmark"},
                {n: "爱尔兰", v: "Ireland"},
                {n: "墨西哥", v: "Mexico"},
                {n: "其他", v: "Netherlands"}
            ]},
            {key: "year", name: "年代", value: [
                {n: "全部", v: ""},
                {n: "2026", v: "2026"},
                {n: "2025", v: "2025"},
                {n: "2024", v: "2024"},
                {n: "2023", v: "2023"},
                {n: "2022", v: "2022"},
                {n: "2021", v: "2021"},
                {n: "2020", v: "2020"},
                {n: "2019", v: "2019"},
                {n: "2018", v: "2018"},
                {n: "2017", v: "2017"},
                {n: "2016", v: "2016"},
                {n: "2015", v: "2015"},
                {n: "2014", v: "2014"},
                {n: "2013", v: "2013"},
                {n: "2012", v: "2012"},
                {n: "2011", v: "2011"},
                {n: "2010", v: "2010"},
                {n: "2009", v: "2009"},
                {n: "2008", v: "2008"},
                {n: "2007", v: "2007"},
                {n: "2006", v: "2006"},
                {n: "2005", v: "2005"},
                {n: "2004", v: "2004"},
                {n: "2003", v: "2003"},
                {n: "2002", v: "2002"},
                {n: "2001", v: "2001"},
                {n: "2000", v: "2000"}
            ]},
            {key: "by", name: "排序", value: [
                {n: "时间", v: "newstime"},
                {n: "人气", v: "onclick"},
                {n: "评分", v: "rating"}
            ]}
        ],
        tv: [
            {key: "type", name: "类型", value: [
                {n: "全部", v: ""},
                {n: "Drama", v: "Drama"},
                {n: "Thriller", v: "Thriller"},
                {n: "Comedy", v: "Comedy"},
                {n: "Action", v: "Action"},
                {n: "Romance", v: "Romance"},
                {n: "Crime", v: "Crime"},
                {n: "Adventure", v: "Adventure"},
                {n: "Horror", v: "Horror"},
                {n: "Mystery", v: "Mystery"},
                {n: "Fantasy", v: "Fantasy"},
                {n: "Sci-Fi", v: "Sci Fi"},
                {n: "Family", v: "Family"},
                {n: "Animation", v: "Animation"},
                {n: "Biography", v: "Biography"},
                {n: "History", v: "History"},
                {n: "War", v: "War"},
                {n: "Music", v: "Music"},
                {n: "Sport", v: "Sport"},
                {n: "Musical", v: "Musical"},
                {n: "Documentary", v: "Documentary"},
                {n: "Western", v: "Western"},
                {n: "Short", v: "Short"},
                {n: "Film-Noir", v: "Film Noir"},
                {n: "Reality-TV", v: "Reality TV"},
                {n: "Talk-Show", v: "Talk Show"},
                {n: "News", v: "News"}
            ]},
            {key: "country", name: "国家", value: [
                {n: "全部", v: ""},
                {n: "美国", v: "United States"},
                {n: "中国大陆", v: "China"},
                {n: "中国香港", v: "Hong Kong"},
                {n: "中国台湾", v: "Taiwan"},
                {n: "英国", v: "United Kingdom"},
                {n: "日本", v: "Japan"},
                {n: "法国", v: "France"},
                {n: "韩国", v: "South Korea"},
                {n: "德国", v: "Germany"},
                {n: "加拿大", v: "Canada"},
                {n: "意大利", v: "Italy"},
                {n: "澳大利亚", v: "Australia"},
                {n: "西班牙", v: "Spain"},
                {n: "印度", v: "India"},
                {n: "泰国", v: "Thailand"},
                {n: "俄罗斯", v: "Russia"},
                {n: "新加坡", v: "Singapore"},
                {n: "丹麦", v: "Denmark"},
                {n: "爱尔兰", v: "Ireland"},
                {n: "墨西哥", v: "Mexico"},
                {n: "其他", v: "Netherlands"}
            ]},
            {key: "year", name: "年代", value: [
                {n: "全部", v: ""},
                {n: "2026", v: "2026"},
                {n: "2025", v: "2025"},
                {n: "2024", v: "2024"},
                {n: "2023", v: "2023"},
                {n: "2022", v: "2022"},
                {n: "2021", v: "2021"},
                {n: "2020", v: "2020"},
                {n: "2019", v: "2019"},
                {n: "2018", v: "2018"},
                {n: "2017", v: "2017"},
                {n: "2016", v: "2016"},
                {n: "2015", v: "2015"},
                {n: "2014", v: "2014"},
                {n: "2013", v: "2013"},
                {n: "2012", v: "2012"},
                {n: "2011", v: "2011"},
                {n: "2010", v: "2010"},
                {n: "2009", v: "2009"},
                {n: "2008", v: "2008"},
                {n: "2007", v: "2007"},
                {n: "2006", v: "2006"},
                {n: "2005", v: "2005"},
                {n: "2004", v: "2004"},
                {n: "2003", v: "2003"},
                {n: "2002", v: "2002"},
                {n: "2001", v: "2001"},
                {n: "2000", v: "2000"}
            ]},
            {key: "by", name: "排序", value: [
                {n: "时间", v: "newstime"},
                {n: "人气", v: "onclick"},
                {n: "评分", v: "rating"}
            ]}
        ]
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.ppnix.com/'
    },
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    play_parse: true,
    lazy: $js => {
        let html = request(input);
        let infoid = html.match(/infoid=(\d+)/)?.[1];
        let m3u8 = html.match(/m3u8=\[(.*?)\]/)?.[1];
        if (infoid && m3u8) {
            let episodes = m3u8.replace(/'/g, '').split(',');
            let playUrl = '';
            if (episodes.length === 1) {
                playUrl = 'https://www.ppnix.com/info/m3u8/' + infoid + '/' + episodes[0] + '.m3u8';
            } else {
                let episode = input.split('/').pop().replace('.m3u8', '');
                playUrl = 'https://www.ppnix.com/info/m3u8/' + infoid + '/' + episode + '.m3u8';
            }
            return {parse: 0, url: playUrl, header: rule.headers};
        }
        return {parse: 1, url: input};
    },
    一级: '.lists-content li;h2 a&&Text;img.thumb&&src;a&&href;footer span.rate&&Text',
    二级: {
        title: 'h1.product-title&&Text',
        img: 'img.thumb&&src',
        desc: '.product-excerpt:eq(0)&&Text;.product-excerpt:eq(1)&&Text;.product-excerpt:eq(2)&&Text;.product-excerpt:eq(3)&&Text;.product-excerpt:eq(4)&&Text',
        content: '.product-excerpt:eq(5)&&Text',
        tabs: 'js:TABS = ["播放列表"]',
        lists: $js => {
            let html = request(input);
            let infoid = html.match(/infoid=(\d+)/)?.[1];
            let m3u8 = html.match(/m3u8=\[(.*?)\]/)?.[1];
            let list = [];
            if (infoid && m3u8) {
                let episodes = m3u8.replace(/'/g, '').split(',');
                if (episodes.length === 1) {
                    list.push(episodes[0] + '$' + 'https://www.ppnix.com/info/m3u8/' + infoid + '/' + episodes[0] + '.m3u8');
                } else {
                    episodes.forEach((ep, index) => {
                        list.push('第' + (index + 1) + '集' + '$' + 'https://www.ppnix.com/info/m3u8/' + infoid + '/' + ep + '.m3u8');
                    });
                }
            }
            LISTS = [list];
        }
    },
    搜索: '.lists-content li;h2 a&&Text;img.thumb&&src;a&&href;footer span.rate&&Text'
}

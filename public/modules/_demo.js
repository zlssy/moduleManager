define('_demo', ['jquery', 'util', 'multiSearch', 'pager', '_header'], function ($, util, multiSearch, pager) {
    var wrap = $('#wrap-container');
    var condition_container = $('.cur-condition');
    var template = $('#removeItemTpl').html();
    var m = new multiSearch({
        path: '/demo'
    });
    var pageMatch = location.href.match(/pg(\d+)/);
    var p = new pager({
        total: 400,
        pageno: pageMatch && pageMatch[1] || 1, // util.url.getUrlParam('page') || 1,
        view: 2,
        group: 4,
        pageRule: function (instance) {
            return function (page) {
                var url = location.href;
                if (/pg(\d+)/.test(url)) {
                    return url.replace(/pg(\d+)/, 'pg' + page);
                }
                if (m.conditions.level3 !== '') {
                    return url.replace(m.conditions.level3, m.conditions.level3 + 'pg' + page);
                }
                else {
                    return url.replace(/($|\?)/, '/pg' + page + '$1');
                }
            }
        }
    });

    m.init();
    
    var keys = m.getKeyWords();
    
    if(keys.length){
        condition_container.append(util.formatJson(template, {
            list: keys
        }));        
    }

    $('#list').after(p.get());
});
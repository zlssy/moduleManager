define('demo', ['jquery', 'util', 'multiSearch', 'pager'], function ($, util, multiSearch, pager) {
    var wrap = $('#wrap-container');
    var condition_container = $('.cur-condition');
    var template = $('#removeItemTpl').html();
    var m = new multiSearch({
        path: '/demo'
    });
    var p = new pager({
        total: 400,
        pageno: util.url.getUrlParam('page') || 1
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
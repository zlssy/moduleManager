define('demo', ['jquery', 'util', 'multiSearch'], function ($, util, multiSearch) {
    var wrap = $('#wrap-container');
    var condition_container = $('.cur-condition');
    var template = $('#removeItemTpl').html();
    var m = new multiSearch({
        path: '/demo'
    });

    m.init();
    
    var keys = m.getKeyWords();
    
    if(keys.length){
        condition_container.append(util.formatJson(template, {
            list: keys
        }));        
    }
});
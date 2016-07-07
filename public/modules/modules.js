define('modules', ['jquery', 'util', 'dialog'], function ($, util, dialog) {
    var main = $('#main-container'),
        pid = util.url.getUrlParam('pid'),
        listApi = '/api/module/list/',
        saveApi = '/api/module/save';

    $.ajax({
        url: listApi + pid,
        method: 'get',
        success: function (json) {
            if (0 === json.code) {
                if (json.data && json.data.length) {

                }
                else {
                    main.html('<div class="empty">当前项目没有任何模块</div>');
                }
            }
            else {
                info('拉取数据失败.');
            }
        },
        error: function (json) {
            info(json.toString());
        }
    });

    $('#create').on('click', function () {
        location.href = '/module/add' + location.search;
    });

    function info(msg, timer) {
        var d = dialog({
            content: msg
        }), t = timer || 1000;
        d.show();
        setTimeout(function () {
            d.close();
        }, t);
    }
});
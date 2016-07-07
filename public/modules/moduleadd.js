define('moduleadd', ['jquery', 'util', 'dialog'], function ($, util, dialog) {
    var pid = util.url.getUrlParam('pid'),
        id = util.url.getUrlParam('id'),
        projectApi = '/api/project/view/' + pid,
        getApi = '/api/module/view/',
        saveApi = '/api/module/save';

    /**
     * 获取项目信息并设置标题
     */
    $.ajax({
        url: projectApi,
        method: 'get',
        success: function (json) {
            if(0 === json.code){
                if(json.data) {
                    $('h1#project-name').html(json.data.name + '项目');
                }
                else{
                    info('项目数据拉去出错.');
                }
            }
            else{
                info(json.msg);
            }
        },
        error: function (json) {
            info(json.msg);
        }
    });

    if(id){
        var d = dialog();
        d.showModal();
        $.ajax({
            url: getApi+id,
            method: 'get',
            success: function (json) {
                if(0 === json.code){
                    // 获取模块信息成功

                }
                else{
                    info('获取项目信息失败');
                    util.log('获取项目信息失败');
                }
                d.close();
            },
            error: function (json) {
                util.log(json.msg);
                d.close();
            }
        });
    }

    $('#btn-save').on('click', function () {
        
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
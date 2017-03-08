define('_project', ['jquery', 'util', 'dialog', 'moment', '_header'], function ($, util, dialog, moment) {
    var createTpl = $('#createProjectTpl').html(),
        itemTpl = $('#projectItemTpl').html(),
        createButtonTpl = $('#createTpl').html(),
        api = '/api/project/add',
        listApi = '/api/project/list';

    $('.project-list').on('click', '.create', function () {
        var d = dialog({
            title: '创建项目',
            content: createTpl,
            width: 500
        });
        d.show();
        var errorInfo = $('.errorinfo');
        $('.create-panel .save').on('click', function () {
            errorInfo.length && errorInfo.html('');
            if('' === projectName.val().trim()){
                errorInfo.html('请填写项目名称。');
                return;
            }
            var projectName = $('.create-panel input[name="project-name"]'),
                userGroup = $('.create-panel input[name="user-group"]');
            $.ajax({
                url: api,
                method: 'post',
                data: {projectName: projectName.val(), userGroup: userGroup.val()},
                success: function (json) {
                    if(0 === json.code){
                        loadProject();
                    }
                    else if(1 === json.code){
                        util.log(json.msg);
                        info('创建失败');
                    }
                    $('.create-panel').off();
                    d.close().reomve();
                },
                error: function (json) {
                    console.log(json);
                    info('创建失败.');
                }
            })
        });
    });
    
    $('.project-list').on('click', 'li[data-id]', function () {
        var id = $(this).data('id');
        if(id) {
            location.href = '/module?pid=' + id;
        }
    });

    function loadProject() {
        var p = $('.project-list');
        $.ajax({
            url: listApi,
            method: 'get',
            data:{},
            success: function (json) {
                if(0 === json.code){
                    p.html(util.formatJson(itemTpl, {
                        list: json.data,
                        moment: moment
                    }));
                }
                p.append(createButtonTpl);
            },
            error: function (json) {
                util.log(json.msg);
                info('读取项目信息失败.');
                p.append(createButtonTpl)
            }
        });
    }

    function info(msg, timer) {
        var d = dialog({
            content: msg
        }), t = timer || 1000;
        d.show();
        setTimeout(function () {
            d.close();
        }, t);
    }

    loadProject();
});
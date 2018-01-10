define('_project', ['jquery', 'util', 'dialog', 'moment', '_header'], function ($, util, dialog, moment) {
    var createTpl = $('#createProjectTpl').html(),
        copyTpl = $('#copyProjectTpl').html(),
        itemTpl = $('#projectItemTpl').html(),
        createButtonTpl = $('#createTpl').html(),
        api = '/api/project/add',
        listApi = '/api/project/list',
        copyApi = '/api/project/copy',
        projectMap = {},
        currentCopyProjectId, currentCopyProjectName, copyDialog, processDialog,
        copyLock = false;

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
            var projectName = $('.create-panel input[name="project-name"]'),
                userGroup = $('.create-panel input[name="user-group"]');
            if ('' === projectName.val().trim()) {
                errorInfo.html('请填写项目名称。');
                return;
            }
            $.ajax({
                url: api,
                method: 'post',
                data: {projectName: projectName.val(), userGroup: userGroup.val()},
                success: function (json) {
                    if (0 === json.code) {
                        loadProject();
                    }
                    else if (1 === json.code) {
                        util.log(json.msg);
                        info('创建失败');
                    }
                    $('.create-panel').off();
                    d && d.close().reomve();
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
        if (id) {
            location.href = '/module?pid=' + id;
        }
    }).on('click', '.svg-btn-copy', function (e) {
        var $this = $(this),
            id = $this.parent('li[data-id]').data('id');
        currentCopyProjectName = $this.siblings('h1').html();
        copyProject(id);
        e.stopPropagation && e.stopPropagation();
    });

    $('body').on('click', '.copy_panel input[name=useMore]', function () {
        var $c = $('#moreNameLabel'),
            $this = $(this),
            $v = $this.val();
        if ($v && $c) {
            $c.html(['前缀', '后缀'][$v - 1] + '名：');
        }
    });
    $('body').on('click', '.copy_panel .save', function (e) {
        if (!copyLock) {
            var $this = $(this),
                toProject = $('select[id="toProject"]').val(),
                toProjectName = $('select[id="toProject"] option:selected').text(),
                useMore = $('input[name="useMore"]:checked').val(),
                moreName = $('input[name="moreName"]').val(),
                method = $('input[name="method"]:checked').val();

            if (/^\s*$/.test(moreName)) {
                info('必须填写' + ['前缀', '后缀'][useMore - 1]);
            }
            else {
                dialog({
                    content: '您确实要将项目<strong style="color:blue;">【' + currentCopyProjectName + '】</strong>复制到<strong style="color:red;">【' + toProjectName + '】</strong>吗？',
                    okValue: '确定',
                    cancelValue: '放弃',
                    ok: function () {
                        var data = {};
                        if (toProject && moreName) {
                            copyDialog && copyDialog.close().remove();
                            processDialog = dialog({
                                content: '正在拼命复制，请稍后...'
                            });
                            processDialog.showModal();
                            data.fromProject = currentCopyProjectId;
                            data.toProject = toProject;
                            data.useMore = useMore;
                            data.moreName = moreName;
                            data.method = method;
                            $.ajax({
                                url: copyApi,
                                method: 'post',
                                data: data,
                                success: function (json) {
                                    if (json && json.code == 0) {
                                        processDialog && processDialog.close().remove();
                                        info('恭喜， 项目已成功复制！');
                                    }
                                    else {
                                        processDialog && processDialog.close().remove();
                                        info('复制项目出错了！');
                                    }
                                },
                                error: function (err) {
                                    processDialog && processDialog.close().remove();
                                    info('复制项目失败！');
                                }
                            });
                        }
                    },
                    cancel: function () {
                        copyDialog && copyDialog.close().remove();
                    }
                }).show();
            }
        }
    });

    function loadProject() {
        var p = $('.project-list');
        $.ajax({
            url: listApi,
            method: 'get',
            data: {},
            success: function (json) {
                if (0 === json.code) {
                    p.html(util.formatJson(itemTpl, {
                        list: json.data,
                        moment: moment
                    }));
                    createProjectMap(json.data);
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

    /**
     * 创建项目映射
     * @param data
     */
    function createProjectMap(data) {
        projectMap = {};
        data.map(function (v) {
            if (v && v._id && v.name) {
                projectMap[v._id] = v.name;
            }
        });
    }

    /**
     * 获取可复制到的项目目标
     * @param id
     */
    function getCopyProjectOption(id) {
        var r = [];
        for (var k in projectMap) {
            if (k != id) {
                r.push('<option value="' + k + '">' + projectMap[k] + '</option>');
            }
        }
        return r.join('');
    }

    /**
     * 复制项目
     * @param id
     */
    function copyProject(id) {
        currentCopyProjectId = id;
        copyDialog = dialog({
            title: '复制项目',
            content: copyTpl,
            width: 500
        });
        copyDialog.show();
        $('#toProject').html(getCopyProjectOption(id));
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

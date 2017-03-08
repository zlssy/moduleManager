define('_moduleadd', ['jquery', 'util', 'dialog', 'ace/ace', 'moment', '_header'], function ($, util, dialog, ace, moment) {
    var pid = util.url.getUrlParam('pid'),
        mid = util.url.getUrlParam('mid'),
        projectApi = globalConfig.apiRoot + 'api/project/view/' + pid, // 项目接口
        getApi = globalConfig.apiRoot + 'api/module/view/', // 模块获取接口
        saveApi = globalConfig.apiRoot + 'api/module/save', // 模块保存接口
        checkApi = globalConfig.apiRoot + 'api/module/check/', // 模块标识符校验接口
        loadApi = globalConfig.apiRoot + 'api/module/load', // 载入模块源文件接口
        dependenciesApi = globalConfig.apiRoot + 'api/module/dependencies/', // 依赖分析接口
        validate = 1, // 是否校验通过
        d_id = $('input[name=id]'),
        d_name = $('input[name=name]'),
        d_path = $('input[name=path]'),
        d_author = $('input[name=author]'),
        d_tags = $('input[name=tags]');

    var d_code = ace.edit('code'),
        d_demo = ace.edit('demo'),
        saveLock = false;

    d_code.setTheme("ace/theme/monokai");
    d_code.getSession().setMode("ace/mode/javascript");
    d_demo.setTheme("ace/theme/monokai");
    d_demo.getSession().setMode("ace/mode/javascript");

    /**
     * 获取项目信息并设置标题
     */
    $.ajax({
        url: projectApi,
        method: 'get',
        success: function (json) {
            if (0 === json.code) {
                if (json.data) {
                    $('h1#project-name').html(json.data.name + '项目');
                    $('.crumbs > a').eq(1).attr('href', '/module?pid=' + pid).html(json.data.name);
                }
                else {
                    info('项目数据拉取出错.');
                }
            }
            else {
                info(json.msg);
            }
        },
        error: function (json) {
            info(json.msg);
        }
    });

    /**
     * 设置默认路径
     */
    d_path.val(getModuleBase());

    /**
     * 读取模块信息
     */
    if (mid) {
        var d = dialog();
        d.showModal();
        $.ajax({
            url: getApi + mid,
            method: 'get',
            success: function (json) {
                if (0 === json.code) {
                    // 获取模块信息成功
                    if (json.data) {
                        d_id.val(json.data.id).prop('readonly', true);
                        d_path.val(getModuleBase() + json.data.id + '.js');
                        d_name.val(json.data.name);
                        d_code.setValue(json.data.code);
                        d_demo.setValue(json.data.demo);
                        d_author.val(json.data.author);
                        d_tags.val(json.data.tags ? json.data.tags.join(',') : '');
                        $('#createTime').html(moment(json.data.createTime).format('YYYY-MM-DD HH:mm:ss'));
                        $('#lastModify').html(moment(json.data.lastModify).format('YYYY-MM-DD HH:mm:ss'));
                        var depDom = $('#dependencies');
                        var html = [];
                        if (json.data.deps && (json.data.deps.exists && json.data.deps.exists.length || json.data.deps.lostes.length)) {
                            json.data.deps.exists.forEach(function (v) {
                                html.push('<li><a href="/module?mid=' + json.data.deps.map[v].mid + '&pid=' + json.data.deps.map[v].pid + '" title="' + json.data.deps.map[v].name + '">' + v + '</a></li>');
                            });
                            json.data.deps.lostes.forEach(function (v) {
                                html.push('<li class="lost">' + v + '</li>');
                            });
                            depDom.html(html.length ? html.join('') : '<li>N/A</li>');
                        }
                        else {
                            depDom.html('<li>N/A</li>');
                        }
                    }
                    if (!d_path.parent().find('.btn-load-module').length) {
                        d_path.parent().append('<button class="btn-load-module face">载入此模块</button>');
                    }
                }
                else {
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

    /**
     * 绑定标识符事件
     */
    $('input[name=id]').on('blur', function () {
        if (mid) return;
        var $el = $(this),
            v = $el.val();
        if (v) {
            $.ajax({
                url: checkApi + v,
                success: function (json) {
                    if (0 === json.code || 1 === json.code) {
                        validate = 1 === json.code ? 2 : 1;
                        $el.removeClass('error');
                        d_path.val(getModuleBase() + v + '.js');

                        if (2 === validate) {
                            if (!d_path.parent().find('.btn-load-module').length) {
                                d_path.parent().append('<button class="btn-load-module face">载入此模块</button>');
                            }
                        }
                        else {
                            $('.btn-load-module').length && $('.btn-load-module').remove();
                        }
                    }
                    else {
                        validate = 0;
                        $('.btn-load-module').length && $('.btn-load-module').remove();
                        $el.addClass('error');
                    }
                },
                error: function (json) {
                    validate = 0;
                    $('.btn-load-module').length && $('.btn-load-module').remove();
                    $el.addClass('error');
                }
            });
        }
        else {
            validate = 0;
            $('.btn-load-module').length && $('.btn-load-module').remove();
            $el.addClass('error');
        }
    }).on('focus keypress', function () {
        validate = 1;
        $(this).removeClass('error');
    });

    /**
     * 绑定提交按钮事件
     */
    $('#btn-save').on('click', function () {
        if (validate) {
            var _id = d_id.val(),
                _name = d_name.val(),
                _path = d_path.val(),
                _author = d_author.val(),
                _code = d_code.getValue(),
                _demo = d_demo.getValue(),
                _tags = d_tags.val(),
                _createTime = Date.now(),
                _lastModify = Date.now();

            var data = {
                _id: mid || '',
                pid: pid,
                id: _id,
                name: _name,
                path: _path,
                author: _author,
                code: _code,
                demo: _demo,
                tags: _tags,
                lastModify: _lastModify
            };

            if (!mid) {
                data.createTime = _createTime;
            }

            if (/alert/ig.test(_code)) {
                var cd = dialog({
                    title: '温馨提示',
                    content: '您的模块代码中包含了alert代码，是否继续提交？',
                    ok: function () {
                        submitData();
                    }
                });
                cd.showModal();
            }
            else {
                submitData();
            }

            function submitData() {
                if (2 === validate) {
                    var d = dialog({
                        title: '提交确认？',
                        content: '此模块的物理文件已存在，是否要覆盖？',
                        ok: function () {
                            send();
                        },
                        cancel: function () {

                        }
                    });
                    d.showModal();
                }
                else {
                    send();
                }
            }

            function send() {
                if (!saveLock) {
                    saveLock = !saveLock;
                    $.ajax({
                        url: saveApi,
                        method: 'post',
                        data: data,
                        success: function (json) {
                            saveLock = false;
                            if (0 === json.code) {
                                location.href = '/module?pid=' + pid + (mid ? '&mid=' + mid : '');
                            }
                            else {
                                info('保存失败。');
                            }
                        },
                        error: function (json) {
                            saveLock = false;
                            info(json.msg);
                        }
                    });
                }
            }
        }
        else {
            info('校验未通过.', 2000);
        }
    });

    /**
     * 绑定载入模块代码按钮事件
     */
    $('#moduleadd-container').on('click', '.btn-load-module', function () {
        $.ajax({
            url: loadApi,
            method: 'post',
            data: {filename: d_id.val()},
            success: function (json) {
                if (0 === json.code) {
                    d_code.setValue(json.data);
                    info('模块载入成功！')
                }
                else {
                    info('模块载入失败！');
                }
            },
            error: function (json) {
                info('载入模块失败！');
            }
        })
    });

    function getModuleBase() {
        return location.protocol + "//" + location.host + '/modules/';
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
});
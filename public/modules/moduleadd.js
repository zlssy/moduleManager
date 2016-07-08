define('moduleadd', ['jquery', 'util', 'dialog'], function ($, util, dialog) {
    var pid = util.url.getUrlParam('pid'),
        mid = util.url.getUrlParam('mid'),
        projectApi = '/api/project/view/' + pid, // 项目接口
        getApi = '/api/module/view/', // 模块获取接口
        saveApi = '/api/module/save', // 模块保存接口
        checkApi = '/api/module/check/', // 模块标识符校验接口
        loadApi = '/api/module/load', // 载入模块源文件接口
        validate = 1, // 是否校验通过
        d_id = $('input[name=id]'),
        d_name = $('input[name=name]'),
        d_path = $('input[name=path]'),
        d_author = $('input[name=author]'),
        d_code = $('textarea[name=code]'),
        d_demo = $('textarea[name=demo]');

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
                    info('项目数据拉去出错.');
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
                        d_code.val(json.data.code);
                        d_demo.val(json.data.demo);
                        d_author.val(json.data.author);
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
                            d_path.parent().append('<button class="btn-load-module face">载入此模块</button>');
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
                _code = d_code.val(),
                _demo = d_demo.val(),
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
                lastModify: _lastModify
            };

            if (!mid) {
                data.createTime = _createTime;
            }

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

            function send() {
                $.ajax({
                    url: saveApi,
                    method: 'post',
                    data: data,
                    success: function (json) {
                        if (0 === json.code) {
                            location.href = '/module?pid=' + pid + (mid ? '&mid=' + mid : '');
                        }
                        else {
                            info('保存失败。');
                        }
                    },
                    error: function (json) {
                        info(json.msg);
                    }
                });
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
                    d_code.val(json.data);
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
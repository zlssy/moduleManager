define('_modules', ['jquery', 'util', 'dialog', 'moment', 'simpleTable', '_header'], function ($, util, dialog, moment, table) {
    var pid = util.url.getUrlParam('pid'),
        mid = util.url.getUrlParam('mid'),
        listItemTpl = $('#listItemTpl').html(),
        containerTpl = $('#containerTpl').html(),
        ul = $('#module-list'),
        main = $('#main-container'),
        listApi = globalConfig.apiRoot + 'api/module/list/',
        viewProjectApi = globalConfig.apiRoot + 'api/project/view/',
        moduleApi = globalConfig.apiRoot + 'api/module/view/',
        moduleEditUrl = globalConfig.root + 'module/edit?pid=' + pid + '&mid=',
        moduleCompressApi = globalConfig.apiRoot + 'api/compress',
        moduleCopyApi = globalConfig.apiRoot + 'api/copy',
        moduleSyncApi = globalConfig.apiRoot + 'api/sync',
        fileCheckApi = globalConfig.apiRoot + 'api/checkfileinfo',
        historyApi = globalConfig.apiRoot + 'api/history/',
        historyDownloadApi = globalConfig.apiRoot + 'api/history/download',
        retryTimes = 10,
        moduleName = '',
        demoCode = '',
        moduleData = null,
        moduleListData = {},
        compressLock = false;

    /**
     * 获取模块列表
     */
    $.ajax({
        url: listApi + pid,
        method: 'get',
        success: function (json) {
            if (0 === json.code) {
                if (json.data && json.data.length) {
                    ul.html(util.formatJson(listItemTpl, {
                        list: json.data,
                        pid: pid
                    }));
                    if (!mid) {
                        loadModule(mid = json.data[0]._id);
                    }
                    /* 文件时间对比 */
                    var files = json.data.map(function (m) {
                        moduleListData[m.id + '.js'] = m;
                        return m.id + '.js';
                    });
                    $.ajax({
                        url: fileCheckApi,
                        method: 'post',
                        data: {files: files.join(',')},
                        success: function (fileJson) {
                            if (fileJson.code == 0) {
                                var data = fileJson.data || {}, keys = [], maps = {}, key;
                                for (var k in data) {
                                    key = k.substr(k.lastIndexOf('/') + 1);
                                    keys.push(key);
                                    maps[key] = data[k];
                                }
                                /* 比对模块最后修改时间 */
                                keys.forEach(function (module) {
                                    if (maps[module]) {
                                        if (Math.abs(moment(maps[module].mtime).diff(moment(moduleListData[module].lastModify), 'second')) > 2) {
                                            ul.find('li[data-module="' + module.substr(0, module.indexOf('.')) + '"]').addClass('new');
                                        }
                                    }
                                });
                            }
                        },
                        error: function (fileErrJson) {
                            console.log('error', fileErrJson);
                        }
                    });
                    /* --end check-- */
                    activeLink();
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
            info(json.msg);
        }
    });

    /**
     * 如果有携带mid，则获取该模块
     */
    if (mid) {
        loadModule(mid);
    }

    /**
     * 注册事件
     */
    $('#create').on('click', function () {
        location.href = '/module/add?pid=' + pid;
    });
    main.on('click', '.tab > li', function () {
        var $el = $(this);
        var index = main.find('.tab > li').index($el);
        var id = $el.attr('id') || '';

        if ('demo' === id && demoCode && main.find('.content > div').eq(index).html() === "") {
            main.find('.content > div').eq(index).html(demoCode);
        }
        if (id.indexOf('edit') > -1 && mid) {
            location.href = moduleEditUrl + mid;
        }
        if ('history' === id && main.find('.content > div').eq(index).html() === "") {
            // 载入历史记录
            $.ajax({
                url: historyApi + mid,
                success: function (json) {
                    if (0 === json.code) {
                        var t = table({
                            cols: [
                                {
                                    name: '模块创建时间', id: 'moduleDate', format: function (v) {
                                    return moment(v).format('YYYY-MM-DD HH:mm:ss');
                                }
                                },
                                {
                                    name: '记录创建时间', id: 'createTime', format: function (v) {
                                    return moment(v).format('YYYY-MM-DD HH:mm:ss');
                                }
                                },
                                {
                                    name: '操作', id: '_id', format: function (v) {
                                    return '<div style="text-align: center;"><a href="' + globalConfig.apiRoot + 'api/history/download/' + v + '" target="_blank">下载</a></div>';
                                }
                                }
                            ]
                        });
                        t.setData(json.data);
                        main.find('.content > div').eq(index).html('<div style="margin: 24px 12px;">' + t.get() + '</div>');
                    }
                    else {
                        console.log('获取数据失败。');
                    }
                },
                error: function (err) {

                }
            });
        }
        if (!$el.hasClass('active')) {
            main.find('.content > div').hide().eq(index).show();
            main.find('.tab > li').removeClass('active').eq(index).addClass('active');
            syncHeight();
        }
    });
    main.on('click', '.module-operate > button', function (e) {
        var $el = $(this),
            cls = $el.attr('class');

        if ($el.hasClass('compress')) {
            if (!compressLock) {
                compressLock = !compressLock;
                $.ajax({
                    url: moduleCompressApi,
                    method: 'post',
                    data: {modules: moduleName},
                    success: function (json) {
                        compressLock = false;
                        if (0 === json.code) {
                            dialog({
                                title: '温馨提示',
                                content: '发布完成！'
                            }).show();
                        }
                        else {
                            info('发布失败!');
                        }
                    },
                    error: function (json) {
                        compressLock = false;
                        info(json.msg);
                    }
                });
            }
        }
        else if ($el.hasClass('copy')) {
            if (!compressLock) {
                compressLock = !compressLock;
                $.ajax({
                    url: moduleCopyApi,
                    method: 'post',
                    data: {module: moduleName},
                    success: function (json) {
                        compressLock = false;
                        if (0 === json.code) {
                            dialog({
                                title: '温馨提示',
                                content: '直接发布完成！'
                            }).show();
                        }
                        else {
                            info('直接发布失败！');
                        }
                    },
                    error: function (json) {
                        compressLock = false;
                        info(json.msg);
                    }
                });
            }
        }
        else if ($el.hasClass('sync')) {
            $.ajax({
                url: moduleSyncApi,
                method: 'post',
                data: moduleData,
                success: function (json) {
                    if (0 === json.code) {
                        dialog({
                            title: '温馨提示',
                            content: '同步完成！'
                        }).show();
                    }
                    else {
                        info('同步失败!');
                    }
                },
                error: function (json) {
                    info(json.msg);
                }
            })
        }
    });

    /**
     * 读取当前模块名称
     */
    $.ajax({
        url: viewProjectApi + pid,
        success: function (json) {
            if (0 === json.code) {
                $('#myProjectName').html(json.data.name);
            }
            else {
                util.log('load project failure.');
            }
        },
        error: function (json) {
            util.log(json.msg);
        }
    });

    /**
     * 加载模块数据
     * @param mid 模块ID
     */
    function loadModule(mid) {
        $.ajax({
            url: moduleApi + mid,
            success: function (json) {
                if (0 === json.code) {
                    moduleData = json.data;
                    var renderData = util.deepClone({}, moduleData);
                    if (renderData.code && renderData.code.length > 50000) {
                        renderData.code = renderData.code.substr(0, 50000);
                    }
                    main.html(util.formatJson(containerTpl, {
                        module: renderData,
                        htmlEncode: util.htmlEncode,
                        moment: moment
                    }));
                    moduleName = json.data.id;
                    demoCode = json.data.demo;
                    syncHeight();
                }
                else {
                    main.html('<div class="empty">拉取模块数据失败.</div>');
                }
            },
            error: function (json) {
                info(json.msg);
            }
        });
    }

    /**
     * 给出消息提示
     * @param msg 消息体
     * @param timer 延时关闭时间
     */
    function info(msg, timer) {
        var d = dialog({
            content: msg
        }), t = timer || 1000;
        d.show();
        setTimeout(function () {
            d.close();
        }, t);
    }

    /**
     * 同步菜单与模块信息面板的高度
     */
    function syncHeight() {
        ul.attr('style', null);
        main.attr('style', null);
        var aH = ul.height(),
            bH = main.height(),
            h = Math.max(aH, bH);

        ul.height(h);
        main.height(h);
    }

    /**
     * 激活链接
     */
    function activeLink() {
        var links = ul.find('a[href]');
        /**
         * 设置默认选中项
         */
        if (links.length) {
            links.each(function (i, v) {
                var $el = $(v),
                    href = $el.attr('href');

                if (href.indexOf(mid) > -1) {
                    $el.addClass('active');
                }
            });
        }
        else if (retryTimes > 0) {
            retryTimes--;
            setTimeout(activeLink, 10);
        }
    }
});
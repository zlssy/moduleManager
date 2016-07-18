define('modules', ['jquery', 'util', 'dialog', 'moment'], function ($, util, dialog, moment) {
    var pid = util.url.getUrlParam('pid'),
        mid = util.url.getUrlParam('mid'),
        listItemTpl = $('#listItemTpl').html(),
        containerTpl = $('#containerTpl').html(),
        ul = $('#module-list'),
        main = $('#main-container'),
        listApi = globalConfig.apiRoot+'api/module/list/',
        moduleApi = globalConfig.apiRoot+'api/module/view/',
        moduleEditUrl = globalConfig.root+'module/edit?pid=' + pid + '&mid=',
        moduleCompressApi = globalConfig.apiRoot+'api/compress',
        retryTimes = 10,
        moduleName = '';

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

    if (mid) {
        loadModule(mid);
    }

    $('#create').on('click', function () {
        location.href = '/module/add?pid=' + pid;
    });

    main.on('click', '.tab > li', function () {
        var $el = $(this);
        var index = main.find('.tab > li').index($el);

        if (!$el.hasClass('active')) {
            main.find('.content > div').hide().eq(index).show();
            main.find('.tab > li').removeClass('active').eq(index).addClass('active');
            syncHeight();
        }

        if (2 === index && mid) {
            location.href = moduleEditUrl + mid;
        }
    });
    main.on('click', '.module-operate > button', function (e) {
        var $el = $(this);

        if($el.hasClass('compress')){
            $.ajax({
                url: moduleCompressApi,
                method: 'post',
                data: {modules: moduleName},
                success: function (json) {
                    if(0 === json.code){
                        dialog({
                            title: '温馨提示',
                            content: '压缩完成！'
                        }).show();
                    }
                    else{
                        info('压缩失败!');
                    }
                },
                error: function (json) {
                    info(json.msg);
                }
            });
        }
    });

    function loadModule(mid) {
        $.ajax({
            url: moduleApi + mid,
            success: function (json) {
                if (0 === json.code) {
                    main.html(util.formatJson(containerTpl, {
                        module: json.data,
                        htmlEncode: util.htmlEncode,
                        moment: moment
                    }));
                    moduleName = json.data.id;
                    activeLink();
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

    function info(msg, timer) {
        var d = dialog({
            content: msg
        }), t = timer || 1000;
        d.show();
        setTimeout(function () {
            d.close();
        }, t);
    }
    
    function syncHeight() {
        ul.attr('style', null);
        main.attr('style', null);
        var aH = ul.height(),
            bH = main.height(),
            h = Math.max(aH, bH);

        ul.height(h);
        main.height(h);
    }

    function activeLink() {
        var links = ul.find('a[href]');
        /**
         * 设置默认选中项
         */
        if(links.length) {
            links.each(function (i, v) {
                var $el = $(v),
                    href = $el.attr('href');

                if (href.indexOf(mid) > -1) {
                    $el.addClass('active');
                }
            });
        }
        else if(retryTimes > 0) {
            retryTimes--;
            setTimeout(activeLink, 10);
        }
    }
});
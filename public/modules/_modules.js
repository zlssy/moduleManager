define('_modules', ['jquery', 'util', 'dialog', 'moment', '_header'], function ($, util, dialog, moment) {
    var pid = util.url.getUrlParam('pid'),
        mid = util.url.getUrlParam('mid'),
        listItemTpl = $('#listItemTpl').html(),
        containerTpl = $('#containerTpl').html(),
        ul = $('#module-list'),
        main = $('#main-container'),
        listApi = globalConfig.apiRoot+'api/module/list/',
        viewProjectApi = globalConfig.apiRoot+'api/project/view/',
        moduleApi = globalConfig.apiRoot+'api/module/view/',
        moduleEditUrl = globalConfig.root+'module/edit?pid=' + pid + '&mid=',
        moduleCompressApi = globalConfig.apiRoot+'api/compress',
        // dependenciesApi = globalConfig.apiRoot+'api/module/dependencies/', // 获取模块依赖接口
        retryTimes = 10,
        moduleName = '',
        demoCode = '';

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

    if (mid) {
        loadModule(mid);
    }

    $('#create').on('click', function () {
        location.href = '/module/add?pid=' + pid;
    });

    main.on('click', '.tab > li', function () {
        var $el = $(this);
        var index = main.find('.tab > li').index($el);

        if(1 === index && demoCode && main.find('.content > div').eq(index).html() === ""){
            main.find('.content > div').eq(index).html(demoCode);
        }
        if (2 === index && mid) {
            location.href = moduleEditUrl + mid;
        }
        if (!$el.hasClass('active')) {
            main.find('.content > div').hide().eq(index).show();
            main.find('.tab > li').removeClass('active').eq(index).addClass('active');
            syncHeight();
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

    $.ajax({
        url:viewProjectApi+pid,
        success: function (json) {
            if(0 === json.code){
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
                    demoCode = json.data.demo;
                    syncHeight();
                    // var depListDom = $('.module-dependencies > ul');
                    // $.ajax({
                    //     url: dependenciesApi+json.data._id,
                    //     success: function (data) {
                    //         if (0 === data.code) {
                    //             var html = [];
                    //             data.data.exists.forEach(function (v) {
                    //                 html.push('<li><a href="/module?mid=' + data.data.map[v].mid + '&pid=' + data.data.map[v].pid + '" title="' + data.data.map[v].name + '">' + v + '</a></li>');
                    //             });
                    //             data.data.lostes.forEach(function (v) {
                    //                 html.push('<li class="lost">' + v + '</li>');
                    //             });
                    //             depListDom.html(html.length ? html.join('') : '<li>N/A</li>');
                    //         }
                    //         else {
                    //             depListDom.html('<li>N/A</li>');
                    //         }
                    //     },
                    //     error: function (data) {
                    //         depListDom.html('<li>N/A</li>');
                    //     }
                    // });
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
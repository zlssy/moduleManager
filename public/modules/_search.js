define('_search',['jquery', 'util', 'dialog', '_header'], function ($, util, dialog) {
    var listItemTpl = $('#listItemTpl').html(),
        main = $('.search-list'),
        api = globalConfig.apiRoot+'api/search';

    var tool = {
        clear: function (str) {
            return str.replace(/(?:<(\/?)script>)/g, '&lt;$1script&gt;');
        }
    };

    function init(keys) {
        $('.head-search .keys').val(keys);
        $.ajax({
            url: api,
            method: 'post',
            data: {keys: keys},
            success: function (json) {
                if (0 === json.code) {
                    if (json.data && json.data.length) {
                        main.html(util.formatJson(listItemTpl, {
                            list: json.data,
                            tool: tool
                        }));
                    }
                    else {
                        main.html('<li><div class="empty">没有找到相关的模块。</div></li>');
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
        bindEvents();
    }

    function bindEvents() {
        $('#search-container').on('click', '.search-expando', function () {
            var $el = $(this), val = $el.html();
            $el.siblings('.search-desc').toggleClass('auto');
            if('展开' === val){
                $el.html('收起');
            }
            else if('收起'===val){
                $el.html('展开');
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

    return {
        init: init
    };
});
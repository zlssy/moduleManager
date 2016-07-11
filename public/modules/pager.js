define('pager',['jquery', 'util'], function ($, util) {
    var defaultConfig = {
            pageno: 1, // 当前页码
            pagesize: 20, // 分页大小
            pagenoKey: 'page', // 页码关键字
            pagesizeKey: 'pagesize', // 页大小关键字
            group: 3, // 分组数
            useGoto: true, // 是否启用页码跳转
            view: 1, // 视图类型
            containerClass: 'pager', // 分页条容器样式
            btnClass: 'pager-btn', // 分页按钮样式
            itemClass: 'pager-item', // 页码块样式
            itemActiveClass: 'active', // 页码块选中样式
            gotoInputClass: 'pager-input', // 分页跳转输入框样式
            gotoBtnClass: 'pager-goto' // 跳转按钮样式
        },
        EventListener = util.once(function () {
            var pager = this;
            $(document.body).on('click', '.pager-goto-btn', function () {
                var page = pager.clearPage($(this).siblings('input').val());
                location.href = pager.setPage(page);
            }).on('keypress', pager.options.gotoInputClass ? '.' + pager.options.gotoInputClass : 'input.pager-input', function (e) {
                if (13 === e.keyCode || 13 === e.which) {
                    var page = pager.clearPage($(this).val());
                    location.href = pager.setPage(page);
                }
            });
        });

    function Pager(opt) {
        var opt = $.extend(defaultConfig, opt || {});
        this.pageno = opt.pageno - 0;
        this.pagesize = opt.pagesize - 0;
        this.total = (opt.total || 0) - 0;
        this.options = opt;
        if (!this.total || 0 === this.total || 0 === this.pagesize) {
            throw new Error('Lost total record or page size is zero.');
        }
        this.init.apply(this);
    }

    Pager.prototype = {
        init: function () {
            this.page = Math.ceil(this.total / this.pagesize);
            this.setPageRule(this.options.pageRule || function (pager) {
                return function (page) {
                    return util.url.replaceParam(this.options.pagenoKey, page, location.href, true);
                };
            });
            EventListener(this);
        },
        /**
         * 放置页码至连接地址的规则
         * @param fn 回调函数，需要高阶函数实现
         */
        setPageRule: function (fn) {
            this.setPage = fn.apply(this);
        },
        /**
         * 整理page参数
         * @param p
         */
        clearPage: function (p) {
            if (/^\d+$/.test(p)) {
                p -= 0;
                if (p > this.page) {
                    return this.page;
                }
                else if (p < 1) {
                    return 1;
                }
                else {
                    return Math.ceil(p);
                }
            }
            return 1;
        },
        /**
         * 获取分页条
         */
        get: function () {
            var html = [], cls;

            if (this.page > 1) {
                html.push('<div class="' + this.options.containerClass + '">');
                // 视图1下显示首页按钮连接
                if (this.pageno > 1 && 1 === this.options.view) {
                    html.push('<a href="' + this.setPage(1) + '"' + (this.options.btnClass ? ' class="' + this.options.btnClass + '"' : '') + '>首页</a>');
                }
                // 视图2下，显示第一页和 ...
                else if(2 === this.options.view && Math.max(1, this.pageno - this.options.group) > 1){
                    html.push('<a href="'+this.setPage(1)+'"' + (this.options.itemClass ? ' class="' + this.options.itemClass + '"' : '') + '>1</a>');
                    html.push('<span>...</span>');
                }

                // 显示分组中间页面
                for (var i = Math.max(1, this.pageno - this.options.group), l = Math.min(this.pageno + this.options.group, this.page); i <= l; i++) {
                    cls = [];
                    if (this.options.itemClass) {
                        cls.push(this.options.itemClass);
                    }
                    if ((i === this.pageno) && this.options.itemActiveClass) {
                        cls.push(this.options.itemActiveClass);
                    }
                    html.push('<a href="' + this.setPage(i) + '"' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + i + '</a>');
                }

                // 视图1下显示尾页
                if (this.pageno < this.page && 1 === this.options.view) {
                    html.push('<a href="' + this.setPage(this.page) + '"' + (this.options.btnClass ? ' class="' + this.options.btnClass + '"' : '') + ' title="' + this.page + '">尾页</a>');
                }
                // 视图2下显示最后一页
                else if(2 === this.options.view && Math.min(this.pageno + this.options.group, this.page) < this.page){
                    html.push('<span>...</span>');
                    html.push('<a href="'+this.setPage(this.page)+'"' + (this.options.itemClass ? ' class="' + this.options.itemClass + '"' : '') + '>'+this.page+'</a>');
                }
                if (this.options.useGoto) {
                    html.push('<span>转到&nbsp;</span>');
                    html.push('<input type="text" class="' + this.options.gotoInputClass + '" value="' + this.pageno + '" />');
                    cls = [];
                    if (this.options.btnClass) {
                        cls.push(this.options.btnClass);
                    }
                    if (this.options.gotoBtnClass) {
                        cls.push(this.options.gotoBtnClass);
                    }
                    html.push('<a href="javascript:;" class="pager-goto-btn ' + (cls.length ? cls.join(' ') : '') + '">跳转</a>');
                }
                html.push('</div>');
            }

            return html.join('');
        }
    };

    return Pager;
});
define('multiSearch', ['jquery', 'util'], function ($, util) {
    'use strict';

    var defaultConfig = {
        debug: false,
        key: 'data-key', // 要替换的连接的关键字
        levelKey: 'data-key', // level3的分层关键字
        path: '/', // 搜索根路径
        activeClass: 'active' // 激活元素的样式
    };

    function multiSearch(opt) {
        this.options = $.extend(defaultConfig, opt || {});
        this.conditions = {
            level1: '',
            level2: '',
            level3: '',
            level3Map: {},
            level3Name: {}
        };
    }

    multiSearch.prototype = {
        init: function () {
            this.baseUrl = location.protocol + '//' + location.host + this.options.path;
            this.searchStr = location.search;
            this.hashStr = util.url.getHash();
            this.analysis();
            this.baseUrl.substr(this.baseUrl.length - 1) === '/' && (this.baseUrl = this.baseUrl.substr(0, this.baseUrl.length - 1));
            this.options.debug && this.log(this.baseUrl, this.conditions);
            this.setDefault();
        },
        analysis: function () {
            var url = location.pathname;
            var params = url.replace(new RegExp(this.options.path), '');
            var conditions = params.replace(/^\/|\/$/g, '').split('/');

            switch (conditions.length) {
                case 1:
                    this.conditions[includeNumber(conditions[0]) ? 'level3' : 'level1'] = conditions[0];
                    break;
                case 2:
                    this.conditions.level1 = conditions[0];
                    this.conditions[includeNumber(conditions[1]) ? 'level3' : 'level2'] = conditions[1];
                    break;
                case 3:
                    this.conditions.level1 = conditions[0];
                    this.conditions.level2 = conditions[1];
                    this.conditions.level3 = conditions[2];
                    break;
            }
        },
        setDefault: function () {
            var container;
            ['level1', 'level2'].forEach(v => {
                container = $('.' + v);
                container.find('.active').removeClass(this.options.activeClass);
                var activeItem = container.find('[' + this.options.key + '="' + (this.conditions[v] || '') + '"]');
                activeItem.addClass(this.options.activeClass);
                this.conditions[v+'Name'] = activeItem.html();
                // 设置多维度level1, level2的默认值
                if (container.length > 1) {
                    var activeIndex = $('.' + v).index(activeItem.parents('.' + v));
                    for (let i = 0, l = container.length; i < l; i++) {
                        if (i !== activeIndex) {
                            container.eq(i).find('[' + this.options.key + '=""]').addClass(this.options.activeClass);
                        }
                    }
                }

                /* url reset */
                container.find('[' + this.options.key + ']').each((index, link)=> {
                    var $el = $(link);
                    var linKey = $el.data('key');
                    var settings = $.extend(true, {}, this.conditions), url = this.baseUrl;

                    if ('level1' === v) {
                        if (this.conditions.level1 && this.conditions.level2) {
                            // 解除level2的依赖
                            settings.level2 = '';
                        }
                        settings.level1 = linKey;
                    }
                    else {
                        // level2
                        settings.level2 = linKey;
                    }

                    if (settings.level1) {
                        url += '/' + settings.level1;
                        if (settings.level2) {
                            url += '/' + settings.level2;
                        }
                        if (settings.level3) {
                            url += '/' + settings.level3;
                        }
                    }
                    else {
                        settings.level3 && (url += '/' + settings.level3);
                    }
                    $el.attr('href', this.setUrl(url));
                });
            });


            var level3 = $('.level3');
            level3.length && Array.from(level3).forEach(v=> {
                container = $(v);
                var key = container.attr(this.options.levelKey).trim(),
                    value = getLevel3ValueByKey.apply(this, [key]), activeItem;

                container.find('.active').removeClass(this.options.activeClass);
                if (value) {
                    this.conditions.level3Map[key] = value;
                    activeItem = container.find('[' + this.options.key + '=' + key + value + ']');
                }
                else {
                    this.conditions.level3Map[key] = '';
                    activeItem = container.find('[' + this.options.key + '=""]');
                }
                activeItem.addClass(this.options.activeClass);
                this.conditions.level3Name[key] = activeItem.html();

                /* url reset */
                container.find('[' + this.options.key + ']').each((index, link)=> {
                    var $el = $(link);
                    var linKey = $el.attr(this.options.key);
                    var settings = $.extend(true, {}, this.conditions), url = this.baseUrl;
                    var kv = linKey.match(/(^[^\d]+)(\d+)/), kvk, kvv;

                    if (kv && kv.length === 3) {
                        kvk = kv[1];
                        kvv = kv[2];
                        settings.level3Map[kvk] = kvv;
                    }
                    else {
                        kvk = $el.parents('.level3').attr(this.options.levelKey);
                        kvv = '';
                    }
                    // 重置level3
                    kvk && updateLevel3(settings, kvk, kvv);

                    if (settings.level1) {
                        url += '/' + settings.level1;
                        if (settings.level2) {
                            url += '/' + settings.level2;
                        }
                    }
                    if (settings.level3) {
                        url += '/' + settings.level3;
                    }
                    $el.attr('href', this.setUrl(url));
                });
            });
        },
        log: function () {
            window.console && console.log.apply(console, arguments);
        },
        setPath: function (path) {
            this.options.path = path;
        },
        getPath: function () {
            return this.options.path;
        },
        setUrl: function (url) {
            return url + this.searchStr + this.hashStr;
        },
        getCondition: function () {
            return this.conditions;
        },
        updateLevel3: updateLevel3,
        getKeyWords: function () {
            var cond = this.getCondition();
            var url = this.baseUrl;
            var keys = [], link='';
            if(cond.level1 !== '') {
                // 要移除level1
                if (cond.level3) {
                    link += this.baseUrl + '/' + cond.level3;
                }
                // 更新当前url路径
                url+='/'+cond.level1;
                // 记录关键字与移除关键字的连接
                keys.push({
                    name: cond.level1Name || '',
                    url: this.setUrl(link)
                });
                if(cond.level2){
                    // 要移除level2
                    if(cond.level3){
                        link = url+'/'+cond.level3;
                    }
                    // 记录关键字与移除关键字的连接
                    keys.push({
                        name: cond.level2Name || '',
                        url: link
                    });
                    // 更新当前url路径
                    url+= '/'+cond.level2;
                }
            }
            if(cond.level3) {
                var condClone;
                for (let k in cond.level3Map) {
                    if (k && cond.level3Map[k]) {
                        condClone = $.extend(true, {}, cond);
                        updateLevel3(condClone, k, '');
                        if (condClone.level3) {
                            link = url + '/' + condClone.level3;
                        }
                        else {
                            link = url;
                        }
                        keys.push({
                            name: condClone.level3Name[k] || '',
                            url: link
                        });
                    }
                }
            }

            return keys;
        },
        getBaseUrl: function () {
            return this.baseUrl;
        }
    };

    function includeNumber(str) {
        return /\d+/.test(str);
    }

    function getLevel3ValueByKey(key) {
        var d = this.conditions.level3.match(new RegExp(key + '(\\d+)'));
        if (d && d.length === 2) {
            return d[1];
        }
        return false;
    }

    function updateLevel3(obj, key, value) {
        var d = obj.level3.match(new RegExp(key + '(\\d+)'));
        if (key && value) {
            if (d && d.length === 2) { // update
                obj.level3 = obj.level3.replace(new RegExp(key + '(\\d+)'), key + value);
            }
            else {// add
                obj.level3 += key + value;
            }
        }
        else if (key) {
            // remove
            obj.level3 = obj.level3.replace(new RegExp(key + '\\d+'), '');
        }
        return obj;
    }

    return multiSearch;
});
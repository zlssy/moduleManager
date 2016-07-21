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
        this.resetCondition = this.options.resetCondition || function (conds) {
                var l3 = decodeURIComponent(conds.level3);

                if (l3 && l3.indexOf('rs')>-1) {
                    var key='';
                    l3 = l3.replace(/(rs[^a-z0-9-]+)/, function (v) {
                        key = v;
                        return ''
                    });
                    l3+=key;
                }
                conds.level3 = l3;
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
            this.bindEvents();
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
            this.resetCondition && this.resetCondition(this.conditions);
        },
        setDefault: function () {
            var container, self = this;
            ['level1', 'level2'].forEach(function (v) {
                container = $('.' + v);
                container.find('.active').removeClass(self.options.activeClass);
                var activeItem = container.find('[' + self.options.key + '="' + (self.conditions[v] || '') + '"]');
                activeItem.addClass(self.options.activeClass);
                self.conditions[v + 'Name'] = activeItem.html();
                // 设置多维度level1, level2的默认值
                if (container.length > 1) {
                    var activeIndex = $('.' + v).index(activeItem.parents('.' + v));
                    for (var i = 0, l = container.length; i < l; i++) {
                        if (i !== activeIndex) {
                            container.eq(i).find('[' + self.options.key + '=""]').addClass(self.options.activeClass);
                        }
                    }
                }

                /* url reset */
                container.find('[' + self.options.key + ']').each(function (index, link) {
                    var $el = $(link);
                    var linKey = $el.data('key');
                    var settings = $.extend(true, {}, self.conditions), url = self.baseUrl;

                    if ('level1' === v) {
                        if (self.conditions.level1 && self.conditions.level2) {
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
                    $el.attr('href', self.setUrl(url));
                });
            });


            var level3 = $('.level3');
            level3.length && level3.each(function (i,v) {
                container = $(v);
                var key = container.attr(self.options.levelKey).trim(),
                    value = getLevel3ValueByKey.apply(self, [key]), activeItem;

                container.find('.active').removeClass(self.options.activeClass);
                if (value) {
                    self.conditions.level3Map[key] = value;
                    activeItem = container.find('[' + self.options.key + '=' + key + value + ']');
                }
                else {
                    self.conditions.level3Map[key] = '';
                    activeItem = container.find('[' + self.options.key + '=""]');
                }
                activeItem.addClass(self.options.activeClass);
                self.conditions.level3Name[key] = activeItem.html() || (self.conditions.level3Map[key]+container.find('.unit').html());
                if(value && value.indexOf('-')>-1){
                    var vs = value.split('-');
                    var vd = container.find('input');
                    vd.eq(0) && vd.eq(0).val(vs[0] || '');
                    vd.eq(1) && vd.eq(1).val(vs[1] || '');
                }

                /* url reset */
                container.find('[' + self.options.key + ']').each(function (index, link) {
                    var $el = $(link);
                    var linKey = $el.attr(self.options.key);
                    var settings = $.extend(true, {}, self.conditions), url = self.baseUrl;
                    var kv = linKey.match(/(^[^\d]+)(\d+)/), kvk, kvv;

                    if (kv && kv.length === 3) {
                        kvk = kv[1];
                        kvv = kv[2];
                        settings.level3Map[kvk] = kvv;
                    }
                    else {
                        kvk = $el.parents('.level3').attr(self.options.levelKey);
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
                    $el.attr('href', self.setUrl(url));
                });
            });
        },
        log: function () {
            util.log(arguments);
        },
        setPath: function (path) {
            this.options.path = path;
        },
        getPath: function () {
            return this.options.path;
        },
        setUrl: function (url) {
            return url + this.searchStr + (this.hashStr ? '#' + this.hashStr : '');
        },
        getCondition: function () {
            return this.conditions;
        },
        updateLevel3: updateLevel3,
        getKeyWords: function () {
            var cond = this.getCondition();
            var url = this.baseUrl;
            var keys = [], link = this.baseUrl;
            if (cond.level1 !== '') {
                // 要移除level1，level2 这个依赖也要移除
                if (cond.level3) {
                    link += '/' + cond.level3;
                }
                // 更新当前url路径
                url += '/' + cond.level1;
                // 记录关键字与移除关键字的连接
                keys.push({
                    name: cond.level1Name || '',
                    url: this.setUrl(link)
                });
                if (cond.level2) {
                    // 要移除level2
                    link = url;
                    if (cond.level3) {
                        link = '/' + cond.level3;
                    }
                    // 记录关键字与移除关键字的连接
                    keys.push({
                        name: cond.level2Name || '',
                        url: this.setUrl(link)
                    });
                    // 更新当前url路径
                    url += '/' + cond.level2;
                }
            }
            if (cond.level3) {
                var condClone;
                for (var k in cond.level3Map) {
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
        },
        getCurrentConditionUrl: function () {
            var url = this.baseUrl, self = this;
            [1, 2, 3].forEach(function (item) {
                self.conditions['level' + item] && (url += '/' + self.conditions['level' + item]);
            });
            return this.setUrl(url);
        },
        bindEvents: function () {
            var self = this;
            $('.level3').on('click', 'button input[type=button]', function (e) {
                var $el = $(this),
                    key = $el.parents('.level3').data('key'),
                    vd = $el.siblings('input'),
                    v1 = vd.eq(0).val(),
                    v2 = vd.eq(1).val();
                if (key && v1 > -1 && v2 > -1) {
                    self.updateLevel3(self.conditions, key, v1 + '-' + v2);
                    location.href = self.getCurrentConditionUrl();
                }
            });
        }
    };

    function includeNumber(str) {
        return /\d+/.test(str);
    }

    function getLevel3ValueByKey(key) {
        var d = this.conditions.level3.match(new RegExp(key + '([\\d-]+)'));
        if (d && d.length === 2) {
            return d[1];
        }
        return false;
    }

    function updateLevel3(obj, key, value) {
        var d = obj.level3.match(new RegExp(key + '([\\d-]+)'));
        if (key && value) {
            if (d && d.length === 2) { // update
                obj.level3 = obj.level3.replace(new RegExp(key + '([\\d-]+)'), key + value);
            }
            else {// add
                obj.level3 += key + value;
            }
        }
        else if (key) {
            // remove
            obj.level3 = obj.level3.replace(new RegExp(key + '[\\d-]+'), '');
        }
        return obj;
    }

    return multiSearch;
});
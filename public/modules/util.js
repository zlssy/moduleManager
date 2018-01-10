define('util', function () {
    var _formatJson_cache = {};

    /**
     * [object2param 转换对象为url参数]
     * @param  {[type]} o [要转换的对象]
     * @param {[type]} [transVal] [值编码函数]
     * @return {[type]}   [description]
     */
    function object2param(o, transVal) {
        var r = [],
            transVal = transVal || function (v) {
                    return encodeURIComponent(v);
                };
        for (var k in o) {
            r.push(k + '=' + transVal(o[k]));
        }
        return r.join('&');
    }

    /**
     * [getCookie 获取cookie]
     * @param  {[type]} name [cookie名]
     * @return {[type]}      [description]
     */
    function getCookie(name) {
        var reg = new RegExp("(^| )" + name + "(?:=([^;]*))?(;|$)"),
            val = document.cookie.match(reg);
        return val ? (val[2] ? decodeURIComponent(val[2]) : "") : null;
    }

    /**
     * [setCookie 设置cookie]
     * @param {[type]} name    [cookie名]
     * @param {[type]} value   [值]
     * @param {[type]} expires [过期时间，单位分钟]
     * @param {[type]} path    [路径]
     * @param {[type]} domain  [域]
     * @param {[type]} secure  [是否是安全cookie]
     */
    function setCookie(name, value, expires, path, domain, secure) {
        var exp = new Date(),
            expires = arguments[2] || null,
            path = arguments[3] || "/",
            domain = arguments[4] || null,
            secure = arguments[5] || false;
        expires ? exp.setMinutes(exp.getMinutes() + parseInt(expires)) : "";
        document.cookie = name + '=' + encodeURIComponent(value) + (expires ? ';expires=' + exp.toGMTString() : '') + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
    }

    /**
     * [delCookie 删除cookie]
     * @param  {[type]} name   [cookie名]
     * @param  {[type]} path   [路径]
     * @param  {[type]} domain [域]
     * @param  {[type]} secure [是否安全cookie]
     * @return {[type]}        [description]
     */
    function delCookie(name, path, domain, secure) {
        var value = getCookie(name);
        if (value != null) {
            var exp = new Date();
            exp.setMinutes(exp.getMinutes() - 1000);
            path = path || "/";
            document.cookie = name + '=;expires=' + exp.toGMTString() + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
        }
    }

    /**
     * [formatJson 模板解析]
     * @param  {[type]} str  [模板串]
     * @param  {[type]} data [数据]
     * @return {[type]}      [解析后的字符串]
     */
    function formatJson(str, data) {
        var fn = !/\W/.test(str) ? _formatJson_cache[str] = _formatJson_cache[str] || formatJson(document.getElementById(str).innerHTML) : new Function("obj", "var p=[],print=function(){p.push.apply(p,arguments);};" + "with(obj){p.push('" + str.replace(/[\r\t\n]/g, " ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g, "$1\r").replace(/\t=(.*?)%>/g, "',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'") + "');}return p.join('');");
        return data ? fn(data) : fn;
    }

    /**
     * 模板解析，解析{}包裹的数据
     * @param tpl 模板
     * @param data  数据
     * @returns {XML|string|void}
     */
    function format(tpl, data) {
        return tpl.replace(/{([^\}]+)}/g, function (v, v1) {
            return data.hasOwnProperty(v1) ? data[v1] : v || '';
        });
    }

    /**
     * [loadJsonp 加载jsonp数据]
     * @param  {[type]} url [url地址]
     * @param  {[type]} opt [配置参数]
     * @return {[type]}     [description]
     */
    function loadJsonp(url, opt) {
        var option = {
            onLoad: null,
            onError: null,
            onTimeout: null,
            timeout: 8000,
            charset: "utf-8"
        };
        var timer;
        if (arguments.length == 1) {
            if (typeof arguments[0] == "object") {
                opt = arguments[0];
                url = opt.url;
            } else {
                opt = {};
            }
        }
        if (typeof(opt.data) == 'object') {
            var param = [];
            for (var k in opt.data) {
                param.push(k + '=' + opt.data[k])
            }
            if (param.length > 0) {
                param = param.join('&');
                url += (url.indexOf('?') > 0 ? '&' : '?') + param;
            }
        }
        for (var i in opt) {
            if (opt.hasOwnProperty(i)) {
                option[i] = opt[i];
            }
        }
        var el = document.createElement("script");
        el.charset = option.charset || "utf-8";
        el.onload = el.onreadystatechange = function () {
            if (/loaded|complete/i.test(this.readyState) || navigator.userAgent.toLowerCase().indexOf("msie") == -1) {
                option.onLoad && option.onLoad();
                clear();
            }
        };
        el.onerror = function () {
            option.onError && option.onError();
            clear();
        };
        el.src = url;
        document.getElementsByTagName('head')[0].appendChild(el);
        if (typeof option.onTimeout == "function") {
            timer = setTimeout(function () {
                option.onTimeout();
            }, option.timeout);
        }
        ;
        var clear = function () {
            if (!el) {
                return;
            }
            timer && clearTimeout(timer);
            el.onload = el.onreadystatechange = el.onerror = null;
            el.parentNode && (el.parentNode.removeChild(el));
            el = null;
        }
    }

    /**
     * [setHash 设置hash值]
     * @param {[type]} val [description]
     */
    function setHash(val) {
        setTimeout(function () {
            location.hash = val;
        }, 0);
    }

    /**
     * [getHash 获取hash值]
     * @param  {[type]} url [取值的url]
     * @return {[type]}     [hash值]
     */
    function getHash(url) {
        var u = url || location.hash;
        return u ? u.replace(/.*#/, "") : "";
    }

    /**
     * [getHashParam 获取hash值]
     * @param  {[type]} name [hash名]
     * @return {[type]}      [hash值]
     */
    function getHashParam(name) {
        var result = this.getHash().match(new RegExp("(^|&)" + name + "=([^&]*)(&|$)"));
        return result != null ? result[2] : "";
    }

    /**
     * [getUrlParam 获取url参数值]
     * @param  {[type]} name [url参数名]
     * @param  {[type]} url  [url地址，默认当前host]
     * @return {[type]}      [url参数值]
     */
    function getUrlParam(name, url) {
        var u = arguments[1] || window.location.search,
            reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"),
            r = u.substr(u.indexOf("\?") + 1).match(reg);
        return r != null ? r[2] : "";
    }

    /**
     * [getParams 获取所有的参数]
     * @return {[type]} [参数数组]
     */
    function getParams() {
        var param = [],
            hash = this.getHash();
        paramArr = hash ? hash.split("&") : [];
        for (var i = 1, l = paramArr.length; i < l; i++) {
            param.push(paramArr[i]);
        }
        return param;
    }

    /**
     * [decodeUrl 解码url地址]
     * @param  {[type]} url [url地址]
     * @return {[type]}     [description]
     */
    function decodeUrl(url) {
        url = decodeURIComponent(url);
        var urlObj = parseUrl(url),
            decodedParam = [];

        if (urlObj && urlObj.params) {
            var value;
            for (var key in urlObj.params) {
                value = decodeURIComponent(urlObj.params[key]);
                decodedParam.push(key + "=" + value);
            }
        }
        var urlPrefix = url.split("?")[0];
        return urlPrefix + "?" + decodedParam.join("&");
    }

    /**
     * [parseUrl 处理url地址]
     * @param  {[type]} url [url地址]
     * @return {[type]}     [description]
     */
    function parseUrl(url) {
        var a = document.createElement('a');
        a.href = url;
        return {
            source: url,
            protocol: a.protocol.replace(':', ''),
            host: a.hostname,
            port: a.port,
            query: a.search,
            params: (function () {
                var ret = {},
                    seg = a.search.replace(/^\?/, '').split('&'),
                    len = seg.length,
                    i = 0,
                    s;
                for (; i < len; i++) {
                    if (!seg[i]) {
                        continue;
                    }
                    s = seg[i].split('=');
                    ret[s[0]] = s[1];
                }
                return ret;
            })(),
            file: (a.pathname.match(/([^\/?#]+)$/i) || [, ''])[1],
            hash: a.hash.replace('#', ''),
            path: a.pathname.replace(/^([^\/])/, '/$1'),
            relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
            segments: a.pathname.replace(/^\//, '').split('/')
        };
    }

    /**
     * [replaceParam 替换url参数值]
     * @param  {[type]} param        [参数名]
     * @param  {[type]} value        [参数值]
     * @param  {[type]} url          [url地址]
     * @param  {[type]} forceReplace [强制地图换]
     * @return {[type]}              [结果值]
     */
    function replaceParam(param, value, url, forceReplace) {
        url = url || location.href;
        var reg = new RegExp("([\\?&]" + param + "=)[^&#]*");
        if (!url.match(reg)) {
            return (url.indexOf("?") == -1) ? (url + "?" + param + "=" + value) : (url + "&" + param + "=" + value);
        }
        if (forceReplace) {
            return url.replace(reg, "$1" + value);
        }
        return url;
    }

    /**
     * [isDate 检查数据是否是日期类型]
     * @param  {[String]}  d [要检查的字符串]
     * @return {Boolean}   [返回值]
     */
    function isDate(d) {
        var r;
        try {
            r = !!Date.parse(d.replace(/-/g, '/'));
        } catch (e) {
            r = false;
        }
        return r;
    }

    /**
     * [once 执行一次的函数]
     * @param  {Function} fn [要执行的函数]
     * @return {[function]}      [返回无论条用多少次都执行一次的函数]
     */
    function once(fn) {
        var run = false;
        return function () {
            !run && (run = !run, fn.apply(arguments[0] || null, Array.prototype.slice.call(arguments, 1)));
        }
    }

    /**
     * [getTodayStr 获取日期的今天年月日表示法]
     * @param {Date|String} [date] [要获取的日期对象或日期对象字符串]
     * @return {[String]} [年月日字符串]
     */
    function getTodayStr(date) {
        var d = date || new Date();
        d = 'string' === typeof d ? new Date(d) : d;
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    }

    /**
     * 日志输出
     * @param msg
     */
    function log(msg) {
        window.console && console.log(msg);
    }

    /**
     * html转码
     * @param value
     */
    function htmlEncode(value) {
        var d = document.createElement('div');
        d.innerText = value;
        return d.innerHTML;
    }

    /**
     * html 代码还原
     * @param value
     */
    function htmlDecode(value) {
        var d = document.createElement('div');
        d.innerHTML = value;
        return d.innerText;
    }

    function is(type, target) {
        return Object.prototype.toString.call(target) === '[object ' + type + ']';
    }

    function deepClone(source, target) {
        if (target) {
            for (var k in target) {
                if (target.hasOwnProperty(k)) {
                    var v = target[k];
                    if (is('Object', v)) {
                        source[k] = {};
                        deepClone(source[k], v);
                    }
                    else if (is('Array', v)) {
                        source[k] = [];
                        for (var i = 0, l = v.length; i < l; i++) {
                            source[k][i] = v[i];
                            deepClone(source[k][i], v[i]);
                        }
                    }
                    else {
                        source[k] = target[k];
                    }
                }
            }
        }
        return source;
    }

    function EventBase() {
        this._events = {}
    }

    EventBase.prototype = {
        on: function (name, fn) {
            var evt = this._events[name] || (this._events[name] = []);
            typeof fn === 'function' && evt.push(fn);
            return this;
        },
        trigger: function (name) {
            var evt = this._events[name];
            if (evt && evt.length) {
                for (var i = 0; i < evt.length; i++) {
                    evt[i].apply(this, Array.prototype.slice.call(arguments, 1));
                }
            }
            return this;
        },
        off: function (name, fn) {
            if (name) {
                var evt = this._events[name];
                if (fn) {
                    for (var i = 0; i < evt.length; i++) {
                        if (fn === evt[i]) {
                            evt.splice(i--, 1);
                        }
                    }
                }
                else {
                    this._events[name] = [];
                }
            }
            else {
                this._events = {};
            }
            return this;
        }
    };

    function TouchListen(opt) {
        this.agile = opt && opt.agile || 50; // 灵敏度， 单位毫秒
        this._events = {};
    }

    TouchListen.prototype = {
        init: function () {
            var self = this;
            document.addEventListener('touchstart', function (e) {
                self.startPoint = e.targetTouches[0];
                self.time = e.timeStamp;
            });
            document.addEventListener('touchmove', function (e) {
                var t = e.timeStamp, endPoint;
                if (t - self.time > self.agile) {
                    self.time = t;
                    endPoint = e.targetTouches[0];
                    if (endPoint.screenX - self.startPoint.screenX > 0) {
                        self.trigger('swipeRight', e);
                    }
                    if (endPoint.screenX - self.startPoint.screenX < 0) {
                        self.trigger('swipeLeft', e);
                    }
                    if (endPoint.screenY - self.startPoint.screenY > 0) {
                        self.trigger('swipeDown', e);
                    }
                    if (endPoint.screenY - self.startPoint.screenY < 0) {
                        self.trigger('swipeUp', e);
                    }
                }
            });
        }
    };

    deepClone(TouchListen.prototype, EventBase.prototype);

    /**
     * 清除空格
     * @param str
     */
    function trim(str) {
        return str ? str.replace(/^\s*|\s*$/g, '') : str;
    }

    /**
     * 清除左侧空格
     * @param str
     */
    function ltrim(str) {
        return str ? str.replace(/^\s*/g, '') : str;
    }

    /**
     * 清除右侧空格
     * @param str
     * @returns {XML|string|void}
     */
    function rtrim(str) {
        return str ? str.replace(/\s*$/g, '') : str;
    }

    /**
     * 延迟执行
     * @param fn 函数
     * @returns {*} 线程id
     */
    function delay(fn) {
        return (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
            window.setTimeout(callback, 1000 / 60);
        })(fn);
    }

    /**
     * 取消延迟执行
     * @param id 线程id
     */
    function unDelay(id) {
        (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (id) {
            window.clearTimeout(id);
        })(id);
    }

    /**
     * 灰度测试
     * @param fn 灰度检测函数
     */
    function grayDebug(fn) {
        var test = grayTest(fn);
        return function (msg) {
            test(window.alert, msg);
        }
    }

    /**
     * 灰度测试
     * @param fn 灰度检测函数
     */
    function grayTest(fn) {
        var f = typeof fn === 'function' ? fn : function (members) {
                var user = localStorage.username || getCookie('username');
                if (user && members.indexOf(user) > -1) {
                    return true;
                }
                return false;
            };
        return function (factory, args, context) {
            var factory = typeof factory === 'function' ? factory : window.alert, args = is('Array', args) ? args : args ? [args] : []
            if (is('Array', fn)) {
                if (f(fn)) {
                    factory.apply(context || window, args);
                }
            }
            else if (f()) {
                factory.apply(context || window, args);
            }
        }
    }

    return {
        object2param: object2param,
        cookie: {
            get: getCookie,
            set: setCookie,
            del: delCookie
        },
        url: {
            setHash: setHash,
            getHash: getHash,
            getHashParam: getHashParam,
            getUrlParam: getUrlParam,
            getParams: getParams,
            decodeUrl: decodeUrl,
            parseUrl: parseUrl,
            replaceParam: replaceParam
        },
        formatJson: formatJson,
        format: format,
        loadJsonp: loadJsonp,
        date: {
            isDate: isDate,
            getTodayStr: getTodayStr
        },
        htmlEncode: htmlEncode,
        htmlDecode: htmlDecode,
        once: once,
        is: is,
        deepClone: deepClone,
        EventBase: EventBase,
        TouchListen: TouchListen,
        trim: trim,
        ltrim: ltrim,
        rtrim: rtrim,
        log: log,
        delay: delay,
        unDelay: unDelay,
        grayDebug: grayDebug,
        grayTest: grayTest
    };
})
;
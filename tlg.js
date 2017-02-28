(function (window) {
    "use strict";

    var Utils = {
        setCookie: function (name, value, ttl) {
            var expires = "";
            var cookieDomain = "";
            if (ttl) {
                var date = new Date();
                date.setTime(date.getTime() + (ttl * 60 * 1000));
                expires = "; expires=" + date.toGMTString();
            }
            var domain = config.cookieDomain || config.domain;
            if (domain) {
                cookieDomain = "; domain=" + domain;
            }
            document.cookie = name + "=" + escape(value) + expires + cookieDomain + "; path=/";
        }, getCookie: function (name) {
            var i, c;
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (i = 0; i < ca.length; i++) {
                c = ca[i];
                while (c.charAt(0) === ' ') {
                    c = c.substring(1, c.length);
                }
                if (c.indexOf(nameEQ) === 0) {
                    return unescape(c.substring(nameEQ.length, c.length));
                }
            }
            return null;
        }, destroyCookie: function (name) {
            setCookie(name, "", -1);
        }, ajaxsend: function (imageUrl) {
            (new Image).src = imageUrl;
        }, generateId: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }, getRandom: function () {
            return window.Math.random()
        }, loadScript: function (src, callback) {
            try {
                var ele = document.createElement("script");
                ele.type = "text/javascript";
                ele.readyState ?
                    ele.onreadystatechange = function () {
                        if ("loaded" == ele.readyState || "complete" == ele.readyState) {
                            ele.onreadystatechange = null, callback && callback();
                        }
                    } : ele.onload = function () {
                        callback && callback()
                    };
                ele.src = src;
                document.body.appendChild(ele)
            }
        }
    };

    var TRACK = {
        sendLog: function (logType, data) {
            if (logType && data && "object" === typeof data) {
                for (var n = [], h = config.allParams, l = 0, m = h.length; l < m; l++) {
                    n.push(h[l] + "=" + (data[h[l]] || baseinfo[h[l]] || ""));
                }
                Utils.ajaxsend(Utils.protocol + "//" + config.server + "?" + n.join("&"))
            }
        }, trackLog: function () {
            this.sendLog("trackLog", {tag: "pvstatall", rand_id: Utils.getRandom()});
        }, bindAddGTIDtoURL: function () {
            var b = this,
                a = this.baseInfo;
            window.$ && Utils.bindElem("a", "click", function (c) {
                "NO" == b.filterList(a.curURL)
                && (c = $(this).attr("href") || "#",

                -1 != c.indexOf("javascript:")
                || "#" == c.substring(0, 1)
                || "NO" != b.filterList(c)
                || "/" != c.substring(0, 1)
                && -1 == c.indexOf(".58.com")
                || (c.match(/[\?&]ClickID=\d*/) ?
                    $(this).attr("href", c.replace(/ClickID=\d*/, "ClickID=" + a.ClickID)) :
                    $(this).attr("href", c.trim() + (-1 == c.indexOf("?") ? "?" : "&") + "PGTID=" + a.GTID + "&ClickID=" + a.ClickID)))
            }, b, a)
        }
    }
})(window);
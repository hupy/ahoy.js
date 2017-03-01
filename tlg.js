(function (window) {
    "use strict";

    var Config = {
        trackpv: "http://s.xiaoqudaquan.com/pv",
        trackevent: "http://s.xiaoqudaquan.com/event"
    };

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
        },
        getCookie: function (name) {
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
        },
        destroyCookie: function (name) {
            setCookie(name, "", -1);
        },
        sendLog: function (data) {
            if (data && "object" === typeof data) {
                var params = [];
                for (var item in data) {
                    params.push(item + "=" + data[item]);
                }

                (new Image).src = Config.trackpv + "?" + params.join("&");
            }
        },
        getUUID: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        getRandom: function () {
            return window.Math.random()
        },
        loadScript: function (src, callback) {
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
            } catch (c) {
            }
        }
    };

    var TRACK = {
        ClickID: 1,
        CurURL: window.location.href,
        Referrer: document.referrer,
        WindowSize: document.documentElement.clientWidth + "x" + document.documentElement.clientHeight,
        ScreenSize: window.screen.width + "," + window.screen.height,
        Domain: function () {
            var host = window.location.host.toLowerCase(), regx = /.*?([^\.]+\.(com|org|net|biz|edu|cc)(\.[^\.]+)?)/;
            return regx.test(host) ? "." + host.replace(regx, "$1") : ""
        }(),
        TrackID: function () {
            var uuid = Utils.getUUID();
            return uuid.substring(0, uuid.indexOf("-"));
        }(),
        track: function () {
            Utils.sendLog({
                tag: "pageview",
                rand_id: Utils.getRandom(),
                url: TRACK.CurURL,
                referrer: TRACK.Referrer,
                ws: TRACK.WindowSize,
                ss: TRACK.ScreenSize
            });
        },
        bindTrackToURL: function () {
            $("body").on("click", "a", function () {
                var href = $(this).attr("href");
                if (!href) {
                    return;
                }

                if (href.indexOf("javascript:") != -1) {
                    return;
                }

                if (href.match(/[\?&]ClickID=\d*/)) {
                    $(this).attr("href", href.replace(/ClickID=\d*/, "ClickID=" + TRACK.ClickID));
                } else {
                    var beacon = $(this).attr("data-beacon") || "1000-00-000";
                    href = href.trim();
                    href += (-1 == href.indexOf("?") ? "?" : "&");
                    href += "TrackID=" + beacon + "-" + TRACK.TrackID + "&ClickID=" + TRACK.ClickID;
                    $(this).attr("href", href);
                }

                TRACK.ClickID++;
            });
        }
    };

    TRACK.track();
    TRACK.bindTrackToURL();
})(window);
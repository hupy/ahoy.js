(function (window) {
    "use strict";

    var Config = {
        trackpv: "http://track.xiaoqudaquan.com"
    };

    var Utils = {
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
            return "";
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
        subtract: function (a, b) {
            return ("number" === typeof a && "number" === typeof b && a > b) ? (a - b) : -1;
        }
    };

    var TRACK = {
        ClickID: 1,
        CurURL: window.location.href,
        Referrer: document.referrer,
        WindowSize: document.documentElement.clientWidth + "x" + document.documentElement.clientHeight,
        ScreenSize: window.screen.width + "x" + window.screen.height,
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
                tag: "pv",
                uuid: Utils.getCookie("DQ_UUID"),
                uid: Utils.getCookie("DQ_UID"),
                rand_id: Utils.getRandom(),
                url: encodeURIComponent(TRACK.CurURL),
                referrer: encodeURIComponent(TRACK.Referrer)
            });
        },
        trackPerformance: function () {
            if (window && window.performance && window.performance.timing) {
                var p = window.performance.timing;
                Utils.sendLog({
                    tag: "pf",
                    rand_id: Utils.getRandom(),
                    url: encodeURIComponent(TRACK.CurURL),
                    referrer: encodeURIComponent(TRACK.Referrer),
                    ws: TRACK.WindowSize,
                    ss: TRACK.ScreenSize,
                    loadPage: Utils.subtract(p.loadEventEnd, p.navigationStart),
                    domReady: Utils.subtract(p.domComplete, p.responseEnd),
                    redirect: Utils.subtract(p.redirectEnd, p.redirectStart),
                    dns: Utils.subtract(p.domainLookupEnd, p.domainLookupStart),
                    ttfb: Utils.subtract(p.responseStart, p.navigationStart),
                    request: Utils.subtract(p.responseEnd, p.requestStart),
                    loadEvent: Utils.subtract(p.loadEventEnd, p.loadEventStart),
                    appcache: Utils.subtract(p.domainLookupStart, p.fetchStart),
                    unloadEvent: Utils.subtract(p.unloadEventEnd, p.unloadEventStart),
                    connect: Utils.subtract(p.connectEnd, p.connectStart),
                    DOMContentLoaded: Utils.subtract(p.domContentLoadedEventEnd, p.fetchStart)
                });
            }
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
    TRACK.trackPerformance();
    TRACK.bindTrackToURL();
})(window);
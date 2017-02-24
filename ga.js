(function (window) {
    "use strict";

    var config = {
        eventsUrl: "http://track.xxx.com/ga/events",
        cookieDomain: null
    };

    var ga = window.ga || window.GA || {};

    var $ = window.jQuery || window.Zepto || window.$;
    var visitId, visitorId
    var visitTtl = 4 * 60; // 4 hours
    var visitorTtl = 2 * 365 * 24 * 60; // 2 years
    var isReady = false;
    var queue = [];
    var eventQueue = [];
    var canStringify = typeof(JSON) !== "undefined" && typeof(JSON.stringify) !== "undefined";

    function eventsUrl() {
        return config.eventsUrl;
    }

    // cookies
    // http://www.quirksmode.org/js/cookies.html
    function setCookie(name, value, ttl) {
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
    }

    function getCookie(name) {
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
    }

    function destroyCookie(name) {
        setCookie(name, "", -1);
    }

    function log(message) {
        if (ga.getDebug()) {
            window.console.log(message);
        }
    }

    function setReady() {
        var callback;
        while (callback = queue.shift()) {
            callback();
        }
        isReady = true;
    }

    function ready(callback) {
        if (isReady) {
            callback();
        } else {
            queue.push(callback);
        }
    }

    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function saveEventQueue() {
        // TODO add stringify method for IE 7 and under
        if (canStringify) {
            setCookie("ga_events", JSON.stringify(eventQueue), 1);
        }
    }

    ga.getVisitId = function () {
        return getCookie("ga_visit");
    };

    ga.getVisitorId = function () {
        return getCookie("ga_visitor");
    };

    ga.getDebug = function () {
        return getCookie("ga_debug")
    }

    ga.reset = function () {
        destroyCookie("ga_visit");
        destroyCookie("ga_visitor");
        destroyCookie("ga_events");
        return true;
    };

    ga.debug = function (enabled) {
        if (enabled === false) {
            destroyCookie("ga_debug");
        } else {
            setCookie("ga_debug", "t", 365 * 24 * 60); // 1 year
        }
        return true;
    };

    // from jquery-ujs
    function csrfToken() {
        return $("meta[name=csrf-token]").attr("content");
    }

    function CSRFProtection(xhr) {
        var token = csrfToken();
        if (token) xhr.setRequestHeader("X-CSRF-Token", token);
    }

    function sendRequest(url, data, success) {
        if (canStringify) {
            $.ajax({
                type: "POST",
                url: url,
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                beforeSend: CSRFProtection,
                success: success
            });
        }
    }

    function createVisit() {
        isReady = false;

        visitId = ga.getVisitId();
        visitorId = ga.getVisitorId();

        if (visitId && visitorId) {
            // TODO keep visit alive?
            log("Active visit");
            setReady();
        } else {
            if (!visitId) {
                visitId = generateId();
                setCookie("ga_visit", visitId, visitTtl);
            }

            // make sure cookies are enabled
            if (ga.getVisitId()) {
                log("Visit started");

                if (!visitorId) {
                    visitorId = generateId();
                    setCookie("ga_visitor", visitorId, visitorTtl);
                }
            } else {
                log("Cookies disabled");
            }

            setReady();
        }
    }

    function trackEvent(event) {
        ready(function () {
            var data = {
                events: [event],
                visit_token: event.visit_token,
                visitor_token: event.visitor_token
            };
            delete event.visit_token;
            delete event.visitor_token;

            sendRequest(eventsUrl(), data, function () {
                // remove from queue
                for (var i = 0; i < eventQueue.length; i++) {
                    if (eventQueue[i].id == event.id) {
                        eventQueue.splice(i, 1);
                        break;
                    }
                }
                saveEventQueue();
            });
        });
    }

    ga.track = function (name, properties) {
        // generate unique id
        var event = {
            name: name,
            properties: properties || {},
            time: (new Date()).getTime() / 1000.0
        };

        // wait for createVisit to log
        $(function () {
            log(event);
        });

        ready(function () {
            if (!ga.getVisitId()) {
                createVisit();
            }

            event.visit_token = ga.getVisitId();
            event.visitor_token = ga.getVisitorId();

            eventQueue.push(event);
            saveEventQueue();

            // wait in case navigating to reduce duplicate events
            setTimeout(function () {
                trackEvent(event);
            }, 1000);
        });
    };

    ga.trackView = function () {
        var properties = {
            url: window.location.href
        };

        ga.track("$view", properties);
    };

    ga.trackClicks = function () {
        $(document).on("click", "a", function (e) {
            var $target = $(e.currentTarget);
            var properties = {};
            properties.href = $target.attr("href");
            if($target.attr("data-beacon")) {
                properties.beacon = $target.attr("data-beacon");
            }
            ga.track("$click", properties);
        });
    };

    ga.trackAll = function () {
        ga.trackView();
        ga.trackClicks();
    };

    try {
        eventQueue = JSON.parse(getCookie("ga_events") || "[]");
    } catch (e) {
    }

    for (var i = 0; i < eventQueue.length; i++) {
        trackEvent(eventQueue[i]);
    }

    ga.start = function () {
        createVisit();

        ga.start = function () {
        };
    };

    $(function () {
        ga.start();
        ga.trackAll();
    });

    window.ga = ga;
}(window));
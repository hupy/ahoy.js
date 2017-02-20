(function (window) {
    "use strict";

    var config = {
        urlPrefix: "",
        visitsUrl: "/ga/visits",
        eventsUrl: "/ga/events",
        cookieDomain: null,
        page: null,
        platform: "Web",
        useBeacon: false,
        startOnReady: true
    };

    var ga = window.ga || window.GA || {};

    ga.configure = function (options) {
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                config[key] = options[key];
            }
        }
    };

    // legacy
    ga.configure(ga);

    var $ = window.jQuery || window.Zepto || window.$;
    var visitId, visitorId, track;
    var visitTtl = 4 * 60; // 4 hours
    var visitorTtl = 2 * 365 * 24 * 60; // 2 years
    var isReady = false;
    var queue = [];
    var canStringify = typeof(JSON) !== "undefined" && typeof(JSON.stringify) !== "undefined";
    var eventQueue = [];

    function visitsUrl() {
        return config.urlPrefix + config.visitsUrl;
    }

    function eventsUrl() {
        return config.urlPrefix + config.eventsUrl;
    }

    function canTrackNow() {
        return (config.useBeacon || config.trackNow) && canStringify && typeof(window.navigator.sendBeacon) !== "undefined";
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
        if (getCookie("ga_debug")) {
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

    // http://stackoverflow.com/a/2117523/1177228
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    function saveEventQueue() {
        // TODO add stringify method for IE 7 and under
        if (canStringify) {
            setCookie("ga_events", JSON.stringify(eventQueue), 1);
        }
    }

    ga.getVisitId = ga.getVisitToken = function () {
        return getCookie("ga_visit");
    };

    ga.getVisitorId = ga.getVisitorToken = function () {
        return getCookie("ga_visitor");
    };

    ga.getTrack = function () {
        return getCookie("ga_track")
    }

    ga.getDebug = function () {
        return getCookie("ga_debug")
    }

    ga.reset = function () {
        destroyCookie("ga_visit");
        destroyCookie("ga_visitor");
        destroyCookie("ga_events");
        destroyCookie("ga_track");
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

    function csrfParam() {
        return $("meta[name=csrf-param]").attr("content");
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

    function eventData(event) {
        var data = {
            events: [event],
            visit_token: event.visit_token,
            visitor_token: event.visitor_token
        };
        delete event.visit_token;
        delete event.visitor_token;
        return data;
    }

    function trackEvent(event) {
        ready( function () {
            sendRequest(eventsUrl(), eventData(event), function() {
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

    function trackEventNow(event) {
        ready( function () {
            var data = eventData(event);
            var param = csrfParam();
            var token = csrfToken();
            if (param && token) data[param] = token;
            var payload = new Blob([JSON.stringify(data)], {type : "application/json; charset=utf-8"});
            navigator.sendBeacon(eventsUrl(), payload);
        });
    }

    function page() {
        return config.page || window.location.pathname;
    }

    function eventProperties(e) {
        var $target = $(e.currentTarget);
        return {
            tag: $target.get(0).tagName.toLowerCase(),
            id: $target.attr("id"),
            "class": $target.attr("class"),
            page: page(),
            section: $target.closest("*[data-section]").data("section")
        };
    }

    function createVisit() {
        isReady = false;

        visitId = ga.getVisitId();
        visitorId = ga.getVisitorId();
        track = ga.getTrack();

        if (visitId && visitorId && !track) {
            // TODO keep visit alive?
            log("Active visit");
            setReady();
        } else {
            if (track) {
                destroyCookie("ga_track");
            }

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

                var data = {
                    visit_token: visitId,
                    visitor_token: visitorId,
                    platform: config.platform,
                    landing_page: window.location.href,
                    screen_width: window.screen.width,
                    screen_height: window.screen.height
                };

                // referrer
                if (document.referrer.length > 0) {
                    data.referrer = document.referrer;
                }

                log(data);

                sendRequest(visitsUrl(), data, setReady);
            } else {
                log("Cookies disabled");
                setReady();
            }
        }
    }

    ga.track = function (name, properties) {
        // generate unique id
        var event = {
            id: generateId(),
            name: name,
            properties: properties || {},
            time: (new Date()).getTime() / 1000.0
        };

        // wait for createVisit to log
        $( function () {
            log(event);
        });

        ready( function () {
            if (!ga.getVisitId()) {
                createVisit();
            }

            event.visit_token = ga.getVisitId();
            event.visitor_token = ga.getVisitorId();

            if (canTrackNow()) {
                trackEventNow(event);
            } else {
                eventQueue.push(event);
                saveEventQueue();

                // wait in case navigating to reduce duplicate events
                setTimeout( function () {
                    trackEvent(event);
                }, 1000);
            }
        });
    };

    ga.trackView = function (additionalProperties) {
        var properties = {
            url: window.location.href,
            title: document.title,
            page: page()
        };

        if (additionalProperties) {
            for(var propName in additionalProperties) {
                if (additionalProperties.hasOwnProperty(propName)) {
                    properties[propName] = additionalProperties[propName];
                }
            }
        }
        ga.track("$view", properties);
    };

    ga.trackClicks = function () {
        $(document).on("click", "a", function (e) {
            var $target = $(e.currentTarget);
            var properties = eventProperties(e);
            properties.text = $.trim($target.text().replace(/[\s\r\n]+/g, " "));
            properties.href = $target.attr("href");
            ga.track("$click", properties);
        });
    };

    ga.trackAll = function() {
        ga.trackView();
        ga.trackClicks();
    };

    // push events from queue
    try {
        eventQueue = JSON.parse(getCookie("ga_events") || "[]");
    } catch (e) {
        // do nothing
    }

    for (var i = 0; i < eventQueue.length; i++) {
        trackEvent(eventQueue[i]);
    }

    ga.start = function () {
        createVisit();

        ga.start = function () {};
    };

    $( function () {
        if (config.startOnReady) {
            ga.start();
            ga.trackAll();
        }
    });

    window.ga = ga;
}(window));
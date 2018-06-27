/**
 * jquery.impulse-slider.js
 *
 * jquery.impulse-slider.js is a jQuery 3D slider plugin based on the power of CSS3 transforms and transitions
 * in modern browsers
 *
 * ------------------------------------------------
 *  author:  Paulo Nunes  @pscnunes
 *
 *  version: 0.4
 *  url:     http://www.twoimpulse.com/products/impulse-slider
 *
 * Copyright 2013 TwoImpulse
 * Free to use under the MIT license.
 *
 */

if (!window.console) {
    window.console = {log: function() {
    } };
}

(function($) {

    var eventPrefix = 'ImpulseSlider';
    var isActive = true;

    window.onfocus = function () {
        isActive = true;
        console.log("Focus gained.");
    };

    window.onblur = function () {
        isActive = false;
        console.log("Focus lost.");
    };

    //TODO
    // Loading images lazily

    // Plugin definition.
    $.fn.impulseslider = function(options) {
        var args = arguments;
        return this.each(function(k, element) {
            var $elem = $(element),
                slider = $elem.data('impulse-slider');
            if (slider && args[0] && typeof args[0] == 'string') {
                var method = args[0],
                    params = [];

                if ( ! slider ) return;

                for (var i in args)
                    if (i > 0)
                        params.push(args[i]);

                if (slider[method])
                    slider[method].apply(slider, params);

            } else {
                $elem.data('impulse-slider', new ImpulseSlider($elem, options));
            }

        });
    };

    //Default options
    $.fn.impulseslider.defaults = {
        height: 400,
        width: 400,
        depth: false,
        spacing: 0,
        perspective: 800,
        pauseTime: 3000,
        transitionDuration: 1000,
        transitionEffect: "ease", // "linear", "ease","ease-in","ease-out", "ease-in-out" or
        autostart: true,
        rightSelector: ".right",
        leftSelector: ".left",
        pauseSelector: ".pause",
        directionRight: true,
        containerSelector: "#cubeCarousel",
        spinnerSelector: "#cubeSpinner",
        images: [],
        imageDivClasses: [],
        degreesRotation : 0,
        enableKeyboard : true,
        onReady : null,
        onPlay : null,
        onPause : null,
        onRotateLeft : null,
        onRotateRight : null,
        onRotate : null,
        onResize : null,
        onBeforeRotate: null
    };

    function ImpulseSlider(element, options) {

        // state persistent properties
        var currentYRot         = 0;
        var directionRight      = true;
        var height              = null;
        var width               = null;
        var paused              = false;
        var lastRotated         = new Date();
        var pauseTime           = null;
        var spinnerSelector     = null;
        var containerSelector   = null;
        var degreesRotation     = null;
        var pics                = [];
        var divs                = [];

        initialize(options);

        // API
        var api = {
            rotateRight : function() {
                var now = new Date();
                var rotatedLongAgo = dateDiffGreaterThan(now, lastRotated, pauseTime / 2);
                if (rotatedLongAgo) {
                    rotateRight(spinnerSelector, degreesRotation);
                }
            },

            rotateLeft : function() {
                var now = new Date();
                var rotatedLongAgo = dateDiffGreaterThan(now, lastRotated, pauseTime / 2);
                if (rotatedLongAgo) {
                    rotateLeft(spinnerSelector, degreesRotation);
                }
            },

            pause : function() {
                if (paused) return;
                paused = true;
                triggerEvent('pause')
            },

            play : function() {
                if (!paused) return;
                paused = false;
                triggerEvent('play')
            },

            resize : function(height, width, depth, perspective) {
                buildPrisma(containerSelector, height, width, depth, perspective, divs);
                triggerEvent('resize')
            }
        };

        return api;

        // Private functions

        // Plugin initialization.
        function initialize(options) {
            var defaults =  $.fn.impulseslider.defaults;
            var opts = $.extend({},defaults , options);
            var depth;
            var spacing = toNumber(opts.spacing, defaults.spacing);
            var perspective = toNumber(opts.perspective, defaults.perspective);
            var rightSelector = getString(opts.rightSelector, defaults.rightSelector);
            var leftSelector = getString(opts.leftSelector, defaults.leftSelector);
            var pauseSelector = getString(opts.pauseSelector, defaults.pauseSelector);
            directionRight = getBoolean(opts.directionRight, defaults.directionRight);
            height = toNumber(opts.height, defaults.height);
            width = toNumber(opts.width, defaults.width);
            spinnerSelector = getString(opts.spinnerSelector, defaults.spinnerSelector);
            containerSelector = getString(opts.containerSelector, defaults.containerSelector);
            var autostart = getBoolean(opts.autostart, defaults.autostart);
            paused = !autostart;
            pauseTime = toNumber(opts.pauseTime, defaults.pauseTime);
            var transitionDuration = toNumber(opts.transitionDuration, defaults.transitionDuration);
            var transitionEffect = getString(opts.transitionEffect, defaults.transitionEffect);
            var images = toStringArray(opts.images, defaults.images);
            var imageDivClasses = toStringArray(opts.imageDivClasses, defaults.imageDivClasses);
            var enableKeyboard = getBoolean(opts.enableKeyboard, defaults.enableKeyboard);
            degreesRotation = toNumber(opts.degreesRotation, defaults.degreesRotation);
            var events = {
                'ready'         : toFunction(opts.onReady, defaults.onReady),
                'play'          : toFunction(opts.onPlay, defaults.onPlay),
                'pause'         : toFunction(opts.onPause, defaults.onPause),
                'rotateLeft'    : toFunction(opts.onRotateLeft, defaults.onRotateLeft),
                'rotateRight'   : toFunction(opts.onRotateRight, defaults.onRotateRight),
                'beforeRotate'  : toFunction(opts.onBeforeRotate, defaults.onBeforeRotate),
                'rotate'        : toFunction(opts.onRotate, defaults.onRotate),
                'resize'        : toFunction(opts.onResize, defaults.onResize)
            }

            // check if there are images defined
            // if so create divs with images and add them to the spinnerSelector div
            if (images.length != 0) {
                for (var i = 0; i < images.length; i++) {
                    var image = images[i];

                    var classesString = "";
                    for (var j = 0; j < imageDivClasses.length; j++) {
                        classesString += imageDivClasses[j] + " ";
                    }

                    var classProperty = "";
                    if (classesString.length > 0)
                        classProperty = "class='" + classesString + "'";

                    var pic = $("<img src='" + image + "'>");
                    var div = $("<div " + classProperty + "></div>");
                    div.append(pic);
                    pics[i] = pic;
                    divs[i] = div;
                }

                // add divs to the spinner
                var spinnerDiv = $(spinnerSelector);
                for (var i = 0; i < divs.length; i++) {
                    spinnerDiv.append(divs[i]);
                }

                // images are defined already inside the slider
            } else {
                var list = $(spinnerSelector);
                divs = $("div", list);

                pics = $(spinnerSelector).find('img');
                for (var i = 0; i < pics.length; i++) {
                    pics[i] = $(pics[i]);
                }
            }

            // calculate the minimum depth if no depth was provided (default behavior)
            if (isNaN(depth))
                depth = calculateMinimumDepth(divs.size(), width);

            depth += spacing;

            if (degreesRotation == 0)
                degreesRotation = 360 / divs.length;

            // build shape
            buildPrisma(containerSelector, height, width, depth, perspective, divs);

            // set navigation controls
            setupNavigationControls(enableKeyboard, rightSelector, leftSelector, pauseSelector);

            // time between transitions
            if (autostart) {

                var infiniteLoop = setInterval(function() {
                    if (!paused) {
                        if (isActive) {
                            var now = new Date();
                            var rotatedLongAgo = dateDiffGreaterThan(now, lastRotated, pauseTime / 2);
                            if (rotatedLongAgo) {
                                rotate(spinnerSelector, degreesRotation);
                                console.log("Auto rotated %n degrees", degreesRotation);
                            } else {
                                console.log("Cancelled auto rotate - last rotation: %s millisecs ago", now - lastRotated);
                            }
                        } else {
                            console.log("Cancelled auto rotate. No focus.");
                        }
                    } else {
                        console.log("Cancelled auto rotate. Paused.");
                    }
                }, pauseTime);
            }

            // transition speed in seconds
            var secs = transitionDuration / 1000.0;


            // add 3D styles to spinner
            $(spinnerSelector).css("-webkit-transform-style", "preserve-3d");
            $(spinnerSelector).css("-moz-transform-style", "preserve-3d");
            $(spinnerSelector).css("-o-transform-style", "preserve-3d");
            $(spinnerSelector).css("transform-style", "preserve-3d");


            // TODO split the transition CSS3 properties to avoid this string concatenation
            var style = "all " + secs + "s " + transitionEffect;
            $(spinnerSelector).css("-webkit-transition", style);
            $(spinnerSelector).css("-moz-transition", style);
            $(spinnerSelector).css("-o-transition", style);
            $(spinnerSelector).css("transition", style);


            console.log("Initialized plugin.");

            bindEvents(events);

            triggerEvent('ready');

            if ( autostart )
                triggerEvent('play');

        };

        function setupNavigationControls(enableKeyboard, rightSelector, leftSelector, pauseSelector) {
            // apply listener to navigation arrows
            $(rightSelector).click(function() {
                rotateRight(spinnerSelector, degreesRotation);
                console.log("Manually rotated %n degrees to the right", degreesRotation);
                paused = false;
            });

            $(leftSelector).click(function() {
                rotateLeft(spinnerSelector, degreesRotation);
                console.log("Manually rotated %n degrees to the left", degreesRotation);
                paused = false;
            });

            $(pauseSelector).click(function() {
                paused = true;
            });

            // apply swipe stuff
            $(containerSelector).on('swipeleft', function(e) {
                rotateLeft(spinnerSelector, degreesRotation);
            });

            $(containerSelector).on('swiperight', function(e) {
                rotateRight(spinnerSelector, degreesRotation);
            });

            if (enableKeyboard) {
                $(document).keydown(function(e) {
                    switch (e.keyCode) {
                        case 37:
                            api.rotateLeft();
                            break;
                        case 39:
                            api.rotateRight();
                            break;
                        case 80:
                            if (!paused)
                                api.pause();
                            else
                                api.play();
                            break;
                    }
                });
            }
        }

        // resize stuff
        function resizeContainer(selector, height, width, perspective) {
            $(selector).css("-webkit-perspective", perspective);
            $(selector).css("-moz-perspective", perspective + "px");
            $(selector).css("-o-perspective", perspective);
            $(selector).css("perspective", perspective + "px");

            $(selector).css("width", width + "px");
            $(selector).css("height", height + "px");

        }

        function resizePictures(height, width) {
            for (var i = 0; i < pics.length; i++) {
                var pic = pics[i];
                pic.css("width", width + "px");
                pic.css("height", height + "px");
            }
        }

        // `translate` builds a translate transform string for given data.
        function translate(t) {
            return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
        }

        function getString(value, fallback) {
            return (typeof value === 'undefined') ? fallback : value;
        }

        function getBoolean(value, fallback) {
            return (typeof value === 'undefined') ? fallback : value;
        }

        function toNumber(numeric, fallback) {
            return isNaN(numeric) ? (fallback || 0) : Number(numeric);
        }

        function toFunction(func, fallback) {
            return (typeof func == 'function') ? func : fallback;
        }

        function toStringArray(array, fallback) {
            var res = new Array();

            if (! $.isArray(array))
                return fallback;
            else {
                for (var i = 0; i < array.length; i++) {
                    var value = array[i];
                    if (typeof value === 'undefined') {
                        return fallback;
                    } else {
                        res[i] = value;
                    }
                }
            }
            return res;
        }

        function triggerEvent(eventName, parameters) {
            $(containerSelector).trigger(eventPrefix + ':' + eventName, parameters);
        };

        function bindEvent(eventName, handler) {
            $(containerSelector).on(eventPrefix + ':' + eventName, handler);
        };

        function bindEvents(events) {
            for(eventName in events) {
                if ( events[eventName] ) {
                    bindEvent(eventName, events[eventName]);
                }
            }
        };

        function buildPrisma(containerSelector, height, width, depth, perspective, divs) {
            var degrees = 360 / divs.length;
            var rotation = 0;
            var currentRot = 0;
            $.each(divs, function(i, div) {
                rotation = currentRot;
                transformObjY(rotation, $(div), depth);
                currentRot += degrees;
            });

            resizeContainer(containerSelector, height, width, perspective);
            resizePictures(height, width);
        }


        function transformObj(axis, deg, obj, depth) {
            var rotation = "rotate" + axis + "(" + deg + "deg) " + 'translateZ(' + depth + 'px)';
            obj.css("transform", rotation);
            obj.css("-ms-transform", rotation);
            obj.css("-webkit-transform", rotation);

        }

        function transformObjY(deg, selectorY, depth) {
            transformObj("Y", deg, $(selectorY), depth);
        }

        function transform(axis, deg, selector) {
            var rotation = "rotate" + axis + "(" + deg + "deg)";
            $(selector).css("transform", rotation);
            $(selector).css("-ms-transform", rotation);
            $(selector).css("-webkit-transform", rotation);

        }

        function rotate(selector, degreesRotation) {
            if (directionRight)
                rotateRight(selector, degreesRotation);
            else
                rotateLeft(selector, degreesRotation);
        }

        function transformY(selectorY, deg) {
            transform("Y", deg, selectorY);
            lastRotated = new Date();
        }

        function rotateRight(selectorY, degreesRotation) {
            var newRotY = currentYRot + degreesRotation;
            transformY(selectorY, newRotY);
            currentYRot = newRotY;
            directionRight = true;
            triggerEvent('rotate')
            triggerEvent('rotateLeft')
        }

        function rotateLeft(selectorY, degreesRotation) {
            var newRotY = currentYRot - degreesRotation;
            transformY(selectorY, newRotY);
            currentYRot = newRotY;
            directionRight = false;
            triggerEvent('rotate')
            triggerEvent('rotateLeft')
        }

        function dateDiffGreaterThan(now, before, millisecs) {
            var diff = now - before;
            return diff > millisecs;
        }

        function calculateMinimumDepth(faceCount, width) {
            var angle = 2 * Math.PI / faceCount;
            var factor = width / Math.sqrt( 2 - 2 * Math.cos( angle ) );
            return factor * Math.sqrt( ( 1 + Math.cos( angle ) ) / 2 );
        }

    }

})(jQuery);








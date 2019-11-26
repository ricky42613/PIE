/* JS Document */

/******************************

[Table of Contents]

1. Vars and Inits
2. Set Header
3. Init Menu
4. Init Header Search
5. Init Home Slider
6. Initialize Milestones


******************************/

$(document).ready(function() {
    "use strict";

    /* 

    1. Vars and Inits

    */

    var header = $('.header');
    var menuActive = false;
    var menu = $('.menu');
    var burger = $('.hamburger');
    var ctrl = new ScrollMagic.Controller();

    setHeader();

    $(window).on('resize', function() {
        setHeader();
    });

    $(document).on('scroll', function() {
        setHeader();
    });

    initMenu();
    initHeaderSearch();
    initHomeSlider();

    /* 

    2. Set Header

    */

    function setHeader() {
        if ($(window).scrollTop() > 100) {
            header.addClass('scrolled');
        } else {
            header.removeClass('scrolled');
        }
    }

    /* 

    3. Init Menu

    */

    function initMenu() {
        if ($('.menu').length) {
            var menu = $('.menu');
            if ($('.hamburger').length) {
                burger.on('click', function() {
                    if (menuActive) {
                        closeMenu();
                    } else {
                        openMenu();

                        $(document).one('click', function cls(e) {
                            if ($(e.target).hasClass('menu_mm')) {
                                $(document).one('click', cls);
                            } else {
                                closeMenu();
                            }
                        });
                    }
                });
            }
        }
    }

    function openMenu() {
        menu.addClass('active');
        menuActive = true;
    }

    function closeMenu() {
        menu.removeClass('active');
        menuActive = false;
    }

    /* 

    4. Init Header Search

    */

    function initHeaderSearch() {
        if ($('.search_button').length) {
            $('.search_button').on('click', function() {
                if ($('.header_search_container').length) {
                    $('.header_search_container').toggleClass('active');
                }
            });
        }
    }

    /* 

    5. Init Home Slider

    */

    function initHomeSlider() {
        if ($('.home_slider').length) {
            var homeSlider = $('.home_slider');
            homeSlider.owlCarousel({
                items: 1,
                loop: false,
                autoplay: false,
                nav: false,
                dots: false,
                smartSpeed: 1200
            });
        }
    }
});
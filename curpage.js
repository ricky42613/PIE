(function() {
    'use strict';
    if (collect_list == undefined) {
        let collect_list = []
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if ("get_collect_list" == request.type) { //回傳已選擇的影片列表
                    sendResponse(collect_list);
                    let nu_code = localStorage.getItem('nu_code')
                    if (nu_code != undefined && nu_code.length != 0) {
                        collect_list = []
                    }
                } else if ("click_all" == request.type) { //全選影片
                    $(".for_nucloud").map((idx, item) => {
                        if (!$(item).prop('checked')) {
                            $(item).click()
                        }
                        if (idx == $(".for_nucloud").length - 1) {
                            sendResponse("finish")
                        }
                    })
                } else if ("cancel_all" == request.type) { //取消所有選擇的影片
                    collect_list.length = 0
                    $(".for_nucloud").map((idx, item) => {
                        $(item).prop('checked', false)
                        if (idx == $(".for_nucloud").length - 1) {
                            sendResponse("finish")
                        }
                    })
                }
            }
        );
        document.addEventListener("contextmenu", function(e) {
            if (undefined !== typeof chrome.runtime.isInstalled) {
                var elem = e.srcElement
                var imghtml = e.srcElement.outerHTML;
                if (elem instanceof HTMLImageElement) { //判斷點擊元素是否為圖片
                    var img = {
                        alt: elem.alt,
                        height: elem.height,
                        width: elem.width,
                    }
                    chrome.runtime.sendMessage({
                        img: img,
                        type: 'img',
                        snapshot: elem.src,
                        element: imghtml
                    }, function(response) {
                        console.log(response);
                    });
                }
            }
        }, true);

        function addcheck(item) { //選取影片
            //<input class="for_nucloud" type="checkbox">
            var x = document.createElement("INPUT");
            x.setAttribute("type", "checkbox");
            x.setAttribute("class", "for_nucloud")
            x.addEventListener('click', (ev) => {
                let data = {}
                ev.stopPropagation()
                let parent = $(ev.target)[0].parentNode
                data.title = $(parent)[0].innerText
                data.url = $(item).closest('a')[0].href
                data.type = 'google'
                if ($($(item).closest("#details,#meta")[0]).find("#metadata-line span").length) {
                    let viewcnt = $($(item).closest("#details,#meta")[0]).find("#metadata-line span")[0].innerText
                    let start = viewcnt.indexOf("：")
                    viewcnt = viewcnt.slice(start + 1, -1).trim()
                    let basic = parseInt(viewcnt)
                    if (viewcnt.indexOf('萬') != -1) {
                        data.viewcnt = basic * 10000
                    } else if (viewcnt.indexOf('億') != -1) {
                        data.viewcnt = basic * 100000000
                    } else {
                        data.viewcnt = basic
                    }
                } else {
                    data.viewcnt = "-"
                }
                data.likecnt = "-"
                data.dislikecnt = "-"
                if ($(ev.target).prop('checked')) {
                    collect_list.push(data)
                } else {
                    let del_at
                    collect_list.forEach((item, idx) => {
                        if (item.link == data.link) {
                            del_at = idx
                            return
                        }
                    })
                    collect_list.splice(del_at, 1)
                }
            })
            if ($(item).find('input').length == 0) { //判斷是否已加入過checkbox
                $(item).prepend(x)
            }
        }
        if (window.location.href.indexOf('https://www.youtube.com') != -1) { //判斷頁面是否為youtube
            let videos = $("[id=video-title]") //所有影片
            videos.map((idx, item) => {
                addcheck(item)
            })
            $("body").bind('DOMNodeInserted', function(ev) {
                if ($(ev.target).find('#video-title').length) {
                    addcheck($(ev.target).find('#video-title')[0])
                }
            })
        }
    }
})()
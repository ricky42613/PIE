    var imgdata = {}
    var imgelem
    let taglist
    if (localStorage.getItem("taglist") == null) {
        taglist = [{
                "name": "其他",
                "children": []
            },
            {
                "name": "音樂",
                "children": []
            },
            {
                "name": "新聞",
                "children": []
            },
            {
                "name": "有趣",
                "children": []
            },
            {
                "name": "教育",
                "children": []
            },
            {
                "name": "遊戲",
                "children": []
            },
        ]
        localStorage.setItem("taglist", JSON.stringify(taglist))
    } else {
        taglist = JSON.parse(localStorage.getItem('taglist'))
    }

    chrome.runtime.onMessage.addListener(
        async function (request, sender, sendResponse) {
            if ("img" == request.type) {
                imgdata = request.img
                let tmp = $.parseHTML(request.element)[0]
                tmp.src = request.snapshot
                imgelem = tmp
                sendResponse('got it');
            } else if ("taglist" == request.type) {
                // taglist = JSON.parse(localStorage.getItem('taglist'))
                sendResponse(taglist)
            }
        }
    );

    function send_to_nucloud(url, data) {
        $.get(url + '?mode=get_url', function (r) {
            let addr = r.url + 'Site_Prog/API/plugin_api.php'
            data.title = data.title.replace(/[/\\?%*:|"<>]/g, '-');
            $.ajax({
                url: addr,
                type: 'POST',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: "mode=upload_json&arg=" + encodeURIComponent((JSON.stringify(data))),
                success: function (r) {
                    console.log(r)
                }
            })
        })
    }

    function getBase64Image(img) {
        if (img.src.indexOf("data:") == -1) {
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL("image/png");
            return dataURL //.replace(/^data:image\/(png|jpg);base64,/, "");
        } else {
            return img.src
        }
    }

    function save_tag(data) {
        if (nu_code.length != 0 && nu_code != undefined) {
            data.nu_code = nu_code
            send_to_nucloud('http://' + domain + '/Site_Prog/API/plugin_api.php', data)
        }
    }

    function snapshot(item) { //處理螢幕截圖
        chrome.tabs.captureVisibleTab(null, {}, function (data) {
            if (nu_code.length != 0 && nu_code != undefined) {
                let info = {
                    src_url: item.src_url,
                    content: data.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
                    tag: item.tag,
                    title: item.title,
                    nu_code: nu_code,
                    fe: '.png'
                }
                send_to_nucloud('http://' + domain + '/Site_Prog/API/plugin_api.php', info)
            }
        })
    }

    function onClickHandler(info, tab) {
        if (info.menuItemId.indexOf("tag") != -1) {
            console.log(info.parentMenuItemId)
            console.log(info.parentMenuItemId.parentMenuItemId)
            let start = info.menuItemId.indexOf("-") + 1
            let data = {
                tag: info.menuItemId.slice(start), //判斷tag
                src_url: info.pageUrl //資料來源
            }
            if (info.parentMenuItemId == 'save_img' || info.parentMenuItemId.indexOf('tag_img')) { //image
                var img = new Image();
                img.src = info.srcUrl;
                img.onload = async function () {
                    let b64 = await getBase64Image(img)
                    data.content = b64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "")
                    data.src_url = info.srcUrl
                    data.title = tab.title + '(' + data.tag + 'img)'
                    data.fe = '.png'
                    save_tag(data)
                }
            }
            if (info.parentMenuItemId == 'term' || info.parentMenuItemId.indexOf('tag_term')!=-1) { //selection text
                data.content = Base64.encode(info.selectionText)
                data.title = info.selectionText + '(' + data.tag + 'text)'
                data.fe = '.txt'
                save_tag(data)
            }
            if (info.parentMenuItemId == 'save_url' || info.parentMenuItemId.indexOf('tag_url')!=-1) { //link
                data.content = window.btoa(info.linkUrl)
                data.fe = '.url'
                $.get(info.linkUrl, function (r) {
                    let end = r.indexOf('</title>')
                    let tmptitle = r.slice(0, end)
                    let start = tmptitle.lastIndexOf('>')
                    data.title = tmptitle.slice(start + 1)
                    save_tag(data)
                }).catch(e => {
                    console.log(e)
                })
            }
            if (info.parentMenuItemId == "snapshot" || info.parentMenuItemId.indexOf("tag_shot")!=-1) { //螢幕截圖
                data.title = tab.title + '(' + data.tag + 'img)'
                snapshot(data)
            }
            if (info.parentMenuItemId == "edit_bm" || info.parentMenuItemId.indexOf("tag_edit_bm")!=-1) { //加入書籤
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function (tabs) {
                    data.title = tabs[0].title
                    data.fe = ".url"
                    data.tag = data.tag + "_bookmark"
                    data.content = window.btoa(tabs[0].url)
                    save_tag(data)
                    chrome.bookmarks.create({
                        url: tabs[0].url,
                        title: tabs[0].title
                    })
                })
            }
            if (info.parentMenuItemId == "collect_youtube" || info.parentMenuItemId.indexOf("tag_yt")!=-1) { //utube video
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'get_collect_list'
                    }, function (response) {
                        if (nu_code != undefined && nu_code.length != 0) {
                            let datalist = response.map((item, idx) => {
                                let tmp = {}
                                tmp.title = item.title
                                tmp.content = window.btoa(item.url)
                                tmp.fe = '.url'
                                tmp.tag = data.tag
                                item.tag = data.tag
                                tmp.src_url = data.src_url
                                item.src_url = data.src_url
                                save_tag(tmp)
                                return item
                            })
                            send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', datalist, nu_code, "search_rst")
                        } else {
                            alert('plz login first')
                        }
                    });
                })
            }
        } else if (info.menuItemId == "del_bm") { //處理刪除書籤
            chrome.bookmarks.search({
                url: info.pageUrl
            }, rst => {
                if (rst.length) {
                    chrome.bookmarks.remove(rst[0].id)
                }
            })
        } else if (info.menuItemId == "yt_clickall") { //全選youtube頁面中的影片
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'click_all'
                })
            })
        } else if (info.menuItemId == "yt_cancelall") { //取消所有youtube頁面中選取的影片
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'cancel_all'
                })
            })
        }
    }

    chrome.contextMenus.onClicked.addListener(onClickHandler);

    chrome.runtime.onInstalled.addListener(function (details) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.type == "add_tag") { //新增標籤
                sendResponse("ok")
                taglist.push({
                    "name": request.name,
                    "children": []
                })
                localStorage.setItem("taglist", JSON.stringify(taglist))
                //image
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "save_img",
                    id: "tag_img-" + request.name,
                    contexts: ["all"],
                });
                //link
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "save_url",
                    id: "tag_url-" + request.name,
                    contexts: ["all"],
                });
                //selection term
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "term",
                    id: "tag_term-" + request.name,
                    contexts: ["all"],
                });
                //螢幕截圖
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "snapshot",
                    id: "tag_shot-" + request.name,
                    contexts: ["all"],
                });
                //書籤
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "edit_bm",
                    id: "tag_edit_bm-" + request.name,
                    contexts: ["all"],
                });
                //utube video
                chrome.contextMenus.create({
                    title: request.name,
                    parentId: "collect_youtube",
                    id: "tag_yt-" + request.name,
                    contexts: ["all"],
                });
            } else if (request.type == "del_tag") { //刪除標籤
                sendResponse("ok")
                taglist.every((element, idx) => {
                    if (element.name == request.name) {
                        chrome.contextMenus.remove("tag_yt-" + request.name)
                        chrome.contextMenus.remove("tag_img-" + request.name)
                        chrome.contextMenus.remove("tag_edit_bm-" + request.name)
                        chrome.contextMenus.remove("tag_shot-" + request.name)
                        chrome.contextMenus.remove("tag_term-" + request.name)
                        chrome.contextMenus.remove("tag_url-" + request.name)
                        taglist.splice(idx, 1)
                        localStorage.setItem("taglist", JSON.stringify(taglist))
                        return false
                    } else {
                        return true
                    }
                })
            } else if (request.type == "del_child") {
                console.log(request.parent)
                console.log(request.target)
                taglist.every((element, idx) => {
                    if (element.name == request.parent) {
                        element.children.forEach((item, idx2) => {
                            if (item.name == request.target) {
                                taglist[idx].children.splice(idx2, 1)
                                localStorage.setItem("taglist", JSON.stringify(taglist))
                                chrome.contextMenus.remove("tag_yt-" + request.parent + ">" + request.target)
                                chrome.contextMenus.remove("tag_img-" + request.parent + ">" + request.target)
                                chrome.contextMenus.remove("tag_edit_bm-" + request.parent + ">" + request.target)
                                chrome.contextMenus.remove("tag_shot-" + request.parent + ">" + request.target)
                                chrome.contextMenus.remove("tag_term-" + request.parent + ">" + request.target)
                                chrome.contextMenus.remove("tag_url-" + request.parent + ">" + request.target)
                                sendResponse("ok")
                            }
                        })
                        return false
                    } else {
                        return true
                    }
                })
            } else if (request.type == "extend_tag") {
                console.log(request.name)
                taglist.every((element, idx) => {
                    if (element.name == request.name) {
                        sendResponse(element)
                        return false
                    } else {
                        return true
                    }
                })
            } else if (request.type == "add_child") {
                taglist = taglist.map((element, idx) => {
                    if (element.name == request.parent) {
                        let tmp = {}
                        tmp.name = request.target
                        tmp.children = []
                        element.children.push(tmp)
                        localStorage.setItem("taglist", JSON.stringify(taglist))
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_img-" + request.parent,
                            id: "tag_img-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                        });
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_url-" + request.parent,
                            id: "tag_url-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                        });
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_term-" + request.parent,
                            id: "tag_term-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                        });
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_shot-" + request.parent,
                            id: "tag_shot-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                        });
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_edit_bm-" + request.parent,
                            id: "tag_edit_bm-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                        });
                        chrome.contextMenus.create({
                            title: tmp.name,
                            parentId: "tag_yt-" + request.parent,
                            id: "tag_yt-" + request.parent + ">" + tmp.name,
                            contexts: ["all"],
                            documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
                        });
                        sendResponse('ok')
                        return element
                    } else {
                        return element
                    }
                })
            }
            return true
        })
        chrome.contextMenus.create({
            type: 'normal',
            title: 'Handle_data',
            id: 'root',
            contexts: ['selection', 'image', 'link']
        });
        //for image
        chrome.contextMenus.create({
            title: "儲存image",
            parentId: "root",
            id: "save_img",
            contexts: ["image"],
        });
        //for link
        chrome.contextMenus.create({
            title: "儲存連結",
            parentId: "root",
            id: "save_url",
            contexts: ["link"],
        });
        //for selection text
        chrome.contextMenus.create({
            title: '儲存 "%s"',
            parentId: "root",
            id: "term",
            contexts: ["selection"],
        });
        //screenshot
        chrome.contextMenus.create({
            title: 'snapshot',
            id: 'snapshot',
            contexts: ['all']
        })
        //bookmark
        chrome.contextMenus.create({
            title: '新增書籤',
            id: 'edit_bm',
            visible: true,
            contexts: ['all']
        })

        chrome.contextMenus.create({
            title: '移除書籤',
            id: 'del_bm',
            visible: false,
            contexts: ['all']
        })

        //utube video
        chrome.contextMenus.create({
            title: '收藏影片',
            id: 'collect_youtube',
            contexts: ['all'],
            documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
        })
        //handle all videos
        chrome.contextMenus.create({
            title: "全選",
            id: "yt_clickall",
            contexts: ["all"],
            documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
        })
        chrome.contextMenus.create({
            title: "取消全選",
            id: "yt_cancelall",
            contexts: ["all"],
            documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
        })
        taglist.forEach((item, idx) => {
            let key = item.name
            chrome.contextMenus.create({
                title: key,
                parentId: "save_img",
                id: "tag_img-" + key,
                contexts: ["all"],
            });
            chrome.contextMenus.create({
                title: key,
                parentId: "save_url",
                id: "tag_url-" + key,
                contexts: ["all"],
            });
            chrome.contextMenus.create({
                title: key,
                parentId: "term",
                id: "tag_term-" + key,
                contexts: ["all"],
            });
            chrome.contextMenus.create({
                title: key,
                parentId: "snapshot",
                id: "tag_shot-" + key,
                contexts: ["all"],
            });
            chrome.contextMenus.create({
                title: key,
                parentId: "edit_bm",
                id: "tag_edit_bm-" + key,
                contexts: ["all"],
            });
            chrome.contextMenus.create({
                title: key,
                parentId: "collect_youtube",
                id: "tag_yt-" + key,
                contexts: ["all"],
                documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
            });
            item.children.forEach(item => {
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_img-" + key,
                    id: "tag_img-" + key + ">" + item.name,
                    contexts: ["all"],
                });
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_url-" + key,
                    id: "tag_url-" + key + ">" + item.name,
                    contexts: ["all"],
                });
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_term-" + key,
                    id: "tag_term-" + key + ">" + item.name,
                    contexts: ["all"],
                });
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_shot-" + key,
                    id: "tag_shot-" + key + ">" + item.name,
                    contexts: ["all"],
                });
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_edit_bm-" + key,
                    id: "tag_edit_bm-" + key + ">" + item.name,
                    contexts: ["all"],
                });
                chrome.contextMenus.create({
                    title: item.name,
                    parentId: "tag_yt-" + key,
                    id: "tag_yt-" + key + ">" + item.name,
                    contexts: ["all"],
                    documentUrlPatterns: ["https://*.youtube.com/*", "https://www.google.com/*"]
                });
            })
        });
    });
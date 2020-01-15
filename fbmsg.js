//facebook messenger
(function() {
    'use strict';
    var idstart = document.cookie.indexOf("c_user=")
    var tmp1 = document.cookie.slice(idstart + 7)
    var idend = tmp1.indexOf(";")
    var user_id = tmp1.slice(0, idend) //取得FB user_id

    function save_data(data, cb) { //send message to cors_req
        chrome.runtime.sendMessage({
            type: 'save_data',
            data: data,
            db_name: 'fbmsg'
        }, function(r) {
            cb(r)
        })
    }

    function date2str(dy) { //date to 14碼 formate
        let y = dy.getFullYear() + ''
        let m = (dy.getMonth() + 1) < 10 ? '0' + (dy.getMonth() + 1) : '' + (dy.getMonth() + 1)
        let d = dy.getDate() < 10 ? '0' + dy.getDate() : '' + dy.getDate()
        let h = dy.getHours() < 10 ? '0' + dy.getHours() : '' + dy.getHours()
        let min = dy.getMinutes() < 10 ? '0' + dy.getMinutes() : '' + dy.getMinutes()
        let s = dy.getSeconds() < 10 ? '0' + dy.getSeconds() : '' + dy.getSeconds()
        return y + m + d + h + min + s
    }

    function get_timerecord(user_id, friend_id, cb) { //取得最後一筆聊天紀錄的時間
        let q = "@user_id:=" + user_id + ",@friend_id:=" + friend_id + ",@type:=timerecord"
        chrome.runtime.sendMessage({
            type: 'query_nudb',
            query: q,
            db: 'fbmsg',
            and_match: 1
        }, rst => {
            console.log(rst.result)
            cb(rst.result.recs[0].rec.timestamp)
        })
    }

    function insert_timestamp(user_id, friend_id, timestamp) { //儲存聊天紀錄的時間
        let data = {
            user_id: user_id,
            friend_id: friend_id,
            timestamp: timestamp,
            type: "timerecord"
        }
        save_data(data, r => {
            console.log(r)
        })
    }

    function record_timestamp(user_id, friend_id, timestamp) {
        let q = "@user_id:=" + user_id + ",@friend_id:=" + friend_id + ",@type:=timerecord"
        chrome.runtime.sendMessage({ //取得最後訊息的時間
            type: 'query_nudb',
            query: q,
            db: 'fbmsg',
            and_match: 1
        }, rst => {
            if (rst.result.cnt) {
                let newtime = parseInt(timestamp) //新訊息的時間
                let oldtime = parseInt(rst.result.recs[0].rec.timestamp) //取得的訊息時間
                if (newtime > oldtime) { //若資料的時間比最後一次紀錄的時間新，則更新時間紀錄
                    insert_timestamp(user_id, friend_id, timestamp)
                }
            } else { //若不存在時間紀錄，則直接儲存
                insert_timestamp(user_id, friend_id, timestamp)
            }
        })
    }

    function check_exist(user_id, friend_id, cb) { //檢查是否備份過這份聊天紀錄
        let q = "@user_id:=" + user_id + ",@friend_id:=" + friend_id + ",@type:=timerecord"
        chrome.runtime.sendMessage({
            type: 'query_nudb',
            query: q,
            db: 'fbmsg',
            and_match: 1
        }, r => {
            console.log(r)
            cb(r.result.cnt)
        })
    }

    function handle_msglist(list, user_id, friend_id) {
        let msg_list = list.map((item, idx) => {
            let last_time_stamp = JSON.parse(item.dataset.store).timestamp
            let unixTimestamp = new Date(last_time_stamp)
            let data = {}
            data.timestamp = last_time_stamp
            data.user_id = user_id
            data.friend_id = friend_id
            data.speaker = JSON.parse(item.dataset.store).author //訊息發送者
            data.time = date2str(unixTimestamp) //發送時間
            data.message = $(item).find('._34ej').length == 0 ? "" : $(item).find('._34ej')[0].innerText
            if (data.message == "" && $(item).find("._4o57").length != 0) {
                data.message = $(item).find("._4o57")[0].innerText
            }
            if ($(item).find("._24e1").length) {
                let share_body = $(item).find("._24e1")[0]
                data.news_img = $(share_body).find('._2sxw').length == 0 ? "" : $(share_body).find('._2sxw')[0].style.backgroundImage.slice(5, -2) //新聞圖片
                data.news_title = $(share_body).find('header h3').length == 0 ? "" : $(share_body).find('header h3')[0].innerText //新聞標題
                data.news_from = $(share_body).find('header h4').length == 0 ? "" : $(share_body).find('header h4')[0].innerText //新聞來源
                data.news_content = $(share_body).find('._2rbw').lenght == 0 ? "" : $(share_body).find('._2rbw')[0].innerText //部分內容
                data.news_link = $(share_body).find('._4qxt').length == 0 ? "" : $(share_body).find('._4qxt')[0].href //新聞連結
            }
            data.msg_link = $(item).find('._34ej a').length == 0 ? "" : $(item).find('._34ej a')[0].href
            if ($(item).find(".messageAttachments").eq(0).children("img").length) { //貼圖
                data.sticker = $(item).find(".messageAttachments").eq(0).children('img')[0].src
                data.sticker_alt = $(item).find(".messageAttachments").eq(0).children('img')[0].alt
            }
            if ($(item).find("[data-sigil='inlineVideo']").length) { //影片
                let videobody = JSON.parse($(item).find("[data-sigil='inlineVideo']")[0].dataset.store)
                data.video = videobody.src.replace("\\", "")
            }
            if ($(item).find("article").length) { //文章
                data.article_text = $(item).find("article ._5rgt").length == 0 ? "" : $(item).find("article ._5rgt")[0].innerHTML
                data.article_from = $(item).find("article header h3 a").length == 0 ? "" : $(item).find("article header h3 a")[0].innerText
                data.article_fromURL = $(item).find("article header h3 a").length == 0 ? "" : $(item).find("article header h3 a")[0].href
                data.article_url = $(item).find("article header [data-sigil='m-feed-voice-subtitle'] a").length == 0 ? "" : $(item).find("article header [data-sigil='m-feed-voice-subtitle'] a")[0].href
            }
            if ($(item).find(".title").length) { //檔案
                data.filename = $(item).find(".title")[0].innerText
                data.fileurl = $(item).find(".title")[0].href
            }
            data.audio = $(item).find("audio source").length == 0 ? "" : $(item).find("audio source")[0].src //錄音
            data.photo = $(item).find("._675,._674").map((idx, item) => { //照片
                let img = item.style.backgroundImage
                let src = img.slice(5, -2)
                if (src.length == 0) {
                    src = item.src
                }
                return src
            }).get()
            if ($(item).find("._4kk6").length) { //來電紀錄
                data.phone_call = $(item).find("._4kk6")[0].parentNode.innerText
            }
            if ($(item).find("._4o50").length) { //定位地點連結
                data.location = $(item).find("._4o50")[0].href
            }
            data.type = 'msg'
            save_data(data, r => {
                console.log(r)
            })
            return data
        })
        return msg_list
    }

    function get_oldmsg(user_id, friend_id, url) { //取得舊訊息
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url
        }, r => {
            let msglist = $(r).find("div[data-store*='timestamp']").get()
            handle_msglist(msglist, user_id, friend_id)
            if ($(r).find('#see_older').length) {
                let oldbtn = $(r).find('#see_older a')[0]
                let oldurl = 'https://m.facebook.com' + $(oldbtn).attr('href').replace('www', 'm') //使用手機板連結
                get_oldmsg(user_id, friend_id, oldurl)
            }
        })
    }

    function get_msg(type, user_id, friend_id) {
        let msgurl
        if (type == 0) {
            msgurl = "https://m.facebook.com/messages/read/?tid=cid.c." + user_id + encodeURIComponent(":") + friend_id
        } else {
            msgurl = "https://m.facebook.com/messages/read/?tid=cid.g." + friend_id
        }
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: msgurl
        }, r => {
            let check = $(r).find("#root")[0].firstChild
            if (check.innerText == "新訊息" || check.innerText == 'New Message') {
                msgurl = "https://m.facebook.com/messages/read/?tid=cid.c." + friend_id + encodeURIComponent(":") + user_id
                chrome.runtime.sendMessage({
                    type: 'send_req',
                    url: msgurl
                }, rsp => {
                    let name = $(rsp).find("#root")[0].firstChild
                    if (name.innerText != "新訊息" || check.innerText == 'New Message') {
                        let old_btn = $(rsp).find('#see_older a') //尋找上一頁按鈕
                        let msglist = $(rsp).find("div[data-store*='timestamp']").get()
                        handle_msglist(msglist, user_id, friend_id)
                        let n = msglist.length
                        let lastmsg = JSON.parse(msglist[n - 1].dataset.store).timestamp
                        record_timestamp(user_id, friend_id, lastmsg)
                        if (old_btn.length) {
                            let old_url = $(rsp).find('#see_older a')[0].href.replace('www', 'm')
                            get_oldmsg(user_id, friend_id, old_url)
                        }
                    }
                })
            } else {
                let old_btn = $(r).find('#see_older a') //尋找上一頁按鈕
                let msglist = $(r).find("div[data-store*='timestamp']").get()
                handle_msglist(msglist, user_id, friend_id)
                let n = msglist.length
                let lastmsg = JSON.parse(msglist[n - 1].dataset.store).timestamp
                record_timestamp(user_id, friend_id, lastmsg)
                if (old_btn.length) {
                    let old_url = $(r).find('#see_older a')[0].href.replace('www', 'm')
                    get_oldmsg(user_id, friend_id, old_url)
                }
            }
        });
    }

    function get_newer(user_id, friend_id, url, callback) {
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url
        }, r => {
            let name = $(r).find("#root")[0].firstChild
            if (name.innerText != "新訊息" || check.innerText == 'New Message') {
                let old_btn = $(r).find('#see_newer a')
                let msglist = $(r).find("div[data-store*='timestamp']").get().slice(1)
                handle_msglist(msglist, user_id, friend_id)
                if (old_btn.length) {
                    let next_url = $(r).find('#see_newer a')[0].href.replace('www', 'm')
                    get_newer(user_id, friend_id, next_url, (list) => {
                        callback(list.concat(msglist))
                    })
                } else {
                    callback(msglist)
                }
            }
        })
    }

    function get_new_msg(type, user_id, friend_id, callback) { //取得指定時間後的聊天紀錄
        get_timerecord(user_id, friend_id, (timestamp) => {
            let msgurl
            if (type == 0) {
                msgurl = "https://m.facebook.com/messages/read/?tid=cid.c." + user_id + encodeURIComponent(":") + friend_id + "&first_message_timestamp=" + timestamp //從timestamp開始
            } else {
                msgurl = "https://m.facebook.com/messages/read/?tid=cid.g." + friend_id + "&first_message_timestamp=" + timestamp
            }
            chrome.runtime.sendMessage({
                type: 'send_req',
                url: msgurl
            }, r => {
                let check = $(r).find("#root")[0].firstChild
                if (check.innerText == "新訊息" || check.innerText == 'New Message') { //url找不到聊天紀錄
                    msgurl = "https://m.facebook.com/messages/read/?tid=cid.c." + friend_id + encodeURIComponent(":") + user_id + "&first_message_timestamp=" + timestamp
                    chrome.runtime.sendMessage({
                        type: 'send_req',
                        url: msgurl
                    }, rsp => {
                        let name = $(rsp).find("#root")[0].firstChild
                        if (name.innerText != "新訊息" || check.innerText == 'New Message') {
                            let old_btn = $(rsp).find('#see_newer a')
                            let msglist = $(rsp).find("div[data-store*='timestamp']").get().slice(1) //第一筆紀錄已儲存
                            handle_msglist(msglist, user_id, friend_id)
                            if (old_btn.length) {
                                let next_url = $(rsp).find('#see_newer a')[0].href.replace('www', 'm')
                                get_newer(user_id, friend_id, next_url, (list) => { //下一層新訊息
                                    callback(list.concat(msglist))
                                })
                            } else {
                                callback(msglist)
                            }
                        }
                    })
                } else {
                    let old_btn = $(r).find('#see_newer a')
                    let msglist = $(r).find("div[data-store*='timestamp']").get().slice(1)
                    handle_msglist(msglist, user_id, friend_id)
                    if (old_btn.length && msglist.length) {
                        let next_url = $(r).find('#see_newer a')[0].href.replace('www', 'm')
                        get_newer(user_id, friend_id, next_url, (list) => {
                            callback(msglist.concat(list))
                        })
                    } else {
                        callback(msglist)
                    }
                }
            });
        })
    }

    function handle_member_item(href, user_id) { //取得群組成員
        return new Promise(function(resolve, reject) {
            if (href.indexOf("?id=") != -1) {
                let start = href.indexOf("?id=")
                let end = href.indexOf("&")
                resolve(href.slice(start + 4, end))
            } else {
                chrome.runtime.sendMessage({
                    type: 'send_req',
                    url: href.replace("www", "mbasic")
                }, r => {
                    let head = $(r).find("a[href*='messages/thread/']")
                    if (head.length) {
                        let start = head[0].href.indexOf("messages/thread/")
                        let end = head[0].href.indexOf("/?")
                        resolve(head[0].href.slice(start + 16, end))
                    } else {
                        resolve(user_id)
                    }
                })
            }
        })
    }

    async function getmember(user_id, gid) { //透過user_id找出用戶名
        let url = "https://m.facebook.com/messages/participants/?tid=cid.g." + gid
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url
        }, async r => {
            let thread_name = await $(r).find("input[name='thread_name']")[0].value
            let mem_list = await $(r).find(".item a")
            let members = await mem_list.map((idx, item) => {
                let data = {}
                data.name = $(item).find('.title')[0].innerText
                let href = item.href
                handle_member_item(href, user_id).then(uid => {
                    data.id = JSON.stringify(uid).slice(1, -1)
                })
                return data
            }).get()
            let grpinfo = {
                'gid': gid,
                'gname': thread_name,
                'memberlist': members
            }
            save_data(grpinfo, r => {
                console.log(r)
            })
        })
    }
    window.addEventListener("load", function(event) {
        if ($('._59v1').length) {
            $('._59v1').bind('DOMNodeInserted', function(e) {
                if ($(e.target).attr('class') != undefined) {
                    if ($(e.target).attr('class').indexOf("fantaTabMain-user:") != -1 || $(e.target).attr('class').indexOf("fantaTabMain-thread:") != -1) {
                        let type = $(e.target).attr('class').indexOf("fantaTabMain-thread:") != -1 ? 1 : 0
                        let class_arr = $(e.target).attr('class').split(" ")
                        let n = class_arr.length
                        let startat = class_arr[n - 1].indexOf(":")
                        let friend_id = class_arr[n - 1].slice(startat + 1) //取得聊天對象ID
                        if (type == 1) {
                            getmember(user_id, friend_id)
                        }
                        check_exist(user_id, friend_id, (flag) => { //確認是否已備份
                            if (flag == 0) { //y
                                get_msg(type, user_id, friend_id)
                            } else { //n
                                get_new_msg(type, user_id, friend_id, (list) => {
                                    let n = list.length
                                    if (n) {
                                        let lastmsg = JSON.parse(list[n - 1].dataset.store).timestamp
                                        record_timestamp(user_id, friend_id, lastmsg)
                                    }
                                })
                            }
                        })
                    } else if ($(e.target).attr('class').indexOf("_5qi9") != -1) {
                        let type = $(e.target).find('._3_9e').eq(0).attr('class').indexOf("fantaTabMain-thread:") != -1 ? 1 : 0
                        let class_arr = $(e.target).find('._3_9e').eq(0).attr('class').split(" ")
                        let n = class_arr.length
                        let startat = class_arr[n - 1].indexOf(":")
                        let friend_id = class_arr[n - 1].slice(startat + 1)
                        if (type == 1) {
                            getmember(user_id, friend_id)
                        }
                        check_exist(user_id, friend_id, (flag) => {
                            if (flag == 0) {
                                get_msg(type, user_id, friend_id)
                            } else {
                                get_new_msg(type, user_id, friend_id, (list) => {
                                    let n = list.length
                                    if (n) {
                                        let lastmsg = JSON.parse(list[n - 1].dataset.store).timestamp
                                        record_timestamp(user_id, friend_id, lastmsg)
                                    }
                                })
                            }
                        })
                    }
                }
            })
        } else {
            $('#ChatTabsPagelet .fbNubGroup .fbNubGroup').bind('DOMNodeInserted', function(e) {
                if ($('._5qi9').length) {
                    if ($(e.target).attr('class') != undefined) {
                        if ($(e.target).attr('class').indexOf("fantaTabMain-user:") != -1 || $(e.target).attr('class').indexOf("fantaTabMain-thread:") != -1) {
                            let type = $(e.target).attr('class').indexOf("fantaTabMain-thread:") != -1 ? 1 : 0
                            let class_arr = $(e.target).attr('class').split(" ")
                            let n = class_arr.length
                            let start = class_arr[n - 1].indexOf(":")
                            let friend_id = class_arr[n - 1].slice(start + 1)
                            if (type == 1) {
                                getmember(user_id, friend_id)
                            }
                            check_exist(user_id, friend_id, (flag) => {
                                if (flag == 0) {
                                    get_msg(type, user_id, friend_id)
                                } else {
                                    get_new_msg(type, user_id, friend_id, (list) => {
                                        let n = list.length
                                        if (n) {
                                            let lastmsg = JSON.parse(list[n - 1].dataset.store).timestamp
                                            record_timestamp(user_id, friend_id, lastmsg)
                                        }
                                    })
                                }
                            })
                        } else if ($(e.target).find('._3_9e').length) {
                            let type = $(e.target).find('._3_9e').eq(0).attr('class').indexOf("fantaTabMain-thread:") != -1 ? 1 : 0
                            let class_arr = $(e.target).find('._3_9e').eq(0).attr('class').split(" ")
                            let n = class_arr.length
                            let startat = class_arr[n - 1].indexOf(":")
                            let friend_id = class_arr[n - 1].slice(startat + 1)
                            if (type == 1) {
                                getmember(user_id, friend_id)
                            }
                            check_exist(user_id, friend_id, (flag) => {
                                if (flag == 0) {
                                    get_msg(type, user_id, friend_id)
                                } else {
                                    get_new_msg(type, user_id, friend_id, (list) => {
                                        let n = list.length
                                        if (n) {
                                            let lastmsg = JSON.parse(list[n - 1].dataset.store).timestamp
                                            record_timestamp(user_id, friend_id, lastmsg)
                                        }
                                    })
                                }
                            })
                        }
                    }
                }
            })
        }
        $('body').bind("DOMNodeInserted", function(e) {
            try {
                if ($(e.target)[0].className.indexOf('newdata') != -1) {
                    let data = JSON.parse($(e.target)[0].innerText)
                    console.log(data)
                    save_data(data, r => {
                        console.log(r)
                        record_timestamp(data.user_id, data.friend_id, data.timestamp)
                        $(e.target)[0].remove()
                    })
                }
            } catch (e) {
                console.log(e)
            }
        })
    })
    var scriptString = function() { //websocket logger
        if (window.Proxy == undefined) return;
        var oldWS = window.WebSocket;
        var loggerIncrement = 1;

        function Utf8ArrayToStr(array) {
            var out, i, len, c;
            var char2, char3;
            out = "";
            len = array.length;
            i = 0;
            while (i < len) {
                c = array[i++];
                switch (c >> 4) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        // 0xxxxxxx
                        out += String.fromCharCode(c);
                        break;
                    case 12:
                    case 13:
                        // 110x xxxx 10xx xxxx
                        char2 = array[i++];
                        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                        break;
                    case 14:
                        // 1110 xxxx 10xx xxxx 10xx xxxx
                        char2 = array[i++];
                        char3 = array[i++];
                        out += String.fromCharCode(((c & 0x0F) << 12) |
                            ((char2 & 0x3F) << 6) |
                            ((char3 & 0x3F) << 0));
                        break;
                }
            }

            return out;
        }

        var proxyDesc = {
            set: function(target, prop, val) {
                if (prop == 'onmessage') { //收到訊息時
                    var oldMessage = val;
                    val = function(e) {
                        let arr = new Uint8Array(e.data)
                        let datastr = Utf8ArrayToStr(arr)
                        let start = datastr.indexOf("deltas")
                        let data = {}
                        try {
                            var idstart = document.cookie.indexOf("c_user=")
                            var tmp1 = document.cookie.slice(idstart + 7)
                            var idend = tmp1.indexOf(";")
                            var user_id = tmp1.slice(0, idend) //fb user id
                            let msg = datastr[start - 2] == '{' ? JSON.parse(datastr.slice(start - 2)).deltas : JSON.parse("{" + datastr.slice(start - 1)).deltas
                            if (msg[0].class == "NewMessage" || msg[0].class == "AdminTextMessage") { //確認是否為聊天訊息
                                data.text = msg[0].hasOwnProperty('body') == true ? msg[0].body : ""
                                if (data.text == "" && msg[0].class == "AdminTextMessage") {
                                    data.text = msg[0].messageMetadata.adminText
                                }
                                data.speaker = msg[0].messageMetadata.actorFbId
                                data.timestamp = msg[0].messageMetadata.timestamp
                                data.user_id = user_id
                                if (msg[0].messageMetadata.threadKey.hasOwnProperty('otherUserFbId')) { //朋友聊天
                                    data.friend_id = msg[0].messageMetadata.threadKey.otherUserFbId
                                } else if (msg[0].messageMetadata.threadKey.hasOwnProperty('threadFbId')) { //群組聊天
                                    data.friend_id = msg[0].messageMetadata.threadKey.threadFbId
                                }
                                let str = new Date(parseInt(msg[0].messageMetadata.timestamp))
                                data.time = date2str(str)
                                if (msg[0].attachments.length) {
                                    if (msg[0].attachments[0].mercury.hasOwnProperty('sticker_attachment')) { //貼圖
                                        data.sticker = msg[0].attachments[0].mercury.sticker_attachment.url
                                        data.sticker_alt = msg[0].attachments[0].mercury.sticker_attachment.label
                                    }
                                    if (msg[0].attachments[0].mercury.hasOwnProperty('blob_attachment')) {
                                        if (msg[0].attachments[0].mercury.blob_attachment.__typename == 'MessageAudio') { //錄音
                                            data.audio = msg[0].attachments[0].mercury.blob_attachment.playable_url
                                        } else if (msg[0].attachments[0].mercury.blob_attachment.__typename == 'MessageFile') { //檔案
                                            data.file_list = msg[0].attachments.map((item, idx) => {
                                                let info = {}
                                                info.filename = item.mercury.blob_attachment.filename
                                                info.fileurl = item.mercury.blob_attachment.url
                                                return info
                                            })
                                        } else if (msg[0].attachments[0].mercury.blob_attachment.__typename == 'MessageImage') { //圖片
                                            data.photo = msg[0].attachments.map((item, idx) => {
                                                return item.mercury.blob_attachment.preview.uri
                                            })
                                        } else if (msg[0].attachments[0].mercury.blob_attachment.__typename == 'MessageVideo') { //影片
                                            data.video = msg[0].attachments[0].mercury.blob_attachment.playable_url
                                        }
                                    }
                                    if (msg[0].attachments[0].mercury.hasOwnProperty('extensible_attachment')) { //定位訊息、外部連結訊息、文章
                                        if (msg[0].attachments[0].mercury.extensible_attachment.hasOwnProperty('story_attachment')) {
                                            let story_attach = msg[0].attachments[0].mercury.extensible_attachment.story_attachment
                                            if (story_attach.target.__typename == "MessageLocation") {
                                                data.location = msg[0].attachments[0].mercury.extensible_attachment.story_attachment.url
                                            } else if (story_attach.target.__typename == "ExternalUrl") {
                                                data.news_title = story_attach.title_with_entities.text
                                                data.news_from = story_attach.source.text
                                                data.news_content = story_attach.description.text
                                                data.news_link = story_attach.url
                                                data.news_img = story_attach.media.image.uri
                                            } else if (story_attach.target.__typename == "Story") {
                                                data.article_text = story_attach.description.text
                                                data.article_from = story_attach.source.text
                                                data.article_fromURL = story_attach.target.actors.url
                                                data.article_url = story_attach.url
                                            }
                                        }
                                    }
                                }
                                if (data.hasOwnProperty('timestamp')) { //將訊息內容隱藏於頁面中等待處理
                                    let newnode = document.createElement("div")
                                    newnode.setAttribute("class", "newdata")
                                    newnode.setAttribute("style", "display:none")
                                    newnode.innerText = JSON.stringify(data)
                                    document.body.appendChild(newnode)
                                }
                            }
                        } catch (err) {
                            console.log(err)
                        }
                        oldMessage(e);
                    }
                }
                return target[prop] = val;
            },
            get: function(target, prop) {
                var val = target[prop];
                if (prop == 'send') val = function(data) {
                    target.send(data);
                };
                else if (typeof val == 'function') val = val.bind(target);
                return val;
            }
        };
        WebSocket = new Proxy(oldWS, {
            construct: function(target, args, newTarget) {
                var obj = new target(args[0]);
                obj.WSLoggerId = loggerIncrement++;
                return new Proxy(obj, proxyDesc);
            }
        });
    }

    var observer = new MutationObserver(async function() {
        if (document.head) {
            observer.disconnect();
            var script = document.createElement('script');
            script.crossorigin = "anonymous"
            script.innerHTML = await '(' + scriptString + ')();';
            document.head.appendChild(script);
            script.remove();
        }
    });
    observer.observe(document, {
        subtree: true,
        childList: true
    });
})()
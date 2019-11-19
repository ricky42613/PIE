(function () {
    'use strict';
    let lang = ""
    let my_week_table = {
        '星期日': 0,
        '星期一': 1,
        '星期二': 2,
        '星期三': 3,
        '星期四': 4,
        '星期五': 5,
        '星期六': 6,
    }
    let my_week_table_en = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
    }
    let my_month_table = {
        'Jan': '01',
        'Feb': '02',
        'Mar': '03',
        'Apr': '04',
        'May': '05',
        'Jun': '06',
        'Jul': '07',
        'Aug': '08',
        'Sep': '09',
        'Oct': '10',
        'Nov': '11',
        'Dec': '12',
    }
    

    function date2str(dy) {
        let y = dy.getFullYear() + ''
        let m = (dy.getMonth() + 1) < 10 ? '0' + (dy.getMonth() + 1) : '' + (dy.getMonth() + 1)
        let d = dy.getDate() < 10 ? '0' + dy.getDate() : '' + dy.getDate()
        let h = dy.getHours() < 10 ? '0' + dy.getHours() : '' + dy.getHours()
        let min = dy.getMinutes() < 10 ? '0' + dy.getMinutes() : '' + dy.getMinutes()
        let s = dy.getSeconds() < 10 ? '0' + dy.getSeconds() : '' + dy.getSeconds()
        return y + m + d + h + min + s
    }

    function b64DecodeUnicode(str) { //decode base64
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    function save_data(data, cb) {
        chrome.runtime.sendMessage({
            type: 'save_data',
            data: data,
            db_name: 'fb_post'
        }, function (r) {
            cb(r)
        })
    }

    function convertImgToBase64(url, callback, outputFormat) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            img = new Image;
        img.crossOrigin = 'Anonymous'; //它开启了本地的跨域允许。当然服务器存储那边也要开放相应的权限才行，如果是设置了防盗链的图片在服务端就没有相应的权限的话你本地端开启了权限也是没有用的
        img.onload = function () {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL(outputFormat || 'image/png'); //没权限的跨域图片在使用canvas.toDataURL()数据导出时会报错
            callback.call(this, dataURL);
            canvas = null;
        };
        img.src = url;
    }

    function getname(name) { //get fb user_id
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    function getActionList(reaction_url, type) { // 取得各種情緒名單
        return new Promise(function (resolve, reject) {
            let url = reaction_url + '&limit=1000&reaction_type=' + type + '&total_count=28475' //limit控制資料量、total_count必要欄位但不重要
            let newurl = url.replace("browser/", "browser/fetch")
            chrome.runtime.sendMessage({
                type: 'send_req',
                url: newurl.replace("www", "mbasic")
            }, async r => {
                let list = $(r).find("li h3 a")
                if (list.length) {
                    let reaction_list = await list.map((idx, item) => {
                        let data = {}
                        data.name = item.innerText
                        data.href = item.href
                        return data
                    }).get()
                    resolve(reaction_list)
                } else {
                    resolve([])
                }
            })
        })
    }

    function filter_arr(cmt_array) { //過濾留言列表中上一頁按鈕和下一頁按鈕
        if (cmt_array[0].id.indexOf("see_prev") != -1) {
            cmt_array = cmt_array.slice(1)
        }
        let n = cmt_array.length
        if (cmt_array[n - 1].id.indexOf("see_next") != -1) {
            cmt_array = cmt_array.slice(0, n - 1)
        }
        return cmt_array
    }

    function morecomment(link, type, cb) { //取得下一頁留言
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: link
        }, r => {
            try {
                if (type == 1) {
                    let cmtlist = $(r).find("[id*='composer-']")[0].previousSibling.previousSibling.children //留言列表
                    let cmt_array = [...cmtlist]
                    let morelink = cmt_array[0].id.indexOf("see_prev") == -1 ? null : $(cmt_array[0]).find("a")[0].href
                    cmt_array = filter_arr(cmt_array)
                    if (morelink != null) {
                        morelink = morelink.replace("www", "mbasic")
                        morecomment(morelink, 1, (more_arr) => { //遞回往下取得更多留言
                            cb(more_arr.concat(cmt_array))
                        })
                    } else {
                        cb(cmt_array)
                    }
                } else {
                    let cmtlist = $(r).find("[id*='composer-']")[0].nextSibling.children //留言列表
                    let cmt_array = [...cmtlist]
                    let morelink = cmt_array[cmt_array.length - 1].id.indexOf("see_next") == -1 ? null : $(cmt_array[cmt_array.length - 1]).find("a")[0].href
                    cmt_array = filter_arr(cmt_array)
                    if (morelink != null) {
                        morelink = morelink.replace("www", "mbasic")
                        morecomment(morelink, 2, (more_arr) => { //遞回往下取得更多留言
                            cb(more_arr.concat(cmt_array))
                        })
                    } else {
                        cb(cmt_array)
                    }
                }
            } catch (err) {
                cb([])
            }
        })
    }

    function getcomment(link) { //取得第一層留言列表
        return new Promise(function (resolve, reject) {
            if (link.length) {
                chrome.runtime.sendMessage({
                    type: 'send_req',
                    url: link
                }, r => {
                    try {
                        if ($(r).find("#mobile_video_feed_pagelet").length == 0) {
                            if ($(r).find("[id*='composer-']")[0].nextSibling == null) { //下一層留言連結在留言列表頂部
                                let cmtlist = $(r).find("[id*='composer-']")[0].previousSibling.previousSibling.children
                                let cmt_array = [...cmtlist]
                                let morelink = cmt_array[0].id.indexOf("see_prev") == -1 ? null : $(cmt_array[0]).find("a")[0].href //上一層的留言列表連結
                                cmt_array = filter_arr(cmt_array)
                                if (morelink != null) {
                                    morelink = morelink.replace("www", "mbasic")
                                    morecomment(morelink, 1, (more_arr) => { //取得更舊的留言列表
                                        resolve(more_arr.concat(cmt_array))
                                    })
                                } else {
                                    resolve(cmt_array)
                                }
                            } else { //另一種留言格式(下一層連接再留言列表尾部)
                                let cmtlist = $(r).find("[id*='composer-']")[0].nextSibling.children
                                let cmt_array = [...cmtlist]
                                let morelink = cmt_array[cmt_array.length - 1].id.indexOf("see_next") == -1 ? null : $(cmt_array[cmt_array.length - 1]).find("a")[0].href //取得更舊的留言列表
                                cmt_array = filter_arr(cmt_array)
                                if (morelink != null) {
                                    morelink = morelink.replace("www", "mbasic")
                                    morecomment(morelink, 2, (more_arr) => { //取得更舊的留言列表
                                        resolve(more_arr.concat(cmt_array))
                                    })
                                } else {
                                    resolve(cmt_array)
                                }
                            }
                        } else { //貼文有影片時
                            let newbody = $(r).find("#mobile_injected_video_feed_pagelet")[0]
                            let newlink = $(newbody).find("a:contains('則留言'),a:contains('comments')")[0].href.replace("www", "mbasic") //取得留言列表連結
                            let cmt_array = getcomment(newlink)
                            resolve(cmt_array)
                        }
                    } catch (err) {
                        resolve([])
                    }
                })
            } else {
                resolve([])
            }
        })
    }

    function get_reply(link, target_id, cb) { //取得留言回覆列表
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: link
        }, r => {
            try {
                let replylist = $(r).find("#" + target_id)[0].nextSibling.children
                let reply_array = [...replylist]
                if (reply_array[0].id.indexOf("comment_replies_more") != -1) {
                    let morelink = $(reply_array[0].innnerHTML).find("a")[0].href.replace("www", "mbasic")
                    get_reply(morelink, target_id, (morelist) => {
                        cb(morelist.concat(reply_array))
                    })
                } else {
                    cb(reply_array)
                }
            } catch (err) {
                cb([])
            }
        })
    }

    function get_post_link(element, ft_ent, cb) { //組成貼文連結
        try {
            let grp = element.find('._7tae ._wpv')
            let href
            if (grp.length) { //群組文
                let end = grp[0].href.indexOf("?")
                let tmphref = grp[0].href.slice(0, end)
                href = tmphref + "permalink/" + ft_ent
            } else { //個人/粉專文
                let check_short = element.find('._7tae a')[0].href
                if (check_short.indexOf("profile.php") != -1) { //沒有設定短網址
                    let start = check_short.indexOf("?id=")
                    let end = check_short.indexOf("&")
                    let userid = check_short.slice(start + 4, end)
                    href = "https://www.facebook.com/permalink.php?story_fbid=" + ft_ent + "&id=" + userid
                } else { //有設定短網址
                    let end = check_short.indexOf("?")
                    let tmphref = check_short.slice(0, end)
                    if (tmphref[end - 1] == '/') {
                        href = tmphref + "posts/" + ft_ent
                    } else {
                        href = tmphref + "/posts/" + ft_ent
                    }
                }
            }
            cb(href)
        } catch (e) {
            cb("")
        }
    }

    function save_video(url, cb) { //文章影片連結
        let mbasic_url = url.replace("www", "mbasic")
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: mbasic_url
        }, r => {
            if ($(r).find("a[href*='/video_redirect/']").length) {
                let curvideo = $(r).find("a[href*='/video_redirect/']")[0].href
                let start = curvideo.indexOf("?src=")
                curvideo = curvideo.slice(start + 5)
                let video = decodeURIComponent(curvideo)
                cb(video)
            }
        })
    }

    function handletime_en(str){
        let time = new Date();
        var d2 = new Date(time);
        if (str.indexOf("Today") != -1 || str.indexOf("hours") != -1 || str.indexOf("minute") != -1 || str.indexOf("now") != -1) { //eX.15分鐘前 1小時前 剛剛
            let m = time.getMonth() + 1 < 10 ? '0' + (time.getMonth() + 1) : '' + (time.getMonth() + 1)
            let d = time.getDate() < 10 ? '0' + time.getDate() : '' + time.getDate()
            return time.getFullYear() + '' + m + '' + d + '000000'
        } else if (str.indexOf("Monday") != -1||str.indexOf("Tuesday") != -1||str.indexOf("Thursday") != -1||str.indexOf("Wednesday") != -1||str.indexOf("Thursday") != -1||str.indexOf("Friday") != -1||str.indexOf("Saturday") != -1||str.indexOf("Sunday") != -1) { //ex 星期一 15:30
            let curweek = time.getDay()
            let week = str.split(" ")[0]
            let dif = curweek - my_week_table_en[week]
            d2.setDate(d2.getDate() - dif);
            let m = d2.getMonth() + 1 < 10 ? '0' + (d2.getMonth() + 1) : '' + (d2.getMonth() + 1)
            let d = d2.getDate() < 10 ? '0' + d2.getDate() : '' + d2.getDate()
            return d2.getFullYear() + '' + m + '' + d + "000000"
        } else if (str.indexOf('Yesterday') != -1) { //ex昨天 8:30
            d2.setDate(d2.getDate() - 1);
            let m = d2.getMonth() + 1 < 10 ? '0' + (d2.getMonth() + 1) : '' + (d2.getMonth() + 1)
            let d = d2.getDate() < 10 ? '0' + d2.getDate() : '' + d2.getDate()
            return d2.getFullYear() + '' + m + '' + d + "000000"
        } else if (str.indexOf(',') != -1) { //ex 2015年8月30日
            let year = str.slice(-4)
            let month_idx = str.slice(0,3)
            let month = my_month_table[month_idx]
            let date =parseInt(str.slice(4))
            if (date< 10) {
                date = '0' + date
            }
            return year + '' + month + '' + date + "000000"
        } else { //7月28日
            let month_idx = str.slice(0, 3)
            let month = my_month_table[month_idx]
            let date = str.slice(4)
            if (date.length < 2) {
                date = '0' + date
            }
            return d2.getFullYear() + '' + month + '' + date + "000000"
        }
    }

    function handletime(str) { //估算大約時間點 need fix
        let time = new Date();
        var d2 = new Date(time);
        if (str.indexOf("今天") != -1 || str.indexOf("小時前") != -1 || str.indexOf("分鐘前") != -1 || str.indexOf("剛剛") != -1) { //eX.15分鐘前 1小時前 剛剛
            let m = time.getMonth() + 1 < 10 ? '0' + (time.getMonth() + 1) : '' + (time.getMonth() + 1)
            let d = time.getDate() < 10 ? '0' + time.getDate() : '' + time.getDate()
            return time.getFullYear() + '' + m + '' + d + '000000'
        } else if (str.indexOf("星期") != -1) { //ex 星期一 15:30
            let curweek = time.getDay()
            let start = str.indexOf("星期")
            let week = str.slice(start, start + 3)
            let dif = curweek - my_week_table[week]
            d2.setDate(d2.getDate() - dif);
            let m = d2.getMonth() + 1 < 10 ? '0' + (d2.getMonth() + 1) : '' + (d2.getMonth() + 1)
            let d = d2.getDate() < 10 ? '0' + d2.getDate() : '' + d2.getDate()
            return d2.getFullYear() + '' + m + '' + d + "000000"
        } else if (str.indexOf('昨天') != -1) { //ex昨天 8:30
            d2.setDate(d2.getDate() - 1);
            let m = d2.getMonth() + 1 < 10 ? '0' + (d2.getMonth() + 1) : '' + (d2.getMonth() + 1)
            let d = d2.getDate() < 10 ? '0' + d2.getDate() : '' + d2.getDate()
            return d2.getFullYear() + '' + m + '' + d + "000000"
        } else if (str.indexOf('年') != -1) { //ex 2015年8月30日
            let ystart = str.indexOf('年')
            let year = str.slice(0, ystart)
            let mstart = str.indexOf('月')
            let month = str.slice(ystart + 1, mstart)
            if (month.length < 2) {
                month = '0' + month
            }
            let dstart = str.indexOf('日')
            let date = str.slice(mstart + 1, dstart)
            if (date.length < 2) {
                date = '0' + date
            }
            return year + '' + month + '' + date + "000000"
        } else { //7月28日
            let mstart = str.indexOf('月')
            let month = str.slice(0, mstart)
            if (month.length < 2) {
                month = '0' + month
            }
            let dstart = str.indexOf('日')
            let date = str.slice(mstart + 1, dstart)
            if (date.length < 2) {
                date = '0' + date
            }
            return d2.getFullYear() + '' + month + '' + date + "000000"
        }
    }

    function get_reaciton_cnt(url, cb) { //取得各種情緒數量 讚、怒、哈、嗚、...
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url.replace("www", "mbasic")
        }, r => {
            //type:情緒種
            //cnt: 情緒量
            let links = $(r).find("a[href*='total_count'][role='button']")
            let reactions = links.map((idx, item) => {
                let data = {}
                let href = item.href
                let start = href.indexOf('total_count=')
                let tmp = href.slice(start + 12)
                data.cnt = parseInt(tmp)
                if (href.indexOf('type=') != -1) {
                    let tstart = href.indexOf('type=')
                    data.type = parseInt(href.slice(tstart + 5))
                } else {
                    data.type = 0
                }
                return data
            }).get()
            cb(reactions)
        })
    }

    function handle_cmt(cmt) { //處理"看過的"留言
        let subdata = {}
        let tmpr = $(cmt).find("[data-testid='UFI2Comment/root_depth_0']")[0]
        let id_info = JSON.parse($(tmpr).attr('data-ft'))
        let ct = id_info.ct
        let id_str = b64DecodeUnicode(ct)
        let brk = id_str.indexOf("_") //break point 格式 : {article_id}_{comment_id}
        subdata.articleID = id_str.slice(8, brk)
        subdata.speaker = $(cmt).find("._6qw4")[0].innerText
        subdata.content = $(cmt).find("[data-testid='UFI2Comment/root_depth_0'] ._3l3x").length == 0 ? "" : $(cmt).find("[data-testid='UFI2Comment/root_depth_0'] ._3l3x")[0].textContent
        subdata.media = $(cmt).find("[data-testid='UFI2Comment/root_depth_0'] ._4eeo img").map((i, img) => {
            return img.src
        }).get()
        let timeNode = $(cmt).find("[data-testid='UFI2Comment/root_depth_0'] ._6qw7")[0]
        let start = timeNode.href.indexOf("comment_id=") + 11
        subdata.commentID = timeNode.href.slice(start)
        let timestamp = $(timeNode).find("abbr")[0].dataset.utime * 1000
        let str = new Date(timestamp)
        subdata.time = date2str(str)
        subdata.type = "comment"
        return subdata
    }

    function handle_reply(reply) { //"看過的"留言回覆
        let reply_data = {}
        let tmpr = $(reply).find("[data-testid='UFI2Comment/root_depth_1']")[0]
        let id_info = JSON.parse($(tmpr).attr('data-ft'))
        let ct = id_info.ct
        let id_str = b64DecodeUnicode(ct)
        let brk = id_str.indexOf("_") //break point 格式 : {article_id}_{reply_id}
        reply_data.articleID = id_str.slice(8, brk)
        let timeNode = $(reply).find("[data-testid='UFI2Comment/root_depth_1'] ._6qw7")[0]
        let start = timeNode.href.indexOf("comment_id=") + 11
        let tmp_cmtid = timeNode.href.slice(start)
        let end = tmp_cmtid.indexOf("&")
        reply_data.commentID = tmp_cmtid.slice(0, end)
        reply_data.speaker = $(reply).find("._6qw4")[0].innerText
        reply_data.content = $(reply).find("._3l3x").length == 0 ? "" : $(reply).find("._3l3x")[0].innerText
        let time = $(reply).find("._6qw7 abbr")[0].dataset.utime * 1000
        let str = new Date(time)
        reply_data.media = $(reply).find("._2txe img").map((idx, item) => {
            return item.src
        }).get()
        reply_data.time = date2str(str)
        reply_data.type = "reply"
        return reply_data
    }

    async function get_post(element, c_user, cb) { //處理貼文
        if (element.find('.userContentWrapper').length == 0) {
            let ft_ent = element.find('input[name="ft_ent_identifier"]').eq(0).attr('value') //articleID
            let permission = element.find('div[data-hover="tooltip"],a[data-hover="tooltip"]').eq(0).attr('aria-label') //貼文權限
            let content = 0 == element.find('div[data-testid="post_message"]').length ? "" : element.find('div[data-testid="post_message"]')[0].textContent
            let author = element.find('img').eq(0).attr('aria-label')
            let reaction_url = 'https://www.facebook.com/ufi/reaction/profile/browser/?ft_ent_identifier=' + ft_ent + '&av=' + c_user
            let data = {
                articleID: ft_ent,
                permission: permission,
                content: content,
                author: author,
            }
            let post_frame = element.closest("._5jmm")
            if ($(post_frame)[0].dataset.hasOwnProperty('timestamp')) {
                let post_timestamp = parseInt($(post_frame)[0].dataset.timestamp) * 1000
                let unixTimestamp = new Date(post_timestamp)
                data.post_date = date2str(unixTimestamp) //發文時間
            } else if ($(post_frame)[0].dataset.hasOwnProperty('time')) {
                let post_timestamp = parseInt($(post_frame)[0].dataset.time) * 1000
                let unixTimestamp = new Date(post_timestamp)
                data.post_date = date2str(unixTimestamp) //發文時間
            }
            let curcmtlist = await $(element).find("._7791").children("li").map((idx, cmt) => { //已展開的留言列表
                let subdata = handle_cmt(cmt)
                let cur_replys = $(cmt).find("[data-testid='UFI2CommentsList/root_depth_1'] > ul > li").map((index, reply) => {
                    let reply_data = handle_reply(reply)
                    return reply_data
                }).get()
                save_data(cur_replys, r => {
                    console.log(r)
                })
                return subdata
            }).get()
            get_post_link(element, ft_ent, (url) => { //文章連結
                data.post_link = url
                if (url.length != 0 && element.find("video").length != 0) {
                    save_video(url, (video) => {
                        data.video_link = video
                        console.log(video)
                    })
                }
            })
            element.find('._3x-2 img').map((idx, item) => {
                let info = {}
                info.src = item.src
                info.articleID = data.articleID
                info.type = "posts_img"
                convertImgToBase64(item.src, function (base64Img) {
                    info.img64 = base64Img
                    console.log(info)
                    save_data(info, r => {
                        console.log(r)
                    })
                })
            }).get() //handle normal image

            element.find('._3chq').map((idx, item) => {
                let info = {}
                info.src = item.src
                info.articleID = data.articleID
                info.type = "posts_img"
                convertImgToBase64(item.src, function (base64Img) {
                    info.img64 = base64Img
                    console.log(info)
                    save_data(info, r => {
                        console.log(r)
                    })
                })
            }).get() //handle video image
            data.type = "posts"
            if (element.find('._5r69').length) {
                //share
                let share = element.find('._5r69')[0].innerHTML
                let str = JSON.stringify({
                    "tn": "C"
                })
                let from = $(share).find("[data-ft*='" + str + "']")
                data.from = from[0].innerText //被分享文章作者
                data.from_link = from[0].href //作者連結
                if ($(share).find('div[data-testid="post_message"] .hidden_elem').length != 0) {
                    data.shareContent = $(share).find('div[data-testid="post_message"] .hidden_elem')[0].innerHTML
                } else if ($(share).find('div[data-testid="post_message"]').length != 0) {
                    data.shareContent = $(share).find('div[data-testid="post_message"]')[0].innerHTML
                }
                data.sharePermission = $(share).find('.fbStreamPrivacy').eq(0).attr('aria-label') //被分享文章權限
            }
            if (element.find('._3ekx').length && element.find('._3ekx')[0].innerText != "") {
                //外部連結 ex新聞
                let news = element.find('._3ekx')[0].innerHTML
                data.Newsfrom = $(news).find('._2iau').length == 0 ? "" : $(news).find('._2iau')[0].innerText
                data.Newstitle = $(news).find('._5s6c')[0].innerText
                if ($(news).find('_3bt9').length) {
                    data.subtitle = $(news).find('._3bt9')[0].innerText
                }
                data.news_href = element.find('._3ekx')[0].lastChild.href
            }
            get_reaciton_cnt(reaction_url, (infolist) => {
                infolist.map((item, idx) => {
                    if (item.type == 0) {
                        data.total_reactions = item.cnt
                    } else if (item.type == 1) { //1:讚
                        data.like_cnt = item.cnt
                    } else if (item.type == 2) { //2:愛心
                        data.heart_cnt = item.cnt
                    } else if (item.type == 3) { //3:哇
                        data.suprise_cnt = item.cnt
                    } else if (item.type == 4) { //4:哈
                        data.laugh_cnt = item.cnt
                    } else if (item.type == 7) { //7:嗚
                        data.sad_cnt = item.cnt
                    } else if (item.type == 8) { //8:怒
                        data.angry_cnt = item.cnt
                    }
                })
            })
            //各情緒名單
            data.like_list = await getActionList(reaction_url, 1)
            data.heart_list = await getActionList(reaction_url, 2)
            data.suprise_list = await getActionList(reaction_url, 3)
            data.laugh_list = await getActionList(reaction_url, 4)
            data.sad_list = await getActionList(reaction_url, 7)
            data.angry_list = await getActionList(reaction_url, 8)
            let link = element.find('a[data-testid="UFI2CommentsCount/root"]')
            let cmt_link = link.length == 0 ? "" : link[0].href.replace("www", "mbasic")
            let comment = await getcomment(cmt_link)
            let comment_list = await comment.map((item, idx) => { //所以留言(包括未展開的留言)
                let data2 = {}
                let inner = item.innerHTML
                data2.type = "comment"
                data2.commentID = item.id
                data2.articleID = ft_ent
                let replyitem = $(inner).find("[id*='comment_replies_more'] a")
                let time = $(inner).find("abbr")[0].innerText
                if (lang == 'en') {
                    data2.time = handletime_en(time)
                } else {
                    data2.time = handletime(time)
                }
                console.log(data2.time)
                let target_id = item.id
                try {
                    data2.speaker = $(inner).find("h3")[0].innerText
                    data2.content = $(inner).find("h3")[0].nextSibling.innerText
                    let parent = $(inner).find("h3")[0].parentNode
                    if ($(parent).children().length > 3) {
                        let attach = $(inner).find("h3")[0].nextSibling.nextSibling
                        data2.media = attach.find("img").map((i, subitem) => {
                            return subitem.src
                        })
                    }
                } catch (e) {}
                if (replyitem.length != 0) {
                    let reply_link = replyitem[0].href.replace("www", "mbasic")
                    get_reply(reply_link, target_id, (reply_list) => { //所有回覆(包括未展開)
                        if (reply_list.length != 0) {
                            let replys = reply_list.map((item, idx) => {
                                let info = {}
                                try {
                                    let parent = $(item).find("h3")[0].parentNode
                                    if ($(parent).children().length > 3) {
                                        let attach = $(item).find("h3")[0].nextSibling.nextSibling
                                        info.media = $(attach).find("img").map((i, subitem) => {
                                            return subitem.src
                                        }).get()
                                    }
                                    info.commentID = data2.commentID
                                    info.articleID = data2.articleID
                                    info.speaker = $(item).find("h3")[0].innerText
                                    info.content = $(item).find("h3")[0].nextSibling.innerText
                                    let time = $(item).find("abbr")[0].innerText
                                    if (lang == 'en') {
                                        info.time = handletime_en(time)
                                    } else {
                                        info.time = handletime(time)
                                    }
                                    console.log(info.time)
                                    info.type = "reply"
                                } catch (e) {
                                    console.log(e)
                                }
                                return info
                            })
                            save_data(replys, r => {
                                console.log(r)
                            })
                        }
                    })
                    return data2
                } else {
                    return data2
                }
            })
            save_data(curcmtlist, (r) => {
                save_data(comment_list, (r) => {
                    console.log(r)
                    cb(data)
                })
            })
        } else {
            cb({})
        }
    }

    window.addEventListener("load", function (event) {
        lang = $('html')[0].lang
        let cur_url = window.location.href
        let idx = 0
        let c_user = getname('c_user')
        let article_list = $('.userContentWrapper')
        let n = article_list.length
        idx = n
        for (let i = 0; i < n; i++) {
            get_post(article_list.eq(i), c_user, (data) => {
                save_data(data, r => {
                    console.log(r)
                })
            })
        }
        $("body").bind('DOMNodeInserted', function (ev) {
            if ($(ev.target)[0].nodeName == 'LI' && $(ev.target).find("[data-testid='UFI2Comment/root_depth_0']").length != 0) {
                let cmt = ev.target
                let subdata = handle_cmt(cmt)
                let cur_replys = $(cmt).find("[data-testid='UFI2CommentsList/root_depth_1'] > ul > li").map((index, reply) => {
                    let reply_data = handle_reply(reply)
                    return reply_data
                }).get()
                save_data(subdata, r => {
                    console.log(r)
                })
                save_data(cur_replys, r => {
                    console.log(r)
                })
            } else if ($(ev.target)[0].nodeName == 'UL' && $(ev.target).find("[data-testid='UFI2Comment/root_depth_1']").length != 0) {
                let replylist = $(ev.target).children("li").map((idx, reply) => {
                    let reply_data = handle_reply(reply)
                    return reply_data
                }).get()
                console.log(replylist)
            } else if ($(ev.target)[0].nodeName == 'LI' && $(ev.target).find("[data-testid='UFI2Comment/root_depth_1']").length != 0) {
                let reply_data = handle_reply(ev.target)
                save_data(reply_data, r => {
                    console.log(r)
                })
            }
            if (window.location.href != cur_url) {
                console.log('change page')
                cur_url = window.location.href
                idx = 0
                let time
                if (cur_url == 'https://www.facebook.com/') {
                    time = 1000
                } else {
                    time = 10000
                }
                setTimeout(function () {
                    let articles = $('.userContentWrapper')
                    idx = articles.length
                    for (let i = 0; i < articles.length; i++) {
                        get_post(articles.eq(i), c_user, (data) => {
                            console.log(data)
                            save_data(data, r => {
                                console.log(r)
                            })
                        })
                    }
                }, time)
            }
            if (ev.target.id != undefined) { //社團
                if (ev.target.id.indexOf('jumper_') != -1 || ev.target.id.indexOf('mall_post_') != -1) {
                    setTimeout(function () {
                        let articles = $(ev.target).find('.userContentWrapper')
                        get_post(articles.eq(0), c_user, (data) => {
                            console.log(data)
                            save_data(data, r => {
                                console.log(r)
                            })
                        })
                    }, 3000)
                }
            }
            if (ev.target.className != undefined) { //個人頁面、粉專
                if (ev.target.className.indexOf('_1xnd') != -1) {
                    setTimeout(function () {
                        let articles = $(ev.target).find('.userContentWrapper')
                        for (let i = 0; i < articles.length; i++) {
                            get_post(articles.eq(i), c_user, (data) => {
                                console.log(data)
                                save_data(data, r => {
                                    console.log(r)
                                })
                            })
                        }
                    }, 3000)
                }
            }
        })
        if ($("#ariaPoliteAlert").length == 0) {
            $("body").bind('DOMNodeInserted', function (ev) {
                var loadflag = $("body").find("#ariaPoliteAlert")
                if (loadflag) {
                    $("#ariaPoliteAlert").bind('DOMNodeInserted', function (e) {
                        if (e.target.innerText.indexOf("載入") != -1||e.target.innerText.indexOf("requested")!=-1) {
                            setTimeout(function () {
                                let tmp = idx
                                let articles = $('.userContentWrapper')
                                idx = articles.length
                                for (let i = tmp; i < articles.length; i++) {
                                    get_post(articles.eq(i), c_user, (data) => {
                                        console.log(data)
                                        save_data(data, r => {
                                            console.log(r)
                                        })
                                    })
                                }
                            }, 3000)
                        }
                    });
                }
            });
        } else {
            $("#ariaPoliteAlert").bind('DOMNodeInserted', function (e) {
                if (e.target.innerText.indexOf("載入") != -1||e.target.innerText.indexOf("requested")!=-1) {
                    setTimeout(function () {
                        let tmp = idx
                        let articles = $('.userContentWrapper')
                        idx = articles.length
                        for (let i = tmp; i < articles.length; i++) {
                            get_post(articles.eq(i), c_user, (post) => {
                                console.log(post)
                                save_data(post, r => {
                                    console.log(r)
                                })
                            })
                        }
                    }, 3000)
                }
            });
        }
    })
})();
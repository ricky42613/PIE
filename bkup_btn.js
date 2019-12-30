(function() {
    'use strict'
    //註解參考fb_post_wall
    let bkuplist = []
    let lang = ""

    function save_data(data, cb) {
        chrome.runtime.sendMessage({
            type: 'save_data',
            data: data,
            db_name: 'fb_post'
        }, function(r) {
            cb(r)
        })
    }

    function convertImgToBase64(url, callback, outputFormat) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            img = new Image;
        img.crossOrigin = 'Anonymous'; //它开启了本地的跨域允许。当然服务器存储那边也要开放相应的权限才行，如果是设置了防盗链的图片在服务端就没有相应的权限的话你本地端开启了权限也是没有用的
        img.onload = function() {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL(outputFormat || 'image/png'); //没权限的跨域图片在使用canvas.toDataURL()数据导出时会报错
            callback.call(this, dataURL);
            canvas = null;
        };
        img.src = url;
    }

    function getname(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    function filter_arr(cmt_array) {
        if (cmt_array[0].id.indexOf("see_prev") != -1) {
            cmt_array = cmt_array.slice(1)
        }
        let n = cmt_array.length
        if (cmt_array[n - 1].id.indexOf("see_next") != -1) {
            cmt_array = cmt_array.slice(0, n - 1)
        }
        return cmt_array
    }

    function morecomment(link, type, cb) {
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: link
        }, r => {
            try {
                if (type == 1) {
                    let cmtlist
                    let cmt_array
                    if ($(r).find("[id*='composer-']").length) {
                        cmtlist = $(r).find("[id*='composer-']")[0].previousSibling.previousSibling.children
                        cmt_array = [...cmtlist]
                    } else {
                        let tmpbody = $(r).find("[id*='ufi_']")[0]
                        let tmpcmt = $(tmpbody.firstChild).children("[id*='u_0']")[0].previousSibling
                        cmtlist = tmpcmt.children
                        cmt_array = [...cmtlist]
                    }
                    let morelink = cmt_array[0].id.indexOf("see_prev") == -1 ? null : $(cmt_array[0]).find("a")[0].href //some time has error
                    cmt_array = filter_arr(cmt_array)
                    if (morelink != null) {
                        morelink = morelink.replace("www", "mbasic")
                        morecomment(morelink, 1, (more_arr) => {
                            cb(more_arr.concat(cmt_array))
                        })
                    } else {
                        cb(cmt_array)
                    }
                } else if (type == 2) {
                    let cmtlist
                    let cmt_array
                    if ($(r).find("[id*='composer-']").length) {
                        cmtlist = $(r).find("[id*='composer-']")[0].nextSibling.children
                        cmt_array = [...cmtlist]
                    } else {
                        let tmpbody = $(r).find("[id*='ufi_']")[0]
                        let tmpcmt = $(tmpbody.firstChild).children("[id*='u_0']")[0].previousSibling
                        cmtlist = tmpcmt.children
                        cmt_array = [...cmtlist]
                    }
                    let morelink = cmt_array[cmt_array.length - 1].id.indexOf("see_next") == -1 ? null : $(cmt_array[cmt_array.length - 1]).find("a")[0].href //some time has error
                    cmt_array = filter_arr(cmt_array)
                    if (morelink != null) {
                        morelink = morelink.replace("www", "mbasic")
                        morecomment(morelink, 2, (more_arr) => {
                            cb(more_arr.concat(cmt_array))
                        })
                    } else {
                        cb(cmt_array)
                    }
                }
            } catch (err) {
                console.log($(r).find("[id*='composer-']"))
                cb([])
            }
        })
    }

    function getcomment(link) { //取得第一層留言列表
        return new Promise(function(resolve, reject) {
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

    function get_reply(link, target_id, cb) {
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

    function get_reaciton_cnt(url, cb) {
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url.replace("www", "mbasic")
        }, r => {
            let links = $(r).find("a[href*='total_count='][role='button']")
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

    function getActionList(reaction_url, type, id) {
        return new Promise(function(resolve, reject) {
            let url = reaction_url + '&limit=1000&reaction_type=' + type + '&total_count=28475'
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

    function handletime_en(str) {
        let time = new Date();
        var d2 = new Date(time);
        if (str.indexOf("Today") != -1 || str.indexOf("hour") != -1 || str.indexOf("minute") != -1 || str.indexOf("now") != -1) { //eX.15分鐘前 1小時前 剛剛
            let m = time.getMonth() + 1 < 10 ? '0' + (time.getMonth() + 1) : '' + (time.getMonth() + 1)
            let d = time.getDate() < 10 ? '0' + time.getDate() : '' + time.getDate()
            return time.getFullYear() + '' + m + '' + d + '000000'
        } else if (str.indexOf("Monday") != -1 || str.indexOf("Tuesday") != -1 || str.indexOf("Thursday") != -1 || str.indexOf("Wednesday") != -1 || str.indexOf("Thursday") != -1 || str.indexOf("Friday") != -1 || str.indexOf("Saturday") != -1 || str.indexOf("Sunday") != -1) { //ex 星期一 15:30
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
            let y_start = str.indexOf(',') + 1
            let year = str.slice(y_start, y_start + 4)
            let month_idx = str.slice(0, 3)
            let month = my_month_table[month_idx]
            let d_start = str.indexOf(" ")
            let date = parseInt(str.slice(d_start + 1))
            if (date < 10) {
                date = '0' + date
            }
            return year + '' + month + '' + date + "000000"
        } else { //7月28日
            let month_idx = str.slice(0, 3)
            let month = my_month_table[month_idx]
            let d_start = str.indexOf(" ")
            let date = parseInt(str.slice(d_start + 1))
            if (date < 10) {
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


    function save_post(ori_url, url, c_user) {
        chrome.runtime.sendMessage({
            type: 'send_req',
            url: url
        }, async r => {
            if ($(r).find("#m_group_stories_container").length == 0 && $(r).find("#structured_composer_async_container").length == 0) {
                let locate = bkuplist.indexOf(ori_url)
                bkuplist.splice(locate, 1)
                return
            } else {
                let len = $(r).find("div[data-ft*='mf_story_key']").length
                let articles = await $(r).find("div[data-ft*='mf_story_key']").map(async(idx, item) => {
                    try {
                        let data = {}
                        data.nu_code = localStorage.getItem('nu_code')
                        data.post_link = $(item).find("a:contains('完整動態'),a:contains('Full Story')")[0].href.replace("mbasic", "www")
                        data.type = "posts"
                        data.author = $(item).find("[role='presentation'] strong a")[0].innerText
                        data.author_link = $(item).find("[role='presentation'] strong a")[0].href
                        let tmp = $(item).find("[role='presentation']")[0]
                        data.content = $(tmp)[0].parentNode.nextSibling.innerText == "" ? "" : $(tmp)[0].parentNode.nextSibling.innerHTML
                        let time_str = $(item).find('abbr')[0].innerText
                        if (lang == 'en') {
                            data.post_date = handletime_en(time_str)
                        } else {
                            data.post_date = handletime(time_str)
                        }
                        let attachment = $(tmp)[0].parentNode.nextSibling.nextSibling
                        let ft_ent = JSON.parse($(item).attr('data-ft')).mf_story_key
                            // let imgs = 
                        $(item).find('a[href*="/photo"] img').map((idx, item) => {
                            let info = {}
                            info.src = item.src
                            info.articleID = ft_ent
                            info.type = "posts_img"
                            convertImgToBase64(item.src, function(b64) {
                                info.img64 = b64
                                save_data(info, r => {
                                    console.log(r)
                                })
                            })
                            return info
                        }).get()
                        data.video_link = $(item).find('a[href*="/video_redirect/"]').map((idx, item) => {
                            return item.href.replace('www', 'mbasic')
                        }).get()
                        data.type = "posts"
                        data.articleID = ft_ent
                        if (attachment != null) {
                            if ($(attachment).find("[role='article']").length) {
                                data.from = $(attachment).find("[role='article'] strong a")[0].innerText
                                data.from_link = $(attachment).find("[role='article'] strong a")[0].href
                                data.shareContent = $(attachment).find("[role='article'] [role='presentation']")[0].parentNode.nextSibling.innerHTML
                            }
                            if ($(attachment).find("a[href*='lm.facebook.com'] h3").length) {
                                let news = $(attachment).find("a[href*='lm.facebook.com']")[0]
                                data.news_href = news.href
                                data.Newstitle = $(news).find('h3')[0].innerText
                                data.Newsfrom = $(news).find('h3')[0].nextSibling.innerText
                            }
                        }
                        let reaction_url = 'https://www.facebook.com/ufi/reaction/profile/browser/?ft_ent_identifier=' + ft_ent + '&av=' + c_user
                        get_reaciton_cnt(reaction_url, (infolist) => {
                            infolist.map((item, idx) => {
                                if (item.type == 0) {
                                    data.total_reactions = item.cnt
                                } else if (item.type == 1) {
                                    data.like_cnt = item.cnt
                                } else if (item.type == 2) {
                                    data.heart_cnt = item.cnt
                                } else if (item.type == 3) {
                                    data.suprise_cnt = item.cnt
                                } else if (item.type == 4) {
                                    data.laugh_cnt = item.cnt
                                } else if (item.type == 7) {
                                    data.sad_cnt = item.cnt
                                } else if (item.type == 8) {
                                    data.angry_cnt = item.cnt
                                }
                            })
                        })
                        data.like_list = await getActionList(reaction_url, 1, ft_ent)
                        data.heart_list = await getActionList(reaction_url, 2, ft_ent)
                        data.suprise_list = await getActionList(reaction_url, 3, ft_ent)
                        data.laugh_list = await getActionList(reaction_url, 4, ft_ent)
                        data.sad_list = await getActionList(reaction_url, 7, ft_ent)
                        data.angry_list = await getActionList(reaction_url, 8, ft_ent)
                        let cmt_link = $(item).find("a:contains('則留言'),a:contains('comments')").length == 0 ? "" : $(item).find("a:contains('則留言'),a:contains('comments')")[0].href.replace("www", "mbasic")
                        let comment = await getcomment(cmt_link)
                        let comment_list = await comment.map((item, idx) => {
                            let data = {}
                            let inner = item.innerHTML
                            let replyitem = $(inner).find("[id*='comment_replies_more'] a")
                            let time = $(inner).find("abbr")[0].innerText
                            data.nu_code = localStorage.getItem('nu_code')
                            if (lang == 'en') {
                                data.time = handletime_en(time)
                            } else {
                                data.time = handletime(time)
                            }
                            data.type = "comment"
                            data.articleID = ft_ent
                            data.commentID = item.id
                            let target_id = item.id
                            try {
                                data.speaker = $(inner).find("h3")[0].innerText
                                data.content = $(inner).find("h3")[0].nextSibling.innerText
                                let parent = $(inner).find("h3")[0].parentNode
                                if ($(parent).children().length > 3) {
                                    let attach = $(inner).find("h3")[0].nextSibling.nextSibling
                                    data.imgs = $(attach).find("img").map((i, subitem) => {
                                        let info = {}
                                        info.src = subitem.src
                                        convertImgToBase64(item.src, function(b64) {
                                            info.img64 = b64
                                        })
                                        return info
                                    }).get()
                                }
                            } catch (e) {
                                console.log($(inner).find("h3")[0].nextSibling.nextSibling)
                            }
                            if (replyitem.length != 0) {
                                let reply_link = replyitem[0].href.replace("www", "mbasic")
                                get_reply(reply_link, target_id, (reply_list) => {
                                    if (reply_list.length != 0) {
                                        let replys = reply_list.map((item, idx) => {
                                            let info = {}
                                            info.type = "reply"
                                            let parent = $(item).find("h3")[0].parentNode
                                            if ($(parent).children().length > 3) {
                                                let attach = $(item).find("h3")[0].nextSibling.nextSibling
                                                info.imgs = $(attach).find("img").map((i, subitem) => {
                                                    let img_info = {}
                                                    img_info.src = subitem.src
                                                    convertImgToBase64(subitem.src, function(b64) {
                                                        img_info.img64 = b64
                                                    })
                                                    return img_info
                                                }).get()
                                            }
                                            info.nu_code = localStorage.getItem('nu_code')
                                            info.articleID = ft_ent
                                            info.commentID = data.commentID
                                            info.speaker = $(item).find("h3")[0].innerText
                                            info.content = $(item).find("h3")[0].nextSibling.innerText
                                            let time = $(item).find("abbr")[0].innerText
                                            if (lang == 'en') {
                                                info.time = handletime_en(time)
                                            } else {
                                                info.time = handletime(time)
                                            }
                                            return info
                                        })
                                        save_data(replys, r => {
                                            console.log(r)
                                        })
                                    }
                                })
                                return data
                            } else {
                                data.reply = []
                                return data
                            }
                        })
                        save_data(comment_list, (r) => {
                            console.log(r)
                        })
                        save_data(data, (r) => {
                            console.log(r)
                        })
                        if (idx == len - 1) {
                            if ($(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')").length) {
                                let more_url = $(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')")[0].href.replace('www', 'mbasic')
                                save_post(ori_url, more_url, c_user)
                            } else {
                                let target_idx = bkuplist.indexOf(ori_url)
                                bkuplist.splice(target_idx, 1)
                                alert("完成" + ori_url + "備份")
                            }
                        }
                        return data
                    } catch (e) {
                        if (idx == len - 1) {
                            if ($(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')").length) {
                                let more_url = $(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')")[0].href.replace('www', 'mbasic')
                                save_post(ori_url, more_url, c_user)
                            } else {
                                let target_idx = bkuplist.indexOf(ori_url)
                                bkuplist.splice(target_idx, 1)
                                alert("完成" + ori_url + "備份")
                            }
                        }
                        return ({})
                    }
                })
            }
        })
    }

    window.addEventListener("load", async function(event) {
        let c_user = getname('c_user')
        lang = $('html')[0].lang
        var buttonBarShadow = document.createElement('div')
        buttonBarShadow.innerText = "bkup"
        buttonBarShadow.setAttribute("id", "bkup")
        buttonBarShadow.setAttribute("style", "text-align:center;line-height:35px;position:fixed;top:3px;left:3px;z-index:9999999999;width:35px;height:35px;border-radius:999em;background-color:#429ef5;color:white")
        document.body.appendChild(buttonBarShadow)
        $('#bkup').draggable({
            start: function(event, ui) {
                ui.helper.bind("click.prevent",
                    function(event) {
                        event.preventDefault();
                    });
            },
            stop: function(event, ui) {
                setTimeout(function() {
                    ui.helper.unbind("click.prevent");
                }, 300);
            }
        })
        $('#bkup').click(function(e) {
            if (bkuplist.indexOf(window.location.href) == -1) {
                bkuplist.push(window.location.href)
                let url = window.location.href.replace("www", "mbasic")
                save_post(window.location.href, url, c_user)
            } else {
                alert("正在備份中")
            }
        });
    })
})()
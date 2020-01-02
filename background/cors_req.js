function person_info(url) {
    return new Promise(function(resolve, reject) {
        if (url.indexOf("undefined") != -1) {
            resolve("")
        } else {
            setTimeout(function() {
                console.log(url.replace("www", "mbasic"))
                $.get(url.replace("www", "mbasic"), function(r) {
                    try {
                        let introduce = ""
                        $(r).find("[role='heading']").map((idx, item) => {
                            if (item.id.length) {
                                introduce = introduce + item.innerText
                            }
                        })
                        if ($(r).find("[role='heading']").length) {
                            let parent = $(r).find("[role='heading']")[0].parentNode.parentNode.parentNode.parentNode.parentNode
                            if ($(parent).children("div") > 1) {
                                introduce = introduce + '\n' + $(parent).children("div")[1].innerText
                            }
                            resolve(introduce)
                        } else {
                            resolve(introduce)
                        }
                    } catch (e) {
                        resolve("")
                    }
                })
            }, 10000)
        }
    })
}

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
    setTimeout(function() {
        $.ajax({
            url: link,
            method: 'GET',
            timeout: 60000,
            success: r => {
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
                        let morelink = cmt_array[0].id.indexOf("see_prev") == -1 ? null : "https://mbasic.facebook.com" + $($(cmt_array[0]).find("a")[0]).attr('href') //some time has error
                        cmt_array = filter_arr(cmt_array)
                        if (morelink != null) {
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
                        let morelink = cmt_array[cmt_array.length - 1].id.indexOf("see_next") == -1 ? null : "https://mbasic.facebook.com" + $($(cmt_array[cmt_array.length - 1]).find("a")[0]).attr('href') //some time has error
                        cmt_array = filter_arr(cmt_array)
                        if (morelink != null) {
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
            },
            error: e => {
                console.log(e)
                morecomment(link, type, arr => {
                    cb(arr)
                })
            }
        })
    }, 1000)
}

function getcomment(link) { //取得第一層留言列表
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            if (link.length) {
                $.ajax({
                    url: link,
                    method: 'GET',
                    timeout: 60000,
                    success: r => {
                        try {
                            if ($(r).find("[id*='composer-']")[0].nextSibling == null) { //下一層留言連結在留言列表頂部
                                let cmtlist = $(r).find("[id*='composer-']")[0].previousSibling.previousSibling.children
                                let cmt_array = [...cmtlist]
                                let morelink = cmt_array[0].id.indexOf("see_prev") == -1 ? null : "https://mbasic.facebook.com" + $($(cmt_array[0]).find("a")[0]).attr('href') //上一層的留言列表連結
                                cmt_array = filter_arr(cmt_array)
                                if (morelink != null) {
                                    morecomment(morelink, 1, (more_arr) => { //取得更舊的留言列表
                                        resolve(more_arr.concat(cmt_array))
                                    })
                                } else {
                                    resolve(cmt_array)
                                }
                            } else { //另一種留言格式(下一層連接再留言列表尾部)
                                let cmtlist = $(r).find("[id*='composer-']")[0].nextSibling.children
                                let cmt_array = [...cmtlist]
                                let morelink = cmt_array[cmt_array.length - 1].id.indexOf("see_next") == -1 ? null : "https://mbasic.facebook.com" + $($(cmt_array[cmt_array.length - 1]).find("a")[0]).attr('href') //取得更舊的留言列表
                                cmt_array = filter_arr(cmt_array)
                                if (morelink != null) {
                                    morecomment(morelink, 2, (more_arr) => { //取得更舊的留言列表
                                        resolve(more_arr.concat(cmt_array))
                                    })
                                } else {
                                    resolve(cmt_array)
                                }
                            }

                        } catch (err) {
                            resolve([])
                        }
                    },
                    error: r => {
                        console.log(r)
                        resolve([])
                    }
                })
            } else {
                resolve([])
            }
        }, 1000)
    })
}

function get_reply(link, target_id, articleID, lang, statistic_list) {
    return new Promise(function(resolve, reject) {
        $.get(link, async r => {
            try {
                let replylist = $(r).find("#" + target_id)[0].nextSibling.children
                let reply_array = [...replylist]
                    // if (reply_array.length != 0) {
                let arr = await reply_array.map((item, idx) => {
                    let info = {}
                    try {
                        info.name = $(item).find("h3")[0].innerText
                        info.articleID = articleID
                        info.commentID = target_id
                        info.type = 'reply'
                        info.content = $(item).find("h3")[0].nextSibling.innerText
                        let time = $(item).find("abbr")[0].innerText
                        if (lang == 'en') {
                            info.time = handletime_en(time)
                        } else {
                            info.time = handletime(time)
                        }
                        if (info.name != undefined) {
                            info.href = $($(item).find("h3 a")[0]).attr('href')
                            let flag = 0
                            for (let i = 0; i < statistic_list.length; i++) {
                                if (statistic_list[i].href == info.href) {
                                    flag = 1
                                    statistic_list[i].cnt++
                                        break
                                }
                            }
                            if (flag == 0) {
                                let data = {}
                                data.href = info.href
                                data.name = info.name
                                data.cnt = 1
                                statistic_list.push(data)
                            }
                        }
                        return info
                    } catch (e) {
                        console.log(e)
                        return info
                    }
                })
                send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', arr, nu_code, "fb_post")
                    // }
                if (reply_array[0].id.indexOf("comment_replies_more") != -1) {
                    let morelink = "https://mbasic.facebook.com" + $($(reply_array[0]).find("a")[0]).attr('href')
                    statistic_list = await get_reply(morelink, target_id, articleID, lang, statistic_list)
                    resolve(statistic_list)
                } else {
                    resolve(statistic_list)
                }
            } catch (err) {
                resolve(statistic_list)
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
    let check = str.split(" ")[0].slice(0, 3)
        // if (my_month_table[check] != undefined) {
        //     let d = str.split(" ")[1]
        //     let m = my_month_table[check]
        //     return time.getFullYear() + '' + m + '' + d + '000000'
        // } else
    if (str.indexOf("Today") != -1 || str.indexOf("hours") != -1 || str.indexOf("minute") != -1 || str.indexOf("now") != -1) { //eX.15分鐘前 1小時前 剛剛
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

function handletime(str) { //估算大約時間點
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

function get_reaciton_cnt(url, cb) {
    $.ajax({
        url: url.replace("www", "mbasic"),
        method: 'GET',
        timeout: 60000,
        success: r => {
            try {
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
            } catch (e) {
                console.log(e)
                get_reaciton_cnt(url, rct => {
                    cb(rct)
                })
            }
        },
        error: e => {
            console.log(e)
            get_reaciton_cnt(url, rct => {
                cb(rct)
            })
        }
    })
}

function getActionList(reaction_url, type, cur_list) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            let newurl = reaction_url + '&limit=1000&reaction_type=' + type + '&total_count=28475'
            newurl = newurl.replace("browser/", "browser/fetch")
            $.ajax({
                url: newurl.replace("www", "mbasic"),
                method: 'GET',
                timeout: 60000,
                success: async r => {
                    try {
                        let list = $(r).find("li h3 a")
                        if (list.length) {
                            Promise.all(list.map(async(idx, item) => {
                                let flag = 0
                                for (let i = 0; i < cur_list.length; i++) {
                                    if (cur_list[i].href == $(item).attr('href')) {
                                        flag = 1
                                        cur_list[i].cnt++
                                            break
                                    }
                                }
                                if (flag == 0) {
                                    let data = {}
                                    data.href = $(item).attr('href')
                                    data.name = item.innerText
                                    data.cnt = 1
                                    cur_list.push(data)
                                }
                                return true
                            }).get()).then(val => {
                                resolve(cur_list)
                            })
                        } else {
                            resolve(cur_list)
                        }
                    } catch (e) {
                        cur_list = await getActionList(reaction_url, type, cur_list)
                        resolve(cur_list)
                    }
                },
                error: r => {
                    console.log(r)
                    resolve(cur_list)
                }
            })
        }, 2000)
    })
}

function get_userid(str) { //get facebook user id
    let start = str.indexOf("&av=")
    str = str.slice(start + 4)
    let end = str.indexOf("&")
    let id = str.slice(0, end)
    return id
}

function get_postid(str) { //get article id 
    let start = str.indexOf("&ft_ent_identifier=")
    str = str.slice(start + 19)
    let end = str.indexOf("&")
    let id = str.slice(0, end)
    return id
}

function get_post(ori_url, statistic_list, task) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            let url = "https://mbasic.facebook.com" + ori_url
            $.ajax({
                method: 'GET',
                url: url,
                timeout: 60000,
                success: async r => {
                    try {
                        let data = {}
                        let lang = $(r).find("[href*='home.php']")[1].innerText.indexOf('Home') != -1 ? "en" : "ch" //判斷頁面語言
                        data.type = "analy_posts"
                        data.task = task
                        let tmp = $($(r).find("[href*='&av=']")[0]).attr('href')
                        let c_user = get_userid(tmp)
                        if ($(r).find("[role='presentation'] strong a").length) {
                            data.author = $(r).find("[role='presentation'] strong a")[0].innerText
                            data.author_link = "https://www.facebook.com" + $($(r).find("h3 strong a")[0]).attr('href')
                        } else {
                            data.author = $(r).find(".actor")[0].innerText
                            data.author_link = "https://www.facebook.com" + $($(r).find(".actor-link")[0]).attr('href')
                        }
                        let id_str = $(r).find("[href*='&ft_ent_identifier=']")[0].href
                        data.articleID = get_postid(id_str)
                        let str = JSON.stringify({
                            "tn": "*s"
                        })
                        if ($(r).find("[data-ft*='" + str + "']").length) {
                            data.content = $(r).find("[data-ft*='" + str + "']")[0].innerText
                        } else {
                            data.content = $(r).find('._2vj8')[0].innerText
                        }
                        data.post_link = url.replace("mbasic", "www")
                        let time_str = $(r).find("abbr")[0].innerText
                        if (lang == 'en') {
                            data.post_date = handletime_en(time_str)
                        } else {
                            data.post_date = handletime(time_str)
                        }
                        let reaction_url = 'https://www.facebook.com/ufi/reaction/profile/browser/?ft_ent_identifier=' + data.articleID + '&av=' + c_user
                        get_reaciton_cnt(reaction_url, (infolist) => { //get each reaction count
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
                        statistic_list = await getActionList(reaction_url, 1, statistic_list)
                        statistic_list = await getActionList(reaction_url, 2, statistic_list)
                        statistic_list = await getActionList(reaction_url, 3, statistic_list)
                        statistic_list = await getActionList(reaction_url, 4, statistic_list)
                        statistic_list = await getActionList(reaction_url, 7, statistic_list)
                        statistic_list = await getActionList(reaction_url, 8, statistic_list)
                        let comment = await getcomment(url)
                        Promise.all(comment.map(async(item, idx) => { //get comment content
                            let inner = item.innerHTML
                            let information = {}
                            information.speaker_href = ""
                            try {
                                information.name = $(inner).find("h3")[0].innerText
                                information.speaker_href = $($(inner).find("h3 a")[0]).attr('href')
                                information.content = $(inner).find("h3")[0].nextSibling.innerText
                                information.articleID = data.articleID
                                information.commentID = item.id
                                information.type = "comment"
                                let time = $(inner).find("abbr")[0].innerText
                                if (lang == 'en') {
                                    information.time = handletime_en(time)
                                } else {
                                    information.time = handletime(time)
                                }
                            } catch (e) {
                                console.log(e)
                            }
                            let replyitem = $(inner).find("[id*='comment_replies_more'] a")
                            if (replyitem.length) { //get reply content
                                let target_id = item.id
                                let href = "https://mbasic.facebook.com" + $(replyitem[0]).attr('href')
                                statistic_list = await get_reply(href, target_id, information.articleID, lang, statistic_list)
                                return information
                            } else {
                                return information
                            }
                        })).then(val => {
                            send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', val, nu_code, "fb_post")
                            Promise.all(val.map(async(item, idx) => {
                                let flag = 0
                                for (let i = 0; i < statistic_list.length; i++) {
                                    if (statistic_list[i].href == item.speaker_href) { //陣列中已存在則cnt++
                                        flag = 1
                                        statistic_list[i].cnt++
                                            break
                                    }
                                }
                                if (flag == 0) { //不存在則push
                                    let data = {}
                                    data.href = item.speaker_href
                                    data.name = item.name
                                    data.cnt = 1
                                    statistic_list.push(data)
                                }
                                return true
                            })).then(val => {
                                send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', data, nu_code, "fb_post")
                                resolve(statistic_list)
                            })
                        })
                    } catch (e) {
                        console.log(e)
                        resolve(statistic_list)
                    }
                },
                error: e => {
                    console.log(e)
                    setTimeout(async function() {
                        statistic_list = await get_post(ori_url, statistic_list, task)
                        resolve(statistic_list)
                    }, 5000)
                }
            })
        }, 3000)
    })
}

function get_links(url, topk, cur_len, cb) {
    $.get(url, async function(r) {
        let arr = await $(r).find("div[data-ft*='mf_story_key'] ").map((idx, item) => {
            return $($(item).find("a:contains('完整動態'),a:contains('Full Story')")[0]).attr('href')
        }).get()
        console.log(arr)
        let total_len = cur_len + arr.length
        if (total_len == topk) {
            cb(arr)
        } else if (total_len > topk) {
            let dif = topk - total_len
            cb(arr.slice(0, dif))
        } else if ($(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')").length) {
            let href = 'https://mbasic.facebook.com' + $($(r).find("a:contains('顯示更多'),a:contains('查看更多貼文'),a:contains('查看更多動態'),a:contains('See More Posts'),a:contains('Show more'),a:contains('See More Stories')")[0]).attr('href')
            console.log(href)
            get_links(href, topk, total_len, (arr2) => {
                cb(arr.concat(arr2))
            })
        } else {
            cb(arr)
        }
    })
}

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.type == "send_req") { //make request
        $.get(request.url, r => {
            sendResponse(r)
        })
    } else if (request.type == "query_nudb") {
        //mode=nudb_get&arg= ["db_name":"fbmsg", "nu_code":"xxxxxxxxx", "q":"測試"]
        $.get('http://' + domain + '/Site_Prog/API/plugin_api.php?mode=get_url', function(r) {
            let addr = r.url + 'Site_Prog/API/plugin_api.php'
            let arg = {
                db_name: request.db,
                nu_code: nu_code,
                q: request.query,
            }

            if (request.db != 'fbmsg') {
                arg.p = request.p
                arg.ps = request.ps
                arg.onlyfield = '@articleID:'
                    // arg.matchmode = 'AndMatch'
            }

            let str = JSON.stringify(arg)
            $.ajax({
                url: addr,
                type: 'POST',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: "mode=nudb_get&arg=" + encodeURIComponent(str),
                success: function(r) {
                    console.log(r)
                    sendResponse(JSON.parse(r))
                }
            })
        })
    } else if (request.type == "parse_post") {
        let n = id_list.length
        let tmp_id_list = id_list
        let statistic_list = []
        let topk = request.topk
        let task = request.task
        w_queue.push(task)
        localStorage.setItem("w_queue", JSON.stringify(w_queue))
        let i = 0
        while (i < n) {
            console.log(i)
            statistic_list = await get_post(tmp_id_list[i], statistic_list, task)
            console.log(statistic_list.length)
            i++
        }
        statistic_list.sort((a, b) => {
            return b.cnt - a.cnt
        })
        statistic_list = statistic_list.slice(0, topk) //取前K筆
        console.log(statistic_list)
        Promise.all(statistic_list.map(async item => {
            let data = {}
            data.href = 'https://www.facebook.com' + item.href
            data.name = item.name
            data.introduce = await person_info('https://mbasic.facebook.com' + item.href)
            data.type = "analy_posts_list"
            data.task = task
            return data
        })).then(val => {
            console.log(val)
            let time = new Date()
            console.log(time)
            send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', val, nu_code, "fb_post")
            let index = w_queue.indexOf(task)
            if (index != -1) {
                w_queue.splice(index, 1)
                localStorage.setItem("w_queue", JSON.stringify(w_queue))
            }
            sendResponse("finish")
        })
    } else if (request.type == "get_links") {
        let url = 'https://mbasic.facebook.com' + request.page_link
        let topk = request.topk
        task_link = request.page_link
        localStorage.setItem("task", task_link)
        get_links(url, topk, 0, list => {
            id_list = list
            localStorage.setItem("id_list", JSON.stringify(id_list))
            sendResponse(list)
        })
    }
    return true
})
(function() {
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

    function get_curtype() { //取得目前搜尋結果的分類 ex貼文、粉專、人物....
        let url = window.location.href
        let start = url.indexOf("search/") + 7
        let end = url.indexOf("/?q")
        let type = url.slice(start, end)
        return type
    }

    function get_reaciton_cnt(url) { //取得各情緒數量
        return new Promise(function(resolve, reject) {
            if (url.length) {
                chrome.runtime.sendMessage({
                    type: 'send_req',
                    url: url.replace("www", "mbasic")
                }, r => {
                    let links = $(r).find("a[href*='total_count'][role='button']")
                    let reactions = [0, 0, 0, 0, 0, 0, 0, 0]
                    if (links.length) {
                        links.map((idx, item) => {
                            let type
                            let href = item.href
                            let start = href.indexOf('total_count=')
                            let tmp = href.slice(start + 12)
                            if (href.indexOf('type=') != -1) {
                                let tstart = href.indexOf('type=')
                                type = parseInt(href.slice(tstart + 5))
                            } else {
                                type = 0
                            }
                            reactions[type] = parseInt(tmp)
                            if (idx == links.length - 1) {
                                resolve(reactions)
                            }
                        })
                    } else {
                        resolve([])
                    }
                })
            } else {
                resolve([])
            }
        })
    }

    function convertImgToBase64(url, callback, outputFormat) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            img = new Image;
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL(outputFormat || 'image/png');
            callback.call(this, dataURL);
            canvas = null;
        };
        img.src = url;
    }

    function method_for_links(element) { //for 連結
        let link_list = element.map((idx, item) => {
            let data = {}
            data.nu_code = localStorage.getItem('nu_code')
            data.type = "links"
            data.title = $(item).find('._6roy a')[0].innerText
            let tmp = $(item).find('._6rou a')[0].href
            let start = $(item).find('._6rou a')[0].href.indexOf("?u=") + 3
            let tmphref = tmp.slice(start)
            data.href = decodeURIComponent(tmphref)
            data.content = $(item).find('._6roz').lenght == 0 ? "" : $(item).find('._6roz')[0].innerText
            data.from = $(item).find('._6ro- div').length == 0 ? "" : $(item).find('._6ro- div')[0].innerText
            data.photo = $(item).find('._6rou img').length == 0 ? "" : $(item).find('._6rou img')[0].src
            convertImgToBase64(data.src, function(base64Img) {
                data.img64 = base64Img
            });
            return data
        }).get()
        return link_list
    }

    function method_for_location(element) { //for 地標
        let data = {}
        data.nu_code = localStorage.getItem('nu_code')
        data.type = "places"
        data.name = $(element).find("._1wu_ a")[0].innerText
        data.link = $(element).find("._1wu_ a")[0].href
        data.desciption = $(element).find('._1o90').length > 0 ? $(element).find('._1o90')[0].innerText : ""
        data.information = $(element).find('._1o90').length > 1 ? $(element).find('._1o90')[1].innerText : ""
        data.star = $(element).find("._672g")[0].innerText
        data.photo = $(element).find("._6hre")[0].src
        convertImgToBase64(data.src, function(base64Img) {
            data.logo_img64 = base64Img
        });
        return data
    }

    function method_for_person(element, type) { //for 人物、粉專、社團、活動、應用程式
        let list = element.map((idx, item) => {
            let data = {}
            data.nu_code = localStorage.getItem('nu_code')
            data.type = type //ex people、page、group....
            data.link = $(item).find("._2ial")[0].href
            data.photo = $(item).find("._2ial img")[0].src
            convertImgToBase64(data.src, function(base64Img) {
                data.img64 = base64Img
            });
            data.description = $(item).find('._glo')[0].innerText
            data.name = $(item).find('._5bcu')[0].innerText
            data.status = $(item).find('._pac')[0].innerText
            if ($(item).find('.uiStars').length) {
                let starbody = $(item).find('.uiStars')[0]
                data.star = $(starbody).find('.fullStar').length + 0.5 * $(starbody).find('.halfStar').length
            }
            return data
        }).get()
        return list
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
        } else if (str.indexOf(',') != -1) { //ex January 8, 2012 at 10:41 PM
            let y_start = str.indexOf(',') + 2
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

    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    function method_for_post(list, type, cb) {
        Promise.all(list.map(async(idx, item) => {
            let data = {}
            let reaction_url = $(item).find('._3dlf').length == 0 ? "" : $(item).find('._3dlf')[0].href
            let reaction_info = await get_reaciton_cnt(reaction_url)
            let ds = JSON.parse($(item)[0].dataset.gt)
            let ds_start = ds.xt.indexOf("{")
            let ds_detail = JSON.parse(ds.xt.slice(ds_start))
            let tmp_id = b64DecodeUnicode(ds_detail.unit_id_result_id)
            let id_start = tmp_id.lastIndexOf(":") + 1
            data.articleID = tmp_id.slice(id_start)
            data.nu_code = localStorage.getItem('nu_code')
            data.total_reactions = await reaction_info[0]
            data.like_cnt = await reaction_info[1]
            data.heart_cnt = await reaction_info[2]
            data.suprise_cnt = await reaction_info[3]
            data.laugh_cnt = await reaction_info[4]
            data.sad_cnt = await reaction_info[7]
            data.angry_cnt = await reaction_info[8]
            data.type = type
            data.author = $(item).find('img[class*="profileLink"]')[0].parentNode.title.length == 0 ? $(item).find('img[class*="profileLink"]').eq(0).attr('aria-label') : $(item).find('img[class*="profileLink"]')[0].parentNode.title
            data.author_link = $(item).find('img[class*="profileLink"]')[0].parentNode.href
            data.post_link = $(item).find('._6-cp ._6-cm a').length == 0 ? "" : $(item).find('._6-cp ._6-cm a')[0].href
            let time_str = $(item).find('._6-cp ._6-cm a').length == 0 ? "" : $(item).find('._6-cp ._6-cm a')[0].innerText
            if (lang == 'en') {
                data.post_date = handletime_en(time_str)
            } else {
                data.post_date = handletime(time_str)
            }
            data.permission = $(item).find('._84v8 i').length == 0 ? "" : $(item).find('._84v8 i').eq(0).attr("data-tooltip-content")
            data.content = $(item).find("._6-cp")[0].innerText
            if ($(item).find("._6-cp")[0].nextSibling != null) {
                // let imgs = 
                $(item).find("a[rel='theater'] img").map((idx, item) => {
                    let info = {}
                    info.src = item.src
                    info.type = "article_img"
                    info.articleID = data.articleID
                    convertImgToBase64(item.src, b64 => {
                        info.img64 = b64
                        save_data(info, r => {
                            console.log(r)
                        })
                    })
                    return info
                }).get()
            }
            return data
        }).get()).then(val => {
            console.log(val)
            cb(val)
        })
    }

    function get_init_for_post(type, cb) { //頁面剛載入時觸發
        method_for_post($('#BrowseResultsContainer ._6-e5'), type, (list) => {
            method_for_post($('[data-testid="results"] ._6-e5'), type, (list2) => {
                cb(list.concat(list2))
            })
        })
    }

    function get_loading_for_post(id, type, cb) { //新載入資料時出發 
        let body = $("#" + id)[0].firstChild
        method_for_post($(body).find('._6-e5'), type, (list) => {
            cb(list)
        })
    }

    function get_init(type, cb) { //頁面剛載入時觸發
        let data1 = method_for_person($("#BrowseResultsContainer ._ikh"), type)
        let data2 = method_for_person($("[data-testid='results'] ._ikh"), type)
        cb(data1.concat(data2))
    }

    function getloadlist(id, type, cb) { //新載入資料時出發 
        let body = $("#" + id + ' ._gli')
        let newlist = method_for_person(body, type)
        cb(newlist)
    }

    function get_init_links(cb) { //頁面剛載入時觸發
        let data1 = method_for_links($("#BrowseResultsContainer ._6ros"))
        let data2 = method_for_links($("[data-testid='results'] ._6ros"))
        cb(data1.concat(data2))
    }

    function getloading_links(id, cb) { //新載入資料時出發
        let body = $("#" + id + ' ._6ros')
        let newlist = method_for_links(body)
        cb(newlist)
    }
    window.addEventListener("load", function(event) {
        lang = $('html')[0].lang
        let type = get_curtype()
        if (type == "people" || type == "pages" || type == "groups" || type == "events" || type == "apps") {
            get_init(type, (list) => {
                console.log(list)
                save_data(list, function(r) {
                    console.log(r)
                })
            })
        } else if (type == "posts") {
            get_init_for_post(type, (list) => {
                console.log(list)
                save_data(list, function(r) {
                    console.log(r)
                })
            })
        } else if (type == "places") {
            let place_list = $("li[id*='anchor']").map((idx, item) => {
                let data = method_for_location(item)
                return data
            }).get()
            console.log(place_list)
            save_data(place_list, function(r) {
                console.log(r)
            })
        } else if (type == "links") {
            get_init_links((list) => {
                console.log(list)
                save_data(list, function(r) {
                    console.log(r)
                })
            })
        }

        if (type != "places") {
            $("._58b7").bind('DOMNodeInserted', function(ev) { //init
                let element = $(ev.target)[0]
                if ($(element)[0].parentNode.id.indexOf("fbBrowseScrollingPagerContainer") != -1) {
                    let newid = $(element)[0].parentNode.id
                    if (type == "people" || type == "pages" || type == "groups" || type == "events" || type == "apps") {
                        getloadlist(newid, type, (list) => {
                            console.log(list)
                            save_data(list, function(r) {
                                console.log(r)
                            })
                        })
                    } else if (type == "posts") {
                        get_loading_for_post(newid, type, (list) => {
                            console.log(list)
                            save_data(list, function(r) {
                                console.log(r)
                            })
                        })
                    } else if (type == "links") {
                        getloading_links(newid, (list) => {
                            console.log(list)
                            save_data(list, function(r) {
                                console.log(r)
                            })
                        })
                    }
                }
            })
        } else {
            $('ul[data-bt*="main_column"]').bind('DOMNodeInserted', function(ev) {
                if ($(ev.target)[0].classList.value.indexOf("_672g") != -1) {
                    let element = $(ev.target)[0].parentNode.parentNode.parentNode
                    let list = method_for_location(element)
                    console.log(list)
                    save_data(list, function(r) {
                        console.log(r)
                    })
                }
            })
        }
        $("#content").bind('DOMNodeInserted', function(e) { //change class
            if (get_curtype() != 'places') {
                if ($(e.target).find("._58b7").length) {
                    $("._58b7").bind('DOMNodeInserted', function(ev) {
                        type = get_curtype()
                        let check = $(ev.target)[0].parentNode.parentNode
                        if ($(ev.target)[0].parentNode.id.indexOf("fbBrowseScrollingPagerContainer") != -1) {
                            let newid = $(ev.target)[0].parentNode.id
                            if (type == "people" || type == "pages" || type == "groups" || type == "events" || type == "apps") {
                                getloadlist(newid, type, (list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            } else if (type == "posts") {
                                get_loading_for_post(newid, type, (list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            } else if (type == "links") {
                                getloading_links(newid, (list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            }
                        } else if ("paginated_results" == $(check).attr("data-testid")) {
                            if (type == "people" || type == "pages" || type == "groups" || type == "events" || type == "apps") {
                                get_init(type, (list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            } else if (type == "posts") {
                                get_init_for_post(type, (list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            } else if (type == "links") {
                                get_init_links((list) => {
                                    console.log(list)
                                    save_data(list, function(r) {
                                        console.log(r)
                                    })
                                })
                            }
                        }

                    })
                }
            } else {
                try {
                    if ($(e.target)[0].classList.value.indexOf("_672g") != -1) {
                        let element = $(e.target)[0].parentNode.parentNode.parentNode
                        let list = method_for_location(element)
                        console.log(list)
                        save_data(list, function(r) {
                            console.log(r)
                        })
                    }
                } catch (err) {
                    console.log(err)
                };
            }
        })
    })
})()
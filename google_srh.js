//google 搜尋結果
(function() {
    'use strict';


    function date2str(dy) {
        let y = dy.getFullYear() + ''
        let m = (dy.getMonth() + 1) < 10 ? '0' + (dy.getMonth() + 1) : '' + (dy.getMonth() + 1)
        let d = dy.getDate() < 10 ? '0' + dy.getDate() : '' + dy.getDate()
        let h = dy.getHours() < 10 ? '0' + dy.getHours() : '' + dy.getHours()
        let min = dy.getMinutes() < 10 ? '0' + dy.getMinutes() : '' + dy.getMinutes()
        let s = dy.getSeconds() < 10 ? '0' + dy.getSeconds() : '' + dy.getSeconds()
        return y + m + d + h + min + s
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
        } else if (str.indexOf('天前') != -1) { //ex昨天 8:30
            d2.setDate(d2.getDate() - parseInt(str));
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

    let collect_list = []
    let link_records = []
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if ("get_collect_list" == request.type) { //回傳已選擇的影片列表
                sendResponse(collect_list);
                console.log(link_records)
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
                link_records.length = 0
                $(".for_nucloud").map((idx, item) => {
                    $(item).prop('checked', false)
                    if (idx == $(".for_nucloud").length - 1) {
                        sendResponse("finish")
                    }
                })
            } else if ("get_url_list" == request.type) {
                sendResponse(link_records);
                let nu_code = localStorage.getItem('nu_code')
                if (nu_code != undefined && nu_code.length != 0) {
                    link_records = []
                } else {
                    alert('please login first')
                }
            }
            return true
        }
    );

    function addcheck(item, idx) { //選取影片
        var x = document.createElement("INPUT");
        x.setAttribute("type", "checkbox");
        x.setAttribute("class", "for_nucloud")
        if (idx != -1) {
            x.setAttribute('rank', idx)
        }
        x.addEventListener('click', (ev) => {
            ev.stopPropagation()
            let data = {}
            let link_record = {}
            let parent = $(ev.target)[0].parentNode.parentNode.parentNode
            let endl = decodeURIComponent("%0A")
            let end = $(parent)[0].innerText.indexOf(endl)
            if (end == -1) {
                data.title = $(parent).find("h3,.nDgy9d")[0].innerText
            } else {
                data.title = $(parent).find("h3,.nDgy9d")[0].innerText.slice(0, end)
            }
            try {
                if ($(ev.target).next().length) {
                    if ($(ev.target).next()[0].className == 'P5BnJb') {
                        data.describe = "-"
                    } else {
                        data.describe = $(ev.target).closest(".vsc,.rc").find(".st")[0].innerText
                    }
                } else {
                    data.describe = $(ev.target).closest(".vsc,.rc").find(".st")[0].innerText
                }
            } catch (e) {}
            data.url = $($(ev.target)[0].parentNode).attr('href').indexOf('://') == -1 ? window.location.origin + $($(ev.target)[0].parentNode).attr('href') : $($(ev.target)[0].parentNode).attr('href')
            data.type = 'google'
            data.viewcnt = "-"
            data.likecnt = "-"
            data.dislikecnt = "-"
            if ($(ev.target)[0].hasAttribute('rank')) {
                link_record.title = data.title
                let url_obj = new URL(data.url)
                link_record.url = data.url
                link_record.site = url_obj.origin
                let search_obj = new URLSearchParams(window.location.search)
                link_record.term = search_obj.get('q')
                link_record.source = 'google'
                link_record.track_time = date2str(new Date())
                if (search_obj.get('start') != null) {
                    link_record.rank = parseInt($(ev.target).attr('rank')) + parseInt(search_obj.get('start')) + 1
                } else {
                    link_record.rank = parseInt($(ev.target).attr('rank')) + 1
                }
                if ($(ev.target).closest(".vsc,.rc").find(".f").length) {
                    let time_info = $(ev.target).closest(".vsc,.rc").find(".f")[0].innerText.slice(0, -3)
                    link_record.post_time = handletime(time_info)
                } else {
                    link_record.post_time = '-'
                }
            }
            if ($(ev.target).prop('checked')) {
                collect_list.push(data)
                if ($(ev.target)[0].hasAttribute('rank')) {
                    link_records.push(link_record)
                }
            } else {
                let del_at
                collect_list.forEach((item, idx) => {
                    if (item.url == data.url) {
                        del_at = idx
                        return
                    }
                })
                collect_list.splice(del_at, 1)
                if ($(ev.target).hasAttribute('rank')) {
                    link_records.forEach((item, i) => {
                        if (item.url == data.url) {
                            link_records.splice(i, 1)
                            return
                        }
                    })

                }
            }
        })
        if ($(item).find('input').length == 0) { //判斷是否已加入過checkbox
            $(item).prepend(x)
        }
    }

    let srh_rsts = $(".g .r > a") //搜尋結果
    srh_rsts.map((idx, item) => {
        addcheck(item, idx)
    })
    let focus_news = $(".dbsr > a") //焦點新聞
    focus_news.map((idx, item) => {
        addcheck(item, -1)
    })

    let adver_list = $(".V0MxL") //廣告
    adver_list.map((idx, item) => {
        addcheck(item, -1)
    })
})()
// @url: 
// @site:
// @term: 
// @title:
// @abstract:
// @score:
// @source:   // source url or search engine 
// @post_time:   // birth date of this url
// @track_time:   // the date such record is produced
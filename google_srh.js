let collect_list = []

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
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

function addcheck(item) { //選取影片
    var x = document.createElement("INPUT");
    x.setAttribute("type", "checkbox");
    x.setAttribute("class", "for_nucloud")
    x.addEventListener('click', (ev) => {
        ev.stopPropagation()
        let data = {}
        let parent = $(ev.target)[0].parentNode
        let endl = decodeURIComponent("%0A")
        let end = $(parent)[0].innerText.indexOf(endl)
        if (end == -1) {
            data.title = $(parent)[0].innerText
        } else {
            data.title = $(parent)[0].innerText.slice(0, end)
        }
        if ($(ev.target).next().length) {
            if ($(ev.target).next()[0].className == 'P5BnJb') {
                data.describe = "-"
            } else {
                data.describe = $(ev.target).closest(".vsc,.rc").find(".st")[0].innerText
            }
        } else {
            data.describe = $(ev.target).closest(".vsc,.rc").find(".st")[0].innerText
        }
        data.url = $(parent).attr('href')
        data.type = 'google'
        data.viewcnt = "-"
        data.likecnt = "-"
        data.dislikecnt = "-"
        if ($(ev.target).prop('checked')) {
            collect_list.push(data)
        } else {
            let del_at
            collect_list.forEach((item, idx) => {
                if (item.url == data.url) {
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

let srh_rsts = $(".g .r > a") //搜尋結果
srh_rsts.map((idx, item) => {
    addcheck(item)
})
let focus_news = $(".dbsr > a") //焦點新聞
focus_news.map((idx, item) => {
    addcheck(item)
})

let adver_list = $(".V0MxL") //廣告
adver_list.map((idx, item) => {
    addcheck(item)
})
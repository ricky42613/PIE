(function() {
    function save_data(data, cb) {
        chrome.runtime.sendMessage({
            type: 'save_data',
            data: data,
            db_name: 'crome_crawler'
        }, function(r) {
            cb(r)
        })
    }
    let curtime = new Date()
    let year = '' + curtime.getFullYear()
    let month = curtime.getMonth() + 1 < 10 ? '0' + (curtime.getMonth() + 1) : '' + (curtime.getMonth() + 1)
    let date = curtime.getDate() < 10 ? '0' + curtime.getDate() : '' + curtime.getDate()
    let hour = curtime.getHours() < 10 ? '0' + curtime.getHours() : '' + curtime.getHours()
    let min = curtime.getMinutes() < 10 ? '0' + curtime.getMinutes() : '' + curtime.getMinutes()
    let sec = curtime.getSeconds() < 10 ? '0' + curtime.getSeconds() : '' + curtime.getSeconds()
    let data = {}
    data.time = year + month + date + hour + min + sec
    data.title = document.title
    data.url = window.location.href
    data.text = document.body.innerText
    data.type = "history"
    data.articleID = document.title
    save_data(data, r => {
        console.log(r)
    })
})()
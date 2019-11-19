chrome.runtime.sendMessage({ //取得標籤列表
    type: 'idlist',
}, function(response) {
    console.log(response)
    $('#page_link')[0].value = response.link
    response.list.forEach(element => {
        $('#todo').prepend("<li>" + element + " <a href='#' aria-hidden='true'>&times;</a></li>");
    });

});

$("#home").on("click", function() {
    chrome.browserAction.setPopup({ //設定popup頁面
        "popup": "popup.html"
    }, function() {
        window.location.href = "popup.html";
    })
})

$('#add').click(function() { //新增標籤
    if ($("input[name=task]").val().length) {
        chrome.runtime.sendMessage({
            type: 'add_id',
            target: $("input[name=task]").val()
        }, function(response) {
            $('#todo').prepend("<li>" + $("input[name=task]").val() + " <a href='#' aria-hidden='true'>&times;</a></li>");
        });
    }
    if ($("#list_file")[0].files.length) {
        var resultFile = document.getElementById("list_file").files[0];
        if (resultFile) {
            var reader = new FileReader();
            reader.readAsText(resultFile, 'UTF-8');
            reader.onload = function(e) {
                var urlData = this.result;
                let arr = urlData.split("\n").map((elem, idx) => {
                    if (elem[elem.length - 1] == '\n') {
                        return elem.slice(0, -1)
                    } else {
                        return elem
                    }
                })
                chrome.runtime.sendMessage({
                    type: 'add_idlist',
                    target: arr
                }, function(response) {
                    arr.forEach(item => {
                        $('#todo').prepend("<li>" + item + " <a href='#' aria-hidden='true'>&times;</a></li>");
                    })
                })
            };
        }
    }
});

$("body").on('click', '#todo a', function() { //刪除標籤
    let target = $(this).closest("li")[0].innerText.slice(0, -3) //取得標籤名稱
    let node = $(this).closest("li")[0]
    chrome.runtime.sendMessage({
        type: 'del_id',
        target: target
    }, function(response) {
        node.remove();
        console.log(response)
    })
});

$('#page_send').on('click', function(e) {
    let k = parseInt($('#page_top_k')[0].value)
    let page_link = $('#page_link')[0].value
    chrome.runtime.sendMessage({
        type: 'get_links',
        topk: k,
        page_link: page_link
    }, function(rsp) {
        console.log(rsp)
        let str = ''
        rsp.forEach((item, idx) => {
            str = str + "<li>" + item + " <a href='#' aria-hidden='true'>&times;</a></li>"
            if (idx == rsp.length - 1) {
                $('#todo').html(str)
            }
        })
    })
})

$("#send").on('click', function(e) {
    let k = parseInt($('#top_k')[0].value)
    let name = $('#task_name')[0].value
    chrome.runtime.sendMessage({
        type: 'parse_post',
        topk: k,
        task: name
    }, function(response) {
        alert(response)
    })
})

$("#list_file").on('change', function(e) {
    $("#filename")[0].innerText = e.target.files[0].name
})

$('#logout').on('click', function() {
    chrome.runtime.sendMessage({
        type: "logout"
    });
    chrome.browserAction.setPopup({
        "popup": "login.html"
    }, function() {
        console.log('set')
        window.location.href = "login.html";
    })
})
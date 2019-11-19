// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
//your code here
//Site/nu43542/Driver/#file_path=nu43542/Driver/Favorites&main_type=mydrive
let acn = localStorage.getItem('acn')
let myurl = "http://" + localStorage.getItem("domain") + "/Site/" + acn + "/Driver/#file_path=" + acn + "/Driver/Favorites&main_type=mydrive"
console.log(myurl)
$('body #my_site_link').prepend(`<a id="mysite" style="margin-left: 30px" href='${myurl}'>我的收藏</a><br/>`)
$('#mysite').on('click', function() {
    chrome.tabs.create({
        url: $(this).attr('href')
    });
    return false;
});
chrome.runtime.sendMessage({ //取得標籤列表
    type: 'taglist',
}, function(response) {
    console.log(response)
    response.forEach(element => {
        $('#todo').append("<li><a href='#'aria-hidden='true' class='extend'>&#x271A;</a>" + element.name + " <a class='del' href='#' aria-hidden='true'>&times;</a></li><ul></ul>");
    });
});
//----------------------------------------------------//
//auto parse
let btn = $('#myonoffswitch')
chrome.runtime.sendMessage({
    type: 'switch',
}, function(response) {
    console.log(response)
    btn.prop('checked', response)
});

btn.on('click', function() {
    chrome.runtime.sendMessage({
        type: 'clk_switch',
    }, function(response) {
        console.log(response)
    })
});
//----------------------------------------------------//
//fbmsg
let msg_btn = $('#fbmsg')
chrome.runtime.sendMessage({
    type: 'fbmsg',
}, function(response) {
    console.log(response)
    msg_btn.prop('checked', response)
})
msg_btn.on('click', function() {
    chrome.runtime.sendMessage({
        type: 'clk_fbmsg',
    }, function(response) {
        console.log(response)
    })
});
//----------------------------------------------------//
//bkup_btn
let bk_btn = $('#fb_bkup')
chrome.runtime.sendMessage({
    type: 'bkup',
}, function(response) {
    console.log(response)
    bk_btn.prop('checked', response)
});
bk_btn.on('click', function() {
    chrome.runtime.sendMessage({
        type: 'clk_bkup',
    }, function(response) {
        console.log(response)
    })
});
//----------------------------------------------------//
//post wall
let pwbtn = $('#fb_postwall')
chrome.runtime.sendMessage({
    type: 'postwall',
}, function(response) {
    console.log(response)
    pwbtn.prop('checked', response)
})
pwbtn.on('click', function() {
    chrome.runtime.sendMessage({
        type: 'clk_postwall',
    }, function(response) {
        console.log(response)
    })
});
//----------------------------------------------------//
//search btn
let srhbtn = $('#fb_searchrst')
chrome.runtime.sendMessage({
    type: 'srh',
}, function(response) {
    console.log(response)
    srhbtn.prop('checked', response)
})
srhbtn.on('click', function() {
    chrome.runtime.sendMessage({
        type: 'clk_srh',
    }, function(response) {
        console.log(response)
    })
});
//----------------------------------------------------//
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

$('#add').click(function() { //新增標籤
    chrome.runtime.sendMessage({
        type: 'add_tag',
        name: $("input[name=task]").val()
    }, function(response) {
        console.log(response)
        $('#todo').append("<li><a href='#'aria-hidden='true' class='extend'>&#x271A;</a>" + $("input[name=task]").val() + " <a class='del' href='#' aria-hidden='true'>&times;</a></li><ul></ul>");
    });
});

$("body").on('click', '#todo .del', function() { //刪除標籤
    let target = $(this).closest("li")[0].innerText.slice(1, -2) //取得標籤名稱
    console.log(target)
    let node = $(this).closest("li")
    chrome.runtime.sendMessage({
        type: 'del_tag',
        name: target
    }, function(response) {
        node.remove();
        console.log(response)
    })
});
$("#fb_analy").on('click', function() {
    chrome.browserAction.setPopup({ //設定popup頁面
        "popup": "fb_analy.html"
    }, function() {
        window.location.href = "fb_analy.html";
    })
})

$('#work_queue').on('click', function() {
    chrome.browserAction.setPopup({
        "popup": "w_que.html"
    }, function() {
        window.location.href = "w_que.html"
    })
})


$("body").on('click', '#todo .extend', function() { //刪除標籤
    let target = $(this).closest("li")[0].innerText.slice(1, -2) //取得標籤名稱
    let node = $(this).closest("li")[0].nextSibling
    if (node.children.length == 0) {
        chrome.runtime.sendMessage({
            type: 'extend_tag',
            name: target
        }, function(response) {
            let arr = response.children
            arr.forEach(item => {
                $(node).append("<li>" + item.name + " <a class='del_child' href='#' aria-hidden='true'>&times;</a></li>")
            })
            $(node).append(`<li><input class="add_child" type="text" style="width:60px"/></li>`)
        })
    } else {
        node.innerHTML = ""
    }
});

$("body").on("keypress", ".add_child", function(e) {
    if (e.originalEvent.code == 'Enter') {
        if (this.value.length) {
            let data = {}
            let parent = this.parentNode.parentNode
            let tmp = this
            data.target = this.value
            data.parent = parent.previousSibling.innerText.slice(1, -2)
            data.type = "add_child"
            chrome.runtime.sendMessage(data, function(response) {
                console.log(response)
                $(parent).prepend("<li>" + data.target + " <a class='del_child' href='#' aria-hidden='true'>&times;</a></li>")
                tmp.value = ""
            })
        }
    }
})

$("body").on('click', ".del_child", function() {
    console.log("this")
    let data = {}
    let node = this
    data.target = $(this).closest("li")[0].innerText.slice(0, -2)
    data.parent = this.parentNode.parentNode.previousSibling.innerText.slice(1, -2)
    data.type = "del_child"
    chrome.runtime.sendMessage(data, function(response) {
        console.log(response)
        $(node.parentNode).remove()
    })
})
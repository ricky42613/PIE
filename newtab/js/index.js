function make_node(title, url) {
    let newtitle = title.length > 11 ? title.slice(0, 11) + '...' : title
    let str = `<div class="col-lg-3 course_col">
                    <div class="course">
                        <a href="${url}">
                            <div class="course_body" title="${title}">
                                <h3 class="course_title">${newtitle}</h3>
                            </div>
                        </a>
                    </div>
                </div>`
    return str
}

function make_rst(title, url, content, time) {
    let newcontent = content.length < 30 ? content : content.slice(0, 30) + '...'
    let str = `<div class="col-lg-3 course_col">
                    <div class="course">
                        <a href="${url}">
                            <div class="course_body">
                                <h3 class="course_title">${title}</h3>
                                <div class="course_teacher">${time}</div>
                                <div class="course_text">
                                    <p>${newcontent}</p>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>`
    return str
}

chrome.topSites.get(arr => {
    arr = arr.slice(0, 8)
    arr.map((item, idx) => {
        if (idx < 4) {
            $('#courses_row1').append(make_node(item.title, item.url))
        } else {
            $('#courses_row2').append(make_node(item.title, item.url))
        }
    })
})

chrome.management.getAll(list => {
    let flag = [0, 0] //0 for check gmail ,1 for check utube
    list.forEach(item => {
        if (item.type != "extension") {
            if (item.name.toLowerCase() == "gmail") {
                flag[0] = 1
            } else if (item.name.toLowerCase() == "youtube") {
                flag[1] = 1
            }
            let str = `<li><a class="google_app" id="${item.id}" href="#">${item.name}</a></li>`
            $('#app_bar').append(str)
        }
    });
    if (!flag[0]) {
        let str = `<li><a href="https://mail.google.com/mail">Gmail</a></li>`
        $('#app_bar').append(str)
    }
    if (!flag[1]) {
        let str = `<li><a href="https://www.youtube.com/">Youtube</a></li>`
        $('#app_bar').append(str)
    }
})


$("body").on('click', '.google_app', function() {
    chrome.management.launchApp(this.id)
})

$(document).on("change", "select", function() {
    $("option[value=" + this.value + "]", this)
        .attr("selected", true).siblings()
        .removeAttr("selected")
});

$("#search").on('click', function(e) {
    e.preventDefault();
    $('#result_row1').html('')
    $('#result_row2').html('')
    let key = $('#search_key')[0].value
    let type = $('[selected=selected]')[0].value
        //q is string
    console.log(type)
    if (type != 'google') {
        if (type == "facebook") {
            let q = '@author:' + key + ',@content:' + key
            let msg = {
                type: 'query_nudb',
                query: q,
                db: 'fb_post',
                and_match: 0,
                ps: 8,
                p: 1
            }
            chrome.runtime.sendMessage(msg, r => {
                console.log(r)
                r.result.recs.forEach((item, idx) => {
                    if (idx < 4) {
                        $('#result_row1').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                    } else {
                        $('#result_row2').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                    }
                })
                $('#result_name').text('Search result:' + key + '(' + type + ')')
                $('#result_name').attr('page', '1')
                $('#search_rst').css('display', 'block')
            })
        } else if (type == "history") {
            let q = '@text:' + key + ',@title:' + key
            let msg = {
                type: 'query_nudb',
                query: q,
                db: 'crome_crawler',
                and_match: 0,
                ps: 8,
                p: 1
            }
            chrome.runtime.sendMessage(msg, r => {
                console.log(r)
                r.result.recs.forEach((item, idx) => {
                    if (!item.rec.hasOwnProperty('text')) {
                        item.rec.text = ''
                    }
                    if (!item.rec.hasOwnProperty('time')) {
                        item.rec.time = ''
                    }
                    if (idx < 4) {
                        $('#result_row1').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                    } else {
                        $('#result_row2').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                    }
                })
                $('#result_name').text('Search result:' + key + '(' + type + ')')
                $('#result_name').attr('page', '1')
                $('#search_rst').css('display', 'block')
            })
        }
    } else {
        let url = 'https://www.google.com/search?q=' + encodeURIComponent(key)
        window.location.href = url
    }
})

function get_key(str) {
    let start = str.indexOf(":")
    let end = str.lastIndexOf("(")
    let data = {}
    data.name = str.slice(start + 1, end)
    data.type = str.slice(end + 1, -1)
    return data
}

$('#next').on('click', function(e) {
    let rst = $('#result_name').text()
    let rst_info = get_key(rst)
    let key = rst_info.name
    let type = rst_info.type
    let page = parseInt($($('#result_name')[0]).attr('page')) + 1
    console.log(page)
    if (type == "facebook") {
        let q = '@author:' + key + ',@content:' + key
        let msg = {
            type: 'query_nudb',
            query: q,
            db: 'fb_post',
            and_match: 0,
            ps: 8,
            p: page
        }
        chrome.runtime.sendMessage(msg, r => {
            console.log(r)
            if (r.result.recs.length) {
                $('#result_row1').html('')
                $('#result_row2').html('')
            }
            r.result.recs.forEach((item, idx) => {
                if (idx < 4) {
                    $('#result_row1').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                } else {
                    $('#result_row2').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                }
            })
            $('#result_name').text('Search result:' + key + '(' + type + ')')
            $('#result_name').attr('page', page)
            $('#search_rst').css('display', 'block')
            if (page != 1) {
                $('#prev').css('display', 'block')
            }
        })
    } else if (type == "history") {
        let q = '@text:' + key + ',@title:' + key
        let msg = {
            type: 'query_nudb',
            query: q,
            db: 'crome_crawler',
            and_match: 0,
            ps: 8,
            p: page
        }
        chrome.runtime.sendMessage(msg, r => {
            console.log(r)
            if (r.result.recs.length) {
                $('#result_row1').html('')
                $('#result_row2').html('')
            }
            r.result.recs.forEach((item, idx) => {
                if (!item.rec.hasOwnProperty(text)) {
                    item.rec.text = ''
                }
                if (!item.rec.hasOwnProperty(time)) {
                    item.rec.time = ''
                }
                if (idx < 4) {
                    $('#result_row1').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                } else {
                    $('#result_row2').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                }
            })
            $('#result_name').text('Search result:' + key + '(' + type + ')')
            $('#result_name').attr('page', page)
            $('#search_rst').css('display', 'block')
            if (page != 1) {
                $('#prev').css('display', 'block')
            }
        })
    }
})

$('#prev').on('click', function(e) {
    let rst = $('#result_name').text()
    let rst_info = get_key(rst)
    let key = rst_info.name
    let type = rst_info.type
    let page = parseInt($($('#result_name')[0]).attr('page')) - 1
    console.log(page)
    if (type == "facebook") {
        let q = '@author:' + key + ',@content:' + key
        let msg = {
            type: 'query_nudb',
            query: q,
            db: 'fb_post',
            and_match: 0,
            ps: 8,
            p: page
        }
        chrome.runtime.sendMessage(msg, r => {
            console.log(r)
            if (r.result.recs.length) {
                $('#result_row1').html('')
                $('#result_row2').html('')
            }
            r.result.recs.forEach((item, idx) => {
                if (idx < 4) {
                    $('#result_row1').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                } else {
                    $('#result_row2').append(make_rst(item.rec.author, item.rec.post_link, item.rec.content, item.rec.post_date))
                }
            })
            $('#result_name').text('Search result:' + key + '(' + type + ')')
            $('#result_name').attr('page', page)
            $('#search_rst').css('display', 'block')
            if (page == 1) {
                $('#prev').css('display', 'none')
            }
        })
    } else if (type == "history") {
        let q = '@text:' + key + ',@title:' + key
        let msg = {
            type: 'query_nudb',
            query: q,
            db: 'crome_crawler',
            and_match: 0,
            ps: 8,
            p: page
        }
        chrome.runtime.sendMessage(msg, r => {
            console.log(r)
            if (r.result.recs.length) {
                $('#result_row1').html('')
                $('#result_row2').html('')
            }
            r.result.recs.forEach((item, idx) => {
                if (!item.rec.hasOwnProperty(text)) {
                    item.rec.text = ''
                }
                if (!item.rec.hasOwnProperty(time)) {
                    item.rec.time = ''
                }
                if (idx < 4) {
                    $('#result_row1').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                } else {
                    $('#result_row2').append(make_rst(item.rec.title, item.rec.url, item.rec.text, item.rec.time))
                }
            })
            $('#result_name').text('Search result:' + key + '(' + type + ')')
            $('#result_name').attr('page', page)
            $('#search_rst').css('display', 'block')
            if (page == 1) {
                $('#prev').css('display', 'none')
            }
        })
    }
})
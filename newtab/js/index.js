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

function highlight(str, key) {
    var index = str.toLowerCase().indexOf(key.toLowerCase());
    if (index >= 0) {
        let newstr = str.substring(0, index) + "<span class='search_word'>" + key + "</span>" + str.substring(index + key.length);
        return newstr
    } else {
        return str
    }
}

function make_rst(title, url, content, time, key) {
    let key_start = content.toLowerCase().indexOf(key.toLowerCase())
    let title_start = title.toLowerCase().indexOf(key.toLowerCase())
    let newcontent
    let newtitle

    if (key_start < 40) {
        key_start = 0
        newcontent = content.length < 150 ? content : content.slice(key_start, 150) + '...'
    } else {
        key_start = key_start - 40
        newcontent = content.length < 150 ? content : '...' + content.slice(key_start, key_start + 150) + '...'
    }

    if (title_start < 20) {
        title_start = 0
        newtitle = title.length < 40 ? title : title.slice(title_start, 40) + '...'
    } else {
        title_start = title_start - 20
        newtitle = title.length < 80 ? title : '...' + title.slice(title_start, title_start + 40) + '...'
    }
    newtitle = highlight(newtitle, key)
    newcontent = highlight(newcontent, key)
    url_obj = new URL(url)
    let path_str = url_obj.protocol + "//" + url_obj.hostname + url_obj.pathname.replace(/\//g, " > ");
    let str = `<a href="${url}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h4 class="mb-1">${newtitle}</h5>
                        <small>${time}</small>
                    </div>
                    <small>${path_str}</small>
                    <p class="mb-1">
                        ${newcontent}
                    </p>
                </a>`
    return str
}

function change_pagenum_list(cur_page, direc) {
    let pages = [...document.getElementsByClassName("page-num")]
    console.log(pages)
    if (direc) {
        pages.forEach((item, idx) => {
            let tmp = cur_page + idx
            item.innerHTML = `<a class="page-link" href="#">${tmp}</a>`
        })
    } else {
        cur_page -= 4
        pages.forEach((item, idx) => {
            let tmp = cur_page + idx
            item.innerHTML = `<a class="page-link" href="#">${tmp}</a>`
        })
    }
}

function mark_cur_page(page) {
    let idx = parseInt(page) % 5 - 1 == -1 ? 4 : parseInt(page) % 5 - 1
    $('.page-num .page-link').css('color', 'initial')
    $('.page-num .page-link').eq(idx).css('color', 'red')
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
            let str = `<li class="nav-item"><a class="google_app nav-link" id="${item.id}" href="#">${item.name}</a></li>`
            $('#app_bar').append(str)
        }
    });
    if (!flag[0]) {
        let str = `<li class="nav-item"><a class="nav-link" href="https://mail.google.com/mail">Gmail</a></li>`
        $('#app_bar').append(str)
    }
    if (!flag[1]) {
        let str = `<li class="nav-item"><a class="nav-link" href="https://www.youtube.com/">Youtube</a></li>`
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

$(".search_btn").on('click', function(e) {
    e.preventDefault();
    $('#result_list').html('')
    let key = $('#search_key')[0].value
    let type = e.target.innerText
    console.log(type)
        //q is string
    if (type != 'Global') {
        let nu_code = localStorage.getItem('nu_code')
        if (nu_code == null || nu_code.length == 0) {
            alert('login first')
        } else {
            let q = key + ",+@type:history"
            let msg = {
                type: 'query_nudb',
                query: q,
                db: "crome_crawler",
                ps: 10,
                p: 1
            }
            chrome.runtime.sendMessage(msg, r => {
                console.log(r)
                if (r.result.recs.length < 10) {
                    $('#next').css("display", "none")
                }
                r.result.recs.forEach((item, idx) => {
                    if (!item.rec.hasOwnProperty('text')) {
                        item.rec.text = ''
                    }
                    if (!item.rec.hasOwnProperty('time')) {
                        item.rec.time = ''
                    }
                    if (!item.rec.hasOwnProperty('type')) {
                        item.rec.type = "history"
                    }
                    let url = item.rec.type.indexOf('post') == -1 ? item.rec.url : item.rec.post_link
                    let title = item.rec.type.indexOf('post') == -1 ? item.rec.title : item.rec.author
                    let content = item.rec.type.indexOf('post') == -1 ? item.rec.text : item.rec.content
                    console.log(title)
                    $('#result_list').append(make_rst(title, url, content, item.rec.time, key))
                });
                $('#rst_page').css({ "display": "block" });
                $('#prev').css('display', 'none')
                $('#rst_page').attr('page', '1')
                mark_cur_page(1)
            })
        }
    } else {
        let url = 'https://www.google.com/search?q=' + encodeURIComponent(key)
        window.location.href = url
    }
})

$('#next').on('click', function(e) {
    let nu_code = localStorage.getItem('nu_code')
    if (nu_code == null || nu_code.length == 0) {
        alert('login first')
        return
    }
    let key = $('#search_key')[0].value
    let page = parseInt($('#rst_page').attr('page')) + 1
    let q = key + ',+@type:history'
    let msg = {
        type: 'query_nudb',
        query: q,
        db: 'crome_crawler',
        ps: 10,
        p: page
    }
    chrome.runtime.sendMessage(msg, r => {
        console.log(r)
        if (r.result.recs.length) {
            $('#result_list').html('')
        }
        if (r.result.recs.length < 10) {
            $('#next').css('display', 'none')
        }
        r.result.recs.forEach((item, idx) => {
            try {
                let url = item.rec.type.indexOf('post') == -1 ? item.rec.url : item.rec.post_link
                let title = item.rec.type.indexOf('post') == -1 ? item.rec.title : item.rec.author
                let content = item.rec.type.indexOf('post') == -1 ? item.rec.text : item.rec.content
                $('#result_list').append(make_rst(title, url, content, item.rec.time, key))
            } catch (e) {
                console.log(e)
            }
        })
        $('#rst_page').attr('page', page)
        $('#search_rst').css('display', 'block')
        if (page != 1) {
            $('#prev').css('display', 'block')
        }
        if (page % 5 == 1) {
            change_pagenum_list(page, 1)
        }
        mark_cur_page(page)
    })
})

$('#prev').on('click', function(e) {
    let nu_code = localStorage.getItem('nu_code')
    if (nu_code == null || nu_code.length == 0) {
        alert('login first')
        return
    }
    let key = $('#search_key')[0].value
    let page = parseInt($('#rst_page').attr('page')) - 1
    let q = key + ',+@type:history'
    let msg = {
        type: 'query_nudb',
        query: q,
        db: 'crome_crawler',
        ps: 10,
        p: page
    }
    chrome.runtime.sendMessage(msg, r => {
        console.log(r)
        if (r.result.recs.length) {
            $('#result_list').html('')
        }
        r.result.recs.forEach((item, idx) => {
            let url = item.rec.type.indexOf('post') == -1 ? item.rec.url : item.rec.post_link
            let title = item.rec.type.indexOf('post') == -1 ? item.rec.title : item.rec.author
            let content = item.rec.type.indexOf('post') == -1 ? item.rec.text : item.rec.content
            $('#result_list').append(make_rst(title, url, content, item.rec.time, key))
        })
        $('#rst_page').attr('page', page)
        $('#search_rst').css('display', 'block')
        $('#next').css('display', 'block')
        if (page == 1) {
            $('#prev').css('display', 'none')
        }
        if (page % 5 == 0) {
            change_pagenum_list(page, 0)
        }
        mark_cur_page(page)
    })
})

$(".page-num").on('click', function(e) {
    e.preventDefault()
    let nu_code = localStorage.getItem('nu_code')
    if (nu_code == null || nu_code.length == 0) {
        alert('login first')
        return
    }
    let page = parseInt(e.target.innerText)
    let key = $('#search_key')[0].value
    let q = key + ',+@type:history'
    let msg = {
        type: 'query_nudb',
        query: q,
        db: 'crome_crawler',
        ps: 10,
        p: page
    }
    chrome.runtime.sendMessage(msg, r => {
        console.log(r)
        if (r.result.recs.length) {
            $('#result_list').html('')
        }
        if (r.result.recs.length == 0) {
            alert("no data")
            return
        } else if (r.result.recs.length < 10) {
            $('#next').css('display', 'none')
        }
        r.result.recs.forEach((item, idx) => {
            let url = item.rec.type.indexOf('post') == -1 ? item.rec.url : item.rec.post_link
            let title = item.rec.type.indexOf('post') == -1 ? item.rec.title : item.rec.author
            let content = item.rec.type.indexOf('post') == -1 ? item.rec.text : item.rec.content
            $('#result_list').append(make_rst(title, url, content, item.rec.time, key))
        })
        $('#rst_page').attr('page', page)
        $('#search_rst').css('display', 'block')
        if (page == 1) {
            $('#prev').css('display', 'none')
        }
        mark_cur_page(page)
    })
})

$('#Logo').on('click', function(e) {
    e.preventDefault()
    window.location.reload()
})
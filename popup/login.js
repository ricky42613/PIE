$('#login').on('click', function() {
    let domain = $('#dmn')[0].value
    let act = $('#account')[0].value
    let pwd = $('#pwd')[0].value
    let test_url = 'http://' + domain
    $.ajax({ //確定domain是否可成功連線
        url: test_url,
        timeout: 60000,
        success: (rsp, status, xhr) => {
            if (status == 'success') {
                let login_api = 'http://' + domain + '/Site_Prog/API/plugin_api.php?mode=login&acn=' + act + '&pwd=' + pwd
                $.get(login_api, function(r) { //login
                    if (r.status == 'OK') {
                        console.log(r.nu_code)
                        let info = {
                            "nu_code": r.nu_code,
                            "acn": act,
                            "switch": true, //auto parse預設打開
                            "domain": domain
                        }
                        chrome.runtime.sendMessage({
                            type: 'user_info',
                            info: info
                        }, function(response) {
                            console.log(response)
                            chrome.browserAction.setPopup({ //設定popup頁面
                                "popup": "./popup/popup.html"
                            }, function() {
                                window.location.href = "popup.html";
                            })
                        })
                    } else {
                        alert('wrong acn/pwd')
                    }
                })
            }
        },
        error: (XMLHttpRequest, textStatus, errorThrown) => {
            console.log(textStatus)
            alert("can't connect to domain")
        }
    });
})
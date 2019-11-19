chrome.runtime.sendMessage({
    type: 'get_wq'
}, function(rsp) {
    rsp.forEach((item, idx) => {
        $('#todo').prepend("<li>" + item + "</li>");
    });
})



$('#logout').on('click', function() { //logout
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

$("#home").on("click", function() { //back to home
    chrome.browserAction.setPopup({
        "popup": "popup.html"
    }, function() {
        window.location.href = "popup.html";
    })
})
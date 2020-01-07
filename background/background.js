  // Copyright 2018 The Chromium Authors. All rights reserved.
  // Use of this source code is governed by a BSD-style license that can be
  // found in the LICENSE file.

  'use strict';

  function isArray(o) { //確認變數是否為陣列
      return Object.prototype.toString.call(o) == '[object Array]';
  }

  function send_to_nudb(url, data, nu_code, db_name) {
      $.get(url + '?mode=get_url', function(r) {
          let addr = r.url + 'Site_Prog/API/plugin_api.php'
          if (data.hasOwnProperty('title')) {
              data.title = data.title.replace(/[/\\?%*:|"<>]/g, '-'); //處理檔名避免特殊字
          }
          let pack = {}
              //rec必須為陣列
          if (isArray(data)) {
              pack.rec = data
          } else {
              pack.rec = [data]
          }
          if(pack.rec.length){
            if(pack.rec[0].type.indexOf("history")!=-1){
                console.log(pack.rec[0])
            }
            pack.nu_code = nu_code
            pack.db_name = db_name
            let str = JSON.stringify(pack)
            $.ajax({
                url: addr,
                type: 'POST',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: "mode=nudb_put&arg=" + encodeURIComponent(str),
                success: function(r) {
                    console.log(r)
                }
            })
          }
      })
  }

  let nu_code = localStorage.getItem("nu_code") == null ? "" : localStorage.getItem("nu_code")
  let acn = localStorage.getItem("acn") == null ? "" : localStorage.getItem("acn")
  let domain = localStorage.getItem("domain") == null ? "" : localStorage.getItem("domain")
  let switch_btn = localStorage.getItem("switch") == null ? false : localStorage.getItem("switch")
  let fbmsg_btn = localStorage.getItem("fbmsg") == null ? false : localStorage.getItem("fbmsg")
  let bkup_btn = localStorage.getItem("bkup") == null ? false : localStorage.getItem("bkup")
  let pw_btn = localStorage.getItem("pw") == null ? false : localStorage.getItem("pw")
  let srh_btn = localStorage.getItem("srh") == null ? false : localStorage.getItem("srh")
  let id_list = localStorage.getItem("id_list") == null ? [] : JSON.parse(localStorage.getItem("id_list"))
  let task_link = localStorage.getItem("task") == null ? "" : localStorage.getItem("task")
  let w_queue = localStorage.getItem('w_queue') == null ? [] : JSON.parse(localStorage.getItem("w_queue"))

  chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
          if ("get_wq" == request.type) {
              sendResponse(w_queue)
          }
          if ("idlist" == request.type) {
              let info = {
                  list: id_list,
                  link: task_link
              }
              sendResponse(info)
          }
          if ("add_id" == request.type) {
              if (id_list.indexOf(request.target) == -1) {
                  id_list.push(request.target)
                  localStorage.setItem("id_list", JSON.stringify(id_list))
                  sendResponse("ok")
              } else {
                  sendResponse('already exist')
              }
          }
          if ("add_idlist" == request.type) {
              if (request.target.length) {
                  id_list = id_list.concat(request.target)
                  localStorage.setItem("id_list", JSON.stringify(id_list))
                  sendResponse("ok")
              } else {
                  sendResponse('ok')
              }
          }
          if ("del_id" == request.type) {
              id_list.forEach((element, idx) => {
                  if (element.indexOf(request.target) != -1) {
                      id_list.splice(idx, 1)
                      localStorage.setItem("id_list", JSON.stringify(id_list))
                  }
              });
              sendResponse("ok")
          }
          if ("user_info" == request.type) { //登入成功時觸發
              nu_code = request.info.nu_code
              domain = request.info.domain
              switch_btn = request.info.switch
              localStorage.setItem("nu_code", nu_code)
              localStorage.setItem("domain", domain)
              localStorage.setItem("acn", request.info.acn)
              chrome.tabs.executeScript(null, {
                  code: "localStorage.setItem('nu_code','" + nu_code + "'); localStorage.setItem('domain','" + domain + "');"
              })
              sendResponse('got it');
          } else if ("switch" == request.type) { //儲存瀏覽紀錄開關
              sendResponse(switch_btn)
          } else if ("clk_switch" == request.type) {
              switch_btn = !switch_btn
              localStorage.setItem("switch", switch_btn)
              sendResponse("changed")
          } else if ("fbmsg" == request.type) { //儲存fb訊息紀錄開關
              sendResponse(fbmsg_btn)
          } else if ("clk_fbmsg" == request.type) {
              fbmsg_btn = !fbmsg_btn
              localStorage.setItem("fbmsg", fbmsg_btn)
              sendResponse("changed")
          } else if ("bkup" == request.type) {
              sendResponse(bkup_btn)
          } else if ("clk_bkup" == request.type) { //備份fb按鈕開關
              bkup_btn = !bkup_btn
              localStorage.setItem('bkup', bkup_btn)
              sendResponse("changed")
          } else if ("postwall" == request.type) { //儲存fb動態牆瀏覽紀錄開關
              sendResponse(pw_btn)
          } else if ("clk_postwall" == request.type) {
              pw_btn = !pw_btn
              localStorage.setItem('pw', pw_btn)
              sendResponse("changed")
          } else if ("srh" == request.type) { //儲存fb搜尋瀏覽紀錄開關
              sendResponse(srh_btn)
          } else if ("clk_srh" == request.type) {
              srh_btn = !srh_btn
              localStorage.setItem('srh', srh_btn)
              sendResponse("changed")
          } else if ("logout" == request.type) { //登出
              nu_code = ""
              acn = ""
              domain = ""
              switch_btn = false
              fbmsg_btn = false
              pw_btn = false
              srh_btn = false
              bkup_btn = false
              task_link = ""
              id_list = []
              w_queue = []
              localStorage.setItem("nu_code", nu_code)
              localStorage.setItem("domain", domain)
              localStorage.setItem("switch", switch_btn)
              localStorage.setItem("acn", acn)
              localStorage.setItem("fbmsg", false)
              localStorage.setItem("pw", false)
              localStorage.setItem("srh", false)
              localStorage.setItem("bkup", false)
              localStorage.setItem("task", "")
              localStorage.setItem("id_list", JSON.stringify(id_list))
              localStorage.setItem("w_queue", JSON.stringify(w_queue))
              chrome.tabs.executeScript(null, {
                  code: "localStorage.setItem('nu_code','" + nu_code + "'); localStorage.setItem('domain','" + domain + "');"
              })
          } else if (request.type == "save_data") {
              sendResponse('ok')
              if (nu_code.length && nu_code != undefined) {
                  send_to_nudb('http://' + domain + '/Site_Prog/API/plugin_api.php', request.data, nu_code, request.db_name)
              }
          }
          return true
      }
  );

  chrome.tabs.onActivated.addListener(function(info) {
      chrome.tabs.query({
          active: true,
          currentWindow: true
      }, function(tabs) {
          chrome.tabs.executeScript(tabs[0].id, {
              code: "localStorage.setItem('nu_code','" + nu_code + "'); localStorage.setItem('domain','" + domain + "');"
          })
          chrome.bookmarks.search({
              url: tabs[0].url
          }, function(rsp) {
              if (rsp.length) { //已存在書籤=>右鍵顯示刪除書籤
                  chrome.contextMenus.update('edit_bm', {
                      visible: false
                  })
                  chrome.contextMenus.update('del_bm', {
                      visible: true
                  })
              } else { //不存在書籤=>右鍵顯示儲存書籤
                  chrome.contextMenus.update('edit_bm', {
                      visible: true
                  })
                  chrome.contextMenus.update('del_bm', {
                      visible: false
                  })
              }
          })
      })
  })

  chrome.bookmarks.onCreated.addListener(function(id, bookmarks) {
      if (nu_code.length != 0 && nu_code != undefined) {
          chrome.contextMenus.update('edit_bm', {
              visible: false
          })
          chrome.contextMenus.update('del_bm', {
              visible: true
          })
      }
  })

  chrome.bookmarks.onRemoved.addListener(function(id, info) {
      chrome.contextMenus.update('edit_bm', {
          visible: true
      })
      chrome.contextMenus.update('del_bm', {
          visible: false
      })
  })

  chrome.tabs.onUpdated.addListener(function(tabID, info) {
      if (info.status == 'loading') {
          chrome.tabs.query({
              active: true,
              currentWindow: true
          }, function(tabs) {
              if (tabs[0].url.indexOf('www.facebook.com') != -1 && nu_code.length != 0) { //判斷目前頁面是否為FACEBOOK
                  chrome.tabs.executeScript(tabs[0].id, {
                      file: "jquery-latest.js"
                  }, function() {
                      chrome.tabs.executeScript(tabs[0].id, {
                          file: "jquery-min-ui.js"
                      }, function() {
                          if (pw_btn) {
                              chrome.tabs.executeScript(tabs[0].id, {
                                  'file': 'fb_post_wall.js'
                              })
                          }
                          if (fbmsg_btn) {
                              chrome.tabs.executeScript(tabs[0].id, {
                                  'file': 'fbmsg.js'
                              })
                          }
                          if (srh_btn) {
                              chrome.tabs.executeScript(tabs[0].id, {
                                  'file': 'fb_searchrst.js'
                              })
                          }
                          if (bkup_btn) {
                              chrome.tabs.executeScript(tabs[0].id, {
                                  'file': 'bkup_btn.js'
                              })
                          }
                      })
                  })
              }
          })
      }
      if (info.status == 'complete') {
          chrome.tabs.query({
              active: true,
              currentWindow: true
          }, function(tabs) {
              chrome.tabs.executeScript(tabs[0].id, {
                  code: "localStorage.setItem('nu_code','" + nu_code + "'); localStorage.setItem('domain','" + domain + "');"
              }, r => {
                  if (tabs[0].url.indexOf("www.youtube.com") != -1 && nu_code.length != 0) { //判斷頁面是否為youtube
                      chrome.tabs.executeScript(tabs[0].id, {
                          file: "jquery-3.3.1.min.js"
                      }, function() {
                          chrome.tabs.executeScript(tabs[0].id, {
                              'file': 'curpage.js'
                          })
                      })
                  }
                  if (tabs[0].url.indexOf("www.google.com/search") != -1 && nu_code.length != 0) {
                      chrome.tabs.executeScript(tabs[0].id, {
                          file: "jquery-3.3.1.min.js"
                      }, function() {
                          chrome.tabs.executeScript(tabs[0].id, {
                              file: 'google_srh.js'
                          })
                      })
                  }
                  chrome.bookmarks.search({
                      url: tabs[0].url
                  }, rsp => {
                      if (rsp.length) {
                          chrome.contextMenus.update('del_bm', {
                              visible: true
                          })
                          chrome.contextMenus.update('edit_bm', {
                              visible: false
                          })
                      }
                  })
                  if (nu_code.length != 0 && nu_code != undefined) { //need fix 
                      if (switch_btn) { //開關打開則儲存瀏覽紀錄
                          chrome.tabs.executeScript(tabs[0].id, {
                              file: "jquery-3.3.1.min.js"
                          }, function() {
                              chrome.tabs.executeScript(tabs[0].id, {
                                  file: 'chrome_crawler.js'
                              })
                          })
                      }
                  }
              })
          })
      }
  });
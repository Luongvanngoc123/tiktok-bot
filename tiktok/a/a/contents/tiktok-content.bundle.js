async function rotateApiCall(outerB64, innerB64) {
    try {
        const hosturl = 'http://127.0.0.1:33556';
        const rotateUrl = hosturl + "/tiktok/rotate";

        const resp = await fetch(rotateUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Base64anhTrong: innerB64,
                Bade64anhNgoai: outerB64,
                outputimage: false
            })
        });

        if (!resp.ok) throw new Error("Lỗi khi gọi rotate API: " + resp.status);

        const data = await resp.json();

        if (!data.success) {
            throw new Error("API trả về lỗi: " + JSON.stringify(data));
        }

        const angle = data.angle;

        console.log("angle =", angle);
        return {
            rotate:(360- angle) / 360,
         
        };

    } catch (err) {
        console.error("rotateApiCall error:", err);
        return null;
    }
}
async function puzzleApiCall(puzzleB64) {
    try {
        // Lấy host từ GitHub
        const hosturl = 'http://127.0.0.1:33556';
        const puzzleUrl = hosturl + "/tiktok/puzzle";

        // Gửi ảnh đến server
        const resp = await fetch(puzzleUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                base64_image: puzzleB64,
                outputimage:false
            })
        });

        if (!resp.ok) throw new Error("Lỗi khi gọi puzzle API: " + resp.status);
        const data = await resp.json();

        if (!data.success) {
            throw new Error("API trả về lỗi: " + JSON.stringify(data));
        }

        const slideXProportion = data.proportion ;
        console.log("slideXProportion = " + slideXProportion);
        return slideXProportion
    } catch (err) {
        console.error("puzzleApiCall error:", err);
        return null;
    }
}
async function shapesApiCall(imageB64) {
    try {
        const hosturl = 'http://127.0.0.1:33556';
        const sharpurl = hosturl + "/tiktok/twoobject";

        const resp = await fetch(sharpurl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                base64_image: imageB64,

                outputimage:false
            })
        });

        if (!resp.ok) throw new Error("Lỗi từ API: " + resp.status);
        const data = await resp.json();

        if (!data.success || !data.result || !data.result.diem1 || !data.result.diem2) {
            throw new Error("Dữ liệu trả về không hợp lệ: " + JSON.stringify(data));
        }

        const [x1, y1, proportion1] = data.result.diem1;
        const [x2, y2, proportion2] = data.result.diem2;

        // Giả sử proportion1 và proportion2 là mảng 2 phần tử, ta destructure tiếp:
        const [proportionx1, proportiony1] = proportion1;
        const [proportionx2, proportiony2] = proportion2;
        return {
            pointA: {
              abs: { x: x1, y: y1 },
              prop: { x: proportionx1, y: proportiony1 }
            },
            pointB: {
              abs: { x: x2, y: y2 },
              prop: { x: proportionx2, y: proportiony2 }
            }
          };
              

    } catch (err) {
        console.error("shapesApiCall error:", err);
        return null;
    }
}
(() => {
    "use strict";
    const e = {
            API_KEY: {
                key: "api_key",
                defaultValue: ""
            },
            APP_ID: {
                key: "appId",
                defaultValue: ""
            },
            POWER_ON: {
                key: "power_on",
                defaultValue: !0
            },
            TIKTOK: {
                key: "tiktok",
                defaultValue: {
                    delayClick: 500,
                    delaySwipe: 15,
                    loop: !0,
                    isActive: !0
                }
            },
            FUNCAPTCHA: {
                key: "funcaptcha",
                defaultValue: {
                    delayClick: 100,
                    loop: !0,
                    isActive: !0,
                    maxImageCaptcha: 25
                }
            },
            ZALO: {
                key: "zalo",
                defaultValue: {
                    delayClick: 100,
                    loop: !0,
                    isActive: !0
                }
            },
            SHOPEE: {
                key: "shopee",
                defaultValue: {
                    delaySwipe: 15,
                    loop: !0,
                    isActive: !0
                }
            },
            RECAPTCHAV2: {
                key: "reCaptchav2",
                defaultValue: {
                    delayClick: 500,
                    loop: !0,
                    isActive: !0,
                    useToken: !1
                }
            },
            AMZN: {
                key: "amzn",
                defaultValue: {
                    delayClick: 100,
                    loop: !0,
                    isActive: !0
                }
            },
            GEETEST: {
                key: "geetest",
                defaultValue: {
                    delayClick: 500,
                    delaySwipe: 15,
                    loop: !0,
                    isActive: !0
                }
            },
            SLIDE_ALL: {
                key: "slide_all",
                defaultValue: {
                    delaySwipe: 15,
                    loop: !0,
                    isActive: !0
                }
            },
            HCAPTCHA: {
                key: "hcaptcha",
                defaultValue: {
                    delayClick: 500,
                    delaySwipe: 15,
                    loop: !0,
                    isActive: !0
                }
            },
            CLOUDFLARE: {
                key: "cloudflare",
                defaultValue: {
                    delayClick: 2e3,
                    isActive: !0
                }
            }
        },
        t = async (e, t) => {
            const a = "undefined" != typeof browser ? browser.storage.local : chrome.storage.local,
                r = "undefined" != typeof browser ? browser.runtime : chrome.runtime;
            try {
                const o = await a.get([e]);
                if (r.lastError) throw new Error(`Error retrieving ${e}: ${r.lastError.message}`);
                return null != o[e] ? o[e] : t
            } catch (t) {
                throw console.error(`[storageHelpers] Error retrieving ${e}:`, t), t
            }
        };
    Promise.resolve();
    async function a(e, t, a) {
        const r = "undefined" != typeof browser ? browser.runtime : chrome.runtime;
        try {
            return await new Promise(((o, i) => {
                r.sendMessage({
                    source: e,
                    type: t,
                    data: a
                }, (e => {
                    r.lastError ? i(new Error(`Error sending message: ${r.lastError.message}`)) : o(e)
                }))
            }))
        } catch (e) {
            throw console.error(`[messageHelpers] Error in sending message: ${e.message}`), e
        }
    }
    function clickByProportion(el, px, py) {
    let rect = el.getBoundingClientRect();
    let clickX = rect.left + px * rect.width;
    let clickY = rect.top + py * rect.height;
    let ev = new MouseEvent("click", {
      bubbles: true,
      clientX: clickX,
      clientY: clickY
    });
    el.dispatchEvent(ev);
  }
    async function r(e) {
        return new Promise((t => setTimeout(t, e)))
    }
    async function ChuyenLinkSangB64(e) {
    let t = arguments.length > 1 && undefined !== arguments[1] ? arguments[1] : {
      timeout: 5000,
      maxRetries: 3
    };
    try {
      const {
        timeout: a,
        maxRetries: o
      } = t;
      function i(e) {
        for (const [t, a] of Object.entries(c)) if (e.includes(t)) {
          return a;
        }
        return 'image/png';
      }
      if (e instanceof HTMLCanvasElement || e.tagName && 'CANVAS' === e.tagName.toUpperCase()) {
        try {
          if (0 === e.width || 0 === e.height) {
            console.log('Canvas rỗng hoặc không có kích thước');
            return '';
          }
          const r = e.getBoundingClientRect();
          const l = r.width;
          const s = r.height;
          const u = document.createElement('canvas');
          u.width = l;
          u.height = s;
          u.getContext('2d').drawImage(e, 0, 0, l, s);
          const d = u.toDataURL('image/png').split(',')[1];
          return d || (console.log('Không thể lấy base64 từ canvas'), '');
        } catch (f) {
          console.log('Lỗi khi chụp màn hình canvas:', f);
          return '';
        }
      }
      if (e instanceof Element) {
        try {
          const g = e.src;
          if (g && g.startsWith('data:image/')) {
            const p = g.split(',')[1];
            return p || (console.log('Base64 rỗng từ src của element'), '');
          }
          e = g || '';
        } catch (m) {
          console.log('Lỗi khi xử lý element:', m);
          return '';
        }
      }
      if ('string' == typeof e && e.startsWith('blob:')) {
        console.log('Da vao blob');
        try {
          return await new Promise(t => {
            const a = new Image();
            a.setAttribute('crossOrigin', 'anonymous');
            const n = setTimeout(() => {
              t('');
            }, 1000);
            a.onload = function () {
              console.log('Vao trong onload');
              clearTimeout(n);
              try {
                const a = document.createElement('canvas');
                a.width = this.naturalWidth;
                a.height = this.naturalHeight;
                a.getContext('2d').drawImage(this, 0, 0);
                const n = i(e);
                a.toBlob(e => {
                  if (!e) {
                    return void t('');
                  }
                  const a = new FileReader();
                  a.onloadend = () => {
                    const e = a.result.split(',')[1];
                    t(e);
                  };
                  a.onerror = () => t('');
                  a.readAsDataURL(e);
                }, n);
              } catch (e) {
                console.log('Lỗi khi xử lý blob URL:', e);
                t('');
              }
            };
            a.onerror = () => {
              clearTimeout(n);
              t('');
            };
            a.src = e;
            console.log('This is img:');
            console.log('img src:', a.src);
          });
        } catch (w) {
          console.log('Lỗi khi xử lý blob URL:', w);
          return '';
        }
      }
      if ('string' == typeof e) {
        console.log('Vao den input string:');
        try {
          for (let y = 0; y < o; y++) {
            try {
              const k = new AbortController();
              const b = setTimeout(() => k.abort(), a);
              const v = await fetch(e, {
                signal: k.signal
              });
              clearTimeout(b);
              if (!v.ok) {
                throw new Error(`HTTP error ${v.status}`);
              }
              const T = await v.blob();
              return await new Promise((e, t) => {
                const a = new FileReader();
                a.onloadend = () => e(a.result.split(',')[1]);
                a.onerror = () => t(new Error('Failed to read blob as base64'));
                a.readAsDataURL(T);
              });
            } catch (E) {
              if (y === o - 1) {
                console.log('Hết lượt thử fetch:', E);
                return '';
              }
              await n(500);
            }
          }
        } catch (S) {
          console.log('Lỗi khi fetch URL:', S);
          return '';
        }
      }
      console.log('Đầu vào không được hỗ trợ:', e);
      return '';
    } catch (_) {
      console.log('Lỗi chung trong fetchImageToBase64:', _);
      return '';
    }
  }
    function o(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "success",
            a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null,
            r = document.getElementById("captcha-message");
        r || (r = document.createElement("div"), r.id = "captcha-message", r.style.zIndex = "99999999", r.style.padding = "3px 3px", r.style.borderRadius = "3px", r.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)", r.style.fontSize = "10px", r.style.fontWeight = "600", r.style.fontFamily = "Arial, sans-serif", r.style.textAlign = "center", r.style.whiteSpace = "nowrap", r.style.color = "white", r.style.top = "1px", a && a.parentElement ? (r.style.position = "absolute", r.style.left = "2px", a.parentElement.appendChild(r)) : (r.style.position = "fixed", r.style.left = "1px", document.body.appendChild(r)));
        const o = {
            success: "linear-gradient(90deg, #6a11cb,rgb(191, 37, 252))",
            error: "linear-gradient(90deg, #ff416c, #ff4b2b)",
            warning: "linear-gradient(90deg, #ff9a44, #fc6076)",
            info: "linear-gradient(90deg, #17a2b8, #138496)"
        };
        r.innerText = "[Dongdangkhoicoder] " + e, r.style.background = o[t] || o.success, r.style.display = "block"
    }
    async function i(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {
            timeout: 5e3,
            maxRetries: 3
        };
        try {
            const {
                timeout: a,
                maxRetries: o
            } = t, i = {
                arkoselabs: "image/jpeg"
            };

            function c(e) {
                for (const [t, a] of Object.entries(i))
                    if (e.includes(t)) return a;
                return "image/png"
            }
            if (e instanceof HTMLCanvasElement || e.tagName && "CANVAS" === e.tagName.toUpperCase()) try {
                if (0 === e.width || 0 === e.height) return console.log("Canvas rỗng hoặc không có kích thước"), "";
                const n = e.getBoundingClientRect(),
                    s = n.width,
                    l = n.height,
                    u = document.createElement("canvas");
                u.width = s, u.height = l;
                u.getContext("2d").drawImage(e, 0, 0, s, l);
                const h = "image/png",
                    d = u.toDataURL(h).split(",")[1];
                return d || (console.log("Không thể lấy base64 từ canvas"), "")
            } catch (p) {
                return console.log("Lỗi khi chụp màn hình canvas:", p), ""
            }
            if (e instanceof Element) try {
                const f = e.src;
                if (f && f.startsWith("data:image/")) {
                    const g = f.split(",")[1];
                    return g || (console.log("Base64 rỗng từ src của element"), "")
                }
                e = f || ""
            } catch (m) {
                return console.log("Lỗi khi xử lý element:", m), ""
            }
            if ("string" == typeof e && e.startsWith("blob:")) {
                console.log("Da vao blob");
                try {
                    return await new Promise((t => {
                        const a = new Image;
                        a.setAttribute("crossOrigin", "anonymous");
                        const r = setTimeout((() => {
                            t("")
                        }), 1e3);
                        a.onload = function() {
                            console.log("Vao trong onload"), clearTimeout(r);
                            try {
                                const a = document.createElement("canvas");
                                a.width = this.naturalWidth, a.height = this.naturalHeight;
                                a.getContext("2d").drawImage(this, 0, 0);
                                const r = c(e);
                                a.toBlob((e => {
                                    if (!e) return void t("");
                                    const a = new FileReader;
                                    a.onloadend = () => {
                                        const e = a.result.split(",")[1];
                                        t(e)
                                    }, a.onerror = () => t(""), a.readAsDataURL(e)
                                }), r)
                            } catch (e) {
                                console.log("Lỗi khi xử lý blob URL:", e), t("")
                            }
                        }, a.onerror = () => {
                            clearTimeout(r), t("")
                        }, a.src = e, console.log("This is img:"), console.log("img src:", a.src)
                    }))
                } catch (y) {
                    return console.log("Lỗi khi xử lý blob URL:", y), ""
                }
            }
            if ("string" == typeof e) {
                console.log("Vao den input string:");
                try {
                    for (let w = 0; w < o; w++) try {
                        const k = new AbortController,
                            b = setTimeout((() => k.abort()), a),
                            v = await fetch(e, {
                                signal: k.signal
                            });
                        if (clearTimeout(b), !v.ok) throw new Error(`HTTP error ${v.status}`);
                        const T = await v.blob();
                        return await new Promise(((e, t) => {
                            const a = new FileReader;
                            a.onloadend = () => e(a.result.split(",")[1]), a.onerror = () => t(new Error("Failed to read blob as base64")), a.readAsDataURL(T)
                        }))
                    } catch (S) {
                        if (w === o - 1) return console.log("Hết lượt thử fetch:", S), "";
                        await r(500)
                    }
                } catch (E) {
                    return console.log("Lỗi khi fetch URL:", E), ""
                }
            }
            return console.log("Đầu vào không được hỗ trợ:", e), ""
        } catch (_) {
            return console.log("Lỗi chung trong fetchImageToBase64:", _), ""
        }
    }

    function c(e, t) {
        return new Promise((a => {
            const r = Date.now(),
                o = setInterval((() => {
                    for (const t of e) {
                        if (document.querySelector(t)) return clearInterval(o), void a(!0)
                    }
                    Date.now() - r >= t && (clearInterval(o), a(!1))
                }), 500)
        }))
    }
    async function n(e) {
        console.log("Vao createTask utils");
        try {
            const t = await a("SOURCE", "createTask", e);
            return t || (console.error("No response from createTask"), "")
        } catch (e) {
            return console.error("Failed to create task:", e), ""
        }
    }
    async function s(e, t, r) {
        const o = JSON.stringify({
            clientKey: e,
            taskId: t
        });
        try {
            const e = await a("SOURCE", "getTaskResult", {
                data: o,
                timeWait: r
            });
            return e ? "fail" === e.status ? (console.error("API error:", e), {
                errorDescription: e.errorDescription
            }) : e.solution ? e.solution : e.type ? e : (console.error("Invalid API response: missing solution"), null) : (console.error("No result returned from getTaskResult"), null)
        } catch (e) {
            return console.error("Failed to get task result:", e), null
        }
    }
    let l, u, h, d, p, f;
    async function g() {
        console.log("Run setup tiktok..."), l = await t(e.POWER_ON.key, e.POWER_ON.defaultValue);
        const a = await t(e.TIKTOK.key, e.TIKTOK.defaultValue);
        h = a.delayClick, d = a.delaySwipe, p = a.loop, f = a.isActive, console.log("POWER_ON:", l), console.log("Da vao IS_ACTIVE:", f)
    }
    console.log("Run tiktok...", window.location.href);
    let m = !1,
        y = "";
    async function GiaiCaptchaRotate() {
        for (console.log("This is captchaRotate");;) {
            await r(500);
            var e, t = "";
            for (let e = 0; e < 10 && null == (t = document.querySelector('img[data-testid="whirl-outer-img"]')); e++) await r(1e3);
            if (e = document.querySelector('img[data-testid="whirl-inner-img"]'), !t || !e) return;
            o("Found captchaRotate", "red", t);
            var a = null,
                i = null;
            for (let o = 0; o < 10 && (a = t.src, i = e.src, "" === a || "" === i); o++) await r(1e3);
            if ("" === a || "" === i) {
                if (p) {
                    document.querySelector('a[class*="secsdk_captcha_refresh RefreshButton" i]').click();
                    continue
                }
                return
            }


            let s =  await  rotateApiCall (await ChuyenLinkSangB64(a), await ChuyenLinkSangB64(i))

            o("Solving...", "red", t);
            const g = 271 - 271 * parseFloat(s.rotate);
            var c = document.querySelector("#secsdk-captcha-drag-wrapper");
            if (await I(c, g), p) {
                if (await _("#secsdk-captcha-drag-wrapper", 500, 5e3)) {
                    console.log("Giải captcha thành công");
                    break
                }
                console.log("Giải captcha thất bại")
            }
        }
    }
    async function GiaiCaptchaRotateNew() {
        for (;;) {
            await r(500);
            var e, t = "";
            for (let e = 0; e < 10 && (null == (t = document.querySelector('[class*="captcha"]>[role="main"] [class*="cap-items-center "] img[class*="[210px]"]')) || x('[class*="captcha"]>[role="main"] [class*="cap-items-center "] img[class*="[210px]"]')); e++) await r(1e3);
            if (e = document.querySelector('[class*="captcha"]>[role="main"] [class*="cap-items-center "] img[class*="[128px]"]'), !t || !e) return;
            o("Found captchaRotate_new", "red", t);
            var a = null,
                c = null;
            for (let o = 0; o < 10 && (a = t.src, c = e.src, "" === a || "" === c); o++) await r(1e3);
            if ("" === a || "" === c) {
                if (p) {
                    R();
                    continue
                }
                return
            }
    
            let d = await  rotateApiCall (await ChuyenLinkSangB64(a), await ChuyenLinkSangB64(c))
            if (!d) {
                if (h) {
                R();
                continue;
                }
                break;
            }

            let f = parseFloat(d.rotate);
            if (isNaN(f)) {
                f = 0;
            }
            let slideBar = document.querySelector(".captcha-verify-container > div > div > div.cap-w-full > div.cap-rounded-full");
            let slideButton = document.querySelector( "div[draggable=true]:has(.secsdk-captcha-drag-icon)");
            let slideLength = slideBar.getBoundingClientRect().width;
            let iconLength = slideButton.getBoundingClientRect().width;
            let g = (slideLength - iconLength)* f;


            var h = document.querySelector('[class*="captcha"]>[role="main"] [class*="absolute"][draggable="true"]');

            if (o("Solving...", "red", t), await A(h, g), p) {
                if (!await _('[class*="captcha"]>[role="main"] svg [d*="M24 4"]', 500, 5e3)) {
                    console.log("Giải captcha thành công");
                    break
                }
                console.log("Giải captcha thất bại")
            }
        }
    }
    async function GiaiCaptchaKeoTha1() {
        for (console.log("captchaKeoTha");;) {
            await r(500);
            let t = null,
                a = null;
            for (let e = 0; e < 10 && (await r(1e3), t = document.querySelector("#captcha-verify-image"), null === t || null === t.src || "" === t.src || t.src === y || (a = t.src, y = a, null == a)); e++);
            if (o("Found captcha slide", "red", t), null === a) {
                if (o("image_url = null", "red", t), p) {
                    document.querySelector('a[class*="secsdk_captcha_refresh RefreshButton" i]').click();
                    continue
                }
                return
            }
        
            let tile= await puzzleApiCall (await ChuyenLinkSangB64(a));
            var e = document.querySelector("#secsdk-captcha-drag-wrapper > div:nth-child(2)");
            var p  = document.querySelector("#captcha-verify-image");

            
            let kte=  e.getBoundingClientRect();
            
            let endx= (tile * p.getBoundingClientRect().width) - (kte.width / 2) ;

            let d = parseInt(endx, 10);

            
            if (o("Solving...", "red", t), await KeoTuyChinh(e, d), p) {
                if (await _("#captcha-verify-image", 500, 5e3)) {
                    console.log("Giải captcha thành công");
                    break
                }
                console.log("Giải captcha thất bại")
            }
        }
    }
    async function GiaiCaptchaKeoThaNew() {
        for (console.log("captchaKeoTha_new");;) {
            await r(500);
            let a = null,
                c = null;
            for (let e = 0; e < 10; e++)
                if (await r(1e3), a = document.querySelector("#captcha-verify-image"), null !== a && null !== a.src && "" !== a.src && a.src !== y && !x("#captcha-verify-image")) {
                    c = a.src, y = c;
                    break
                } if (o("Found captchaKeoTha_new", "red", a), null === c) {
                if (o("image_url = null", "red", a), p) {
                    R();
                    continue
                }
                return
            }

            const r = await puzzleApiCall(await ChuyenLinkSangB64(c));
            if (!r) {
                if (h) {
                document.querySelector("a[class*=\"secsdk_captcha_refresh RefreshButton\" i]").click();
                continue;
                }
                return;
            }
            let f = parseFloat(r);
            let puzzleImageEle = document.querySelector('#captcha-verify-image');
            let button = document.querySelector('#captcha_slide_button');
            let g = ((puzzleImageEle.getBoundingClientRect().width   ) * f * 0.8 )- (button.getBoundingClientRect().width/3) - 5;
            var t = document.querySelector('[class*="captcha"]>[role="main"] [class*="absolute"][draggable="true"]');
            if (o("Solving...", "red", a), await A(t, g), p) {
                if (!await _('[class*="captcha"]>[role="main"] svg [d*="M24 4"]', 500, 5e3)) {
                    console.log("Giải captcha thành công");
                    break
                }
                console.log("Giải captcha thất bại")
            }
        }
    }
    async function GiaiCaptcha3D() {
        for (console.log("captcha3D");;) {
            await r(500);
            var e = null;
            for (let t = 0; t < 10 && (null == (e = document.querySelector("#captcha-verify-image")) || x('[class*="captcha_verify_container"] img')); t++) await r(1e3);
            if (!e) return;
            o("Found captcha3D", "red", e);
            var t = null;
            for (let a = 0; a < 10 && (await r(1e3), !(null != (t = e.src) && e.width > 0 && e.height > 0)); a++);
            if (null === t) {
                if (o("image_url = null", "red", e), p) {
                    document.querySelector('a[class*="secsdk_captcha_refresh" i]').click();
                    continue
                }
                return
            }
            const a = {
                    type: "Tiktok3DSelectObjectWebTask",
                    imageUrl: t,
                    widthView: e.width,
                    heightView: e.height
                },
                i = JSON.stringify({
                    clientKey: u,
                    task: a
                }),
                c = await n(i);
            if (!c || c.error) {
                if (o(c ? c.errorDescription : "No response", "red", e), p) {
                    document.querySelector('a[class*="secsdk_captcha_refresh" i]').click();
                    continue
                }
                return
            }
            const l = await s(u, c.taskId, 30);
            if (!l || l.errorDescription) {
                if (o(l ? l.errorDescription : "No result from API", "red", e), p) {
                    document.querySelector('a[class*="secsdk_captcha_refresh" i]').click();
                    continue
                }
                return
            }
            o("Solving...", "red", e);
            let d = parseInt(l.pointA.x, 10),
                f = parseInt(l.pointA.y, 10),
                g = parseInt(l.pointB.x, 10),
                m = parseInt(l.pointB.y, 10);
            if (D(e, d, f), await r(h), D(e, g, m), await r(h), document.querySelector('div[class*="verify-captcha-submit-button" i]').click(), p) {
                if (await _("#captcha-verify-image", 500, 5e3)) {
                    console.log("Giải captcha thành công");
                    break
                }
                console.log("Giải captcha thất bại")
            }
        }
    }
    async function GiaiCaptcha2DoiTuongNew() {
        for (console.log("captcha3D_new");;) {
            await r(500);
            var e = null;
            for (let t = 0; t < 15 && (null == (e = document.querySelector('[class*="captcha-verify-container"] img')) || x('[class*="captcha-verify-container"] img')); t++) await r(1e3);
            if (!e) return;
            o("Found captcha3D_new", "red", document.querySelector('[class*="captcha-verify-container"] [class*="cap-min-h-[180px]"]'));
            var t = null;
            for (let a = 0; a < 15 && (await r(1e3), !(null != (t = e.src) && e.width > 0 && e.height > 0)); a++);
            if (null === t) {
                if (o("image_url = null", "red", e), p) {
                    R();
                    continue
                }
                return
            }
          
            let a = await shapesApiCall(await ChuyenLinkSangB64(t));;
            console.log("Debug r:", a);
            if (!a) {
                if (h) {
                R();
                continue;
                }
                return;
            }

            clickByProportion(e, a.pointA.prop.x, a.pointA.prop.y);
            await r(s);
            clickByProportion(e, a.pointB.prop.x, a.pointB.prop.y);
            await r(s);
            document.querySelector("[class*=\"captcha-verify-container\"] [class*=\"cap-relative\"] [class=\"TUXButton-label\"]").click()
    
            if (!await _('[class*="captcha"]>[role="main"] svg [d*="M24 4"]', 500, 5e3)) {
                console.log("Giải captcha thành công");
                break
            }
            console.log("Giải captcha thất bại")
        
        }
    }

    function E(e) {
        return !!document.querySelector(e)
    }
    async function _(e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 100,
            a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 5e3;
        const r = Date.now();
        return async function o() {
            return !!document.querySelector(e) || !(Date.now() - r > a) && (await new Promise((e => setTimeout(e, t))), o())
        }()
    }
    function KeoTuyChinh(e, distance) {
    return new Promise((resolve) => {
        const rect = e.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endX = startX + distance;
        const endY = startY;
        const offset = 3 + Math.random() * 2; // 3–5px

        // Nhấn chuột xuống
        e.dispatchEvent(new MouseEvent("mousedown", {
            bubbles: true,
            clientX: startX,
            clientY: startY
        }));

        // Giữ 0.1s
        setTimeout(() => {
            // Kéo nhanh đến gần đích
            e.dispatchEvent(new MouseEvent("mousemove", {
                bubbles: true,
                clientX: endX - offset,
                clientY: startY + 2
            }));

            // === GIAI ĐOẠN 1: Lắc nhẹ quanh điểm gần đích ===
            let step = endX - offset;
            const phase1 = () => {
                if (step >= endX + offset) {
                    return phase2(); // sang giai đoạn 2
                }
                step += 1;
                e.dispatchEvent(new MouseEvent("mousemove", {
                    bubbles: true,
                    clientX: step,
                    clientY: startY
                }));
                setTimeout(phase1, Math.random() * 10);
            };

            // === GIAI ĐOẠN 2: Lắc lại theo hướng ngược ===
            const phase2 = () => {
                let step = endX + offset;
                const moveBack = () => {
                    if (step <= endX) {
                        return phase3();
                    }
                    step -= 1;
                    e.dispatchEvent(new MouseEvent("mousemove", {
                        bubbles: true,
                        clientX: step,
                        clientY: startY
                    }));
                    setTimeout(moveBack, Math.random() * 10);
                };
                moveBack();
            };

            // === GIAI ĐOẠN 3: Dao động 2–3 lần quanh đích ===
            const phase3 = () => {
                let count = 0;
                const repeat = 2 + Math.floor(Math.random() * 2); // 2–3 lần

                const shake = () => {
                    if (count >= repeat) {
                        // Thả chuột
                        e.dispatchEvent(new MouseEvent("mousemove", {
                            bubbles: true,
                            clientX: endX,
                            clientY: startY
                        }));
                        setTimeout(() => {
                            e.dispatchEvent(new MouseEvent("mouseup", {
                                bubbles: true,
                                clientX: endX,
                                clientY: endY
                            }));
                            resolve();
                        }, 500);
                        return;
                    }

                    // Lắc trái phải ±offset
                    for (let dir of [1, -1]) {
                        e.dispatchEvent(new MouseEvent("mousemove", {
                            bubbles: true,
                            clientX: endX + dir * offset,
                            clientY: startY + (Math.random() > 0.5 ? 1 : -1) * Math.random() * 2
                        }));
                    }

                    count++;
                    setTimeout(shake, 80 + Math.random() * 40);
                };

                shake();
            };

            phase1();
        }, 100);
    });
}


    function I(e, t) {
        return new Promise((a => {
            var r = new MouseEvent("mousedown", {
                bubbles: !0
            });
            e.dispatchEvent(r);
            var o = d,
                i = 0;
            ! function r() {
                i += 1;
                var c = new MouseEvent("mousemove", {
                    bubbles: !0,
                    clientX: i,
                    clientY: 0
                });
                if (e.dispatchEvent(c), i < t) setTimeout(r, o);
                else {
                    var n = new MouseEvent("mouseup", {
                        bubbles: !0
                    });
                    e.dispatchEvent(n), a()
                }
            }()
        }))
    }

    function A(e, t) {
        return new Promise((a => {
            var r = new DragEvent("dragstart", {
                bubbles: !0,
                clientX: 0,
                clientY: 8
            });
            e.dispatchEvent(r);
            var o = 0,
                i = d;
            ! function r() {
                o += 1;
                var c = new DragEvent("drag", {
                    bubbles: !0,
                    clientX: o,
                    clientY: 8
                });
                e.dispatchEvent(c), o < t ? setTimeout(r, i) : setTimeout((() => {
                    var t = new DragEvent("dragend", {
                        bubbles: !0
                    });
                    e.dispatchEvent(t), a()
                }), 1e3)
            }()
        }))
    }

    function D(e, t, a) {
        var r = e.getBoundingClientRect(),
            o = r.left + t,
            i = r.top + a,
            c = new MouseEvent("click", {
                bubbles: !0,
                clientX: o,
                clientY: i
            });
        e.dispatchEvent(c)
    }

    function R() {
        for (var e = document.querySelectorAll('[class*="captcha-verify-container"] button'), t = 0; t < e.length; t++) {
            if (e[t].querySelector('[d*="M56"]')) {
                e[t].click();
                break
            }
        }
    }

    function x(e) {
        const t = document.querySelector(e);
        return t ? "IMG" === t.tagName || "IFRAME" === t.tagName ? !t.complete : !!t.classList.contains("loading") : (console.warn(`Phần tử với selector "${e}" không tồn tại.`), !1)
    }

    function C(e) {
        if (!e) return console.warn("Không tìm thấy phần tử!"), null;
        const t = e.parentElement;
        if (!t) return console.warn("Phần tử không có cha hợp lệ!"), null;
        return t.clientWidth - e.clientWidth
    }
    new MutationObserver((async (e, t) => {
        await async function(e) {
            if (console.log("Run handleElementMutation..."), await g(), l && f)
                for (const t of e) {
                    if (console.log("[Tiktok] Run for mutationsList"), console.log("[Tiktok] Mutation type", t.type), "childList" !== t.type) continue;
                    const e = document.querySelector('[role="dialog"][class*="captcha"]');
                    if (console.log("[Tiktok] isElementVisible", m), e && !m) {
                        m = !0, await r(1500);
                        try {
                            if (!await c(['img[data-testid="whirl-outer-img" i]', 'img[class*="captcha_verify_img_slide" i]', 'div[class*="verify-captcha-submit-button" i]', '[class*="captcha-verify-container"] [class="TUXButton-label"]', '[class*="captcha"]>[role="main"] [class*="cap-items-center "] img', '[class*="captcha"]>[role="main"] img[class*="cap-w-full cap-h-auto"]'], 1e4)) {
                                console.log("[Tiktok] Không thấy elementExists");
                                continue
                            }
                            for (let e = 0; e < 30; e++) {
                                if (console.log("Vòng lặp: ", e), E('img[data-testid="whirl-outer-img" i]')) {
                                    console.log("Tìm thấy captchaRotate"), await GiaiCaptchaRotate();
                                    break
                                }
                                if (E('img[class*="captcha_verify_img_slide" i]')) {
                                    console.log("Tìm thấy captchaKeoTha"), await GiaiCaptchaKeoTha1();
                                    break
                                }
                                if (E('div[class*="verify-captcha-submit-button" i]')) {
                                    console.log("Tìm thấy captcha3D"), await GiaiCaptcha3D();
                                    break
                                }
                                if (E('[class*="captcha"]>[role="main"] [class="cap-flex cap-absolute "][style*="left: 0px;"]') && 2 === document.querySelectorAll('[class*="captcha"]>[role="main"] [class*="cap-relative"] img').length) {
                                    console.log("Tìm thấy captchaKeoTha_new"), await GiaiCaptchaKeoThaNew();
                                    break
                                }
                                if (E('[class*="captcha-verify-container"] [class="TUXButton-label"]') && "Confirm" === document.querySelector('[class*="captcha-verify-container"] [class="TUXButton-label"]').textContent || E('[class*="captcha"]>[role="main"] img[class*="cap-w-full cap-h-auto"]')) {
                                    console.log("Tìm thấy captcha3D_new"), await GiaiCaptcha2DoiTuongNew();
                                    break
                                }
                                if (E('[class*="captcha"]>[role="main"] [class*="cap-items-center "] img') && document.querySelectorAll('[class*="captcha"]>[role="main"] [class*="cap-items-center "] img').length >= 2) {
                                    console.log("Tìm thấy captchaRotate_new"), await GiaiCaptchaRotateNew();
                                    break
                                }
                                await r(1e3)
                            }
                        } catch (e) {
                            console.log("Lỗi:", e), o(`Error: ${e.message}`, "red")
                        } finally {
                            m = !1
                        }
                    }
                }
        }(e)
    })).observe(document.body, {
        childList: !0,
        subtree: !0
    }), (async () => {
        await g()
    })()
})();
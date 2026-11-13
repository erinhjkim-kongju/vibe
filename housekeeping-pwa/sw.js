/* 지출 관리 가계부 서비스 워커: 앱 파일을 기기에 저장해 인터넷 없이도 열리게 한다.
   앱 파일을 고친 뒤에는 아래 VERSION 값을 바꿔야 새 버전이 적용된다. */
var VERSION = "v1";
var CACHE = "gagyebu-" + VERSION;
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/xlsx.full.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("gagyebu-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // 글꼴(구글 폰트): 저장된 것을 먼저 쓰고 뒤에서 새로 받아 둔다. 없으면 기기 글꼴로 표시된다.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // 화면 이동: 인터넷이 되면 최신 파일, 안 되면 저장해 둔 파일
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }
  // 그 밖의 앱 파일: 저장해 둔 파일 우선
  event.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});

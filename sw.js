/* オフライン対応用 Service Worker
   ・HTML本体は「ネット優先・オフライン時はキャッシュ」＝更新が確実に届きつつ圏外でも動く
   ・その他（manifest/icon等）は「キャッシュ優先」＝高速＆オフライン対応
   アプリを更新したら下の CACHE のバージョン番号を上げてください（例 v2 → v3）。*/
const CACHE = "otona-bunkasai-quiz-v2";
const ASSETS = ["./", "index.html", "manifest.json", "icon.svg"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.method!=="GET") return;

  // HTML（ページ遷移）はネット優先：最新を取得しキャッシュ更新、オフライン時はキャッシュへフォールバック
  const isDoc = req.mode==="navigate" || (req.destination==="document") ||
                (req.headers.get("accept")||"").includes("text/html");
  if(isDoc){
    e.respondWith(
      fetch(req).then(res=>{
        if(res && res.status===200){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put("index.html", copy)); }
        return res;
      }).catch(()=> caches.match(req).then(hit=> hit || caches.match("index.html")))
    );
    return;
  }

  // それ以外はキャッシュ優先（無ければ取得してキャッシュ）
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit) return hit;
      return fetch(req).then(res=>{
        if(res && res.status===200 && res.type==="basic"){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)); }
        return res;
      }).catch(()=>undefined);
    })
  );
});

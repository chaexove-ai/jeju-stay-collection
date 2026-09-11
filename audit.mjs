/* 전수 점검 —— verify.mjs 가 「고쳐둔 것이 그대로인가」를 본다면
   이쪽은 「아직 못 본 것이 없는가」를 훑는다. 32페이지 전부를 돌면서
   링크·메타·접근성·중복 id·콘솔 오류를 모은다. */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const MIME = {".html":"text/html;charset=utf-8",".xml":"application/xml",".txt":"text/plain",
              ".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",
              ".svg":"image/svg+xml",".ico":"image/x-icon",".json":"application/json",
              ".webmanifest":"application/manifest+json"};
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if(!path.extname(f)){
    if(fs.existsSync(f+".html")) f = f+".html";
    else f = path.join(f,"index.html");
  }
  if(!f.startsWith(DIST) || !fs.existsSync(f)){ res.writeHead(404); return res.end("404"); }
  res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});
  res.end(fs.readFileSync(f));
});
await new Promise(r=>server.listen(0,r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const notes = [];
const say  = m => console.log("  · " + m);
const flag = m => { console.log("  ! " + m); notes.push(m); };

const urls = [...fs.readFileSync("dist/sitemap.xml","utf8").matchAll(/<loc>[^<]*?\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m=>m[1] || "/");

const browser = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const ctx = await browser.newContext({viewport:{width:1440,height:1000}});
await ctx.route("**/*", route => {
  const u = route.request().url();
  if(u.startsWith(BASE)) return route.continue();
  if(/\.(png|jpe?g|webp|avif)(\?|$)/i.test(u))
    return route.fulfill({status:200, contentType:"image/gif",
      body:Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==","base64")});
  return route.fulfill({status:200, contentType:"text/plain", body:""});
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e => errs.push("pageerror " + e));
p.on("console", m => { if(m.type()==="error") errs.push("console " + m.text()); });

const canon = new Map();
const seenLinks = new Set();

console.log(`\n[전수 점검 ${urls.length}쪽]`);
for(const u of urls){
  const res = await p.goto(BASE+u, {waitUntil:"networkidle"});
  if(res.status()!==200){ flag(`${u} 응답 ${res.status()}`); continue; }

  const r = await p.evaluate(()=>{
    const meta = n => (document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)||{}).content || "";
    const ids = [...document.querySelectorAll("[id]")].map(e=>e.id);
    const dup = ids.filter((x,i)=>ids.indexOf(x)!==i);
    const imgs = [...document.querySelectorAll("img")];
    /* 언어 전환 링크는 당연히 반대 언어를 가리킨다 —— 검사에서 뺀다 */
    const links = [...document.querySelectorAll("a[href]")]
      .filter(a=>!a.closest(".lang")).map(a=>a.getAttribute("href"));
    const btns = [...document.querySelectorAll("button")]
      .filter(b=>!b.textContent.trim() && !b.getAttribute("aria-label") && !b.querySelector("[aria-label]"))
      .map(b=>b.className || b.id || "button");
    const alts = imgs.filter(i=>!i.hasAttribute("alt")).length;
    const h1 = [...document.querySelectorAll("h1")].map(x=>x.textContent.trim());
    const alt = [...document.querySelectorAll('link[rel="alternate"]')]
      .map(l=>l.hreflang+"="+l.getAttribute("href"));
    return {
      lang: document.documentElement.lang,
      title: document.title,
      desc: meta("description"),
      ogTitle: meta("og:title"), ogImg: meta("og:image"),
      canonical: (document.querySelector('link[rel="canonical"]')||{}).href || "",
      alt, dup, links, btns, alts, h1,
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent),
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      emptyText: [...document.querySelectorAll("[data-t]")].filter(e=>!e.textContent.trim()).length
    };
  });

  const zh = u.startsWith("/zh");
  const want = zh ? "zh-Hant" : "en";
  if(r.lang !== want) flag(`${u} <html lang> ${r.lang} (${want} 기대)`);
  if(!r.title) flag(`${u} title 없음`);
  if(r.title.length > 65) flag(`${u} title ${r.title.length}자 —— 검색결과에서 잘림`);
  /* 한자는 한 자가 담는 양이 많아 길이 기준이 다르다 */
  const lo = zh ? 30 : 70, hi = zh ? 80 : 165;
  if(!r.desc) flag(`${u} description 없음`);
  else if(r.desc.length < lo || r.desc.length > hi) flag(`${u} description ${r.desc.length}자 (${lo}~${hi} 권장)`);
  if(r.h1.length !== 1) flag(`${u} h1 ${r.h1.length}개`);
  if(r.dup.length) flag(`${u} 중복 id [${[...new Set(r.dup)]}]`);
  if(r.alts) flag(`${u} alt 없는 img ${r.alts}개`);
  if(r.btns.length) flag(`${u} 이름 없는 버튼 [${[...new Set(r.btns)].slice(0,3)}]`);
  if(r.over > 0) flag(`${u} 가로 ${r.over}px 넘침`);
  if(r.emptyText) flag(`${u} 빈 data-t ${r.emptyText}개`);
  if(r.alt.length !== 3) flag(`${u} hreflang ${r.alt.length}개`);
  if(canon.has(r.canonical)) flag(`${u} canonical 중복 (${canon.get(r.canonical)} 와 같음)`);
  canon.set(r.canonical, u);
  if(!r.ld.length) flag(`${u} 구조화 데이터 없음`);
  for(const j of r.ld){ try{ JSON.parse(j); }catch(e){ flag(`${u} ld+json 깨짐`); } }
  /* 이 페이지의 언어에 맞는 링크만 있어야 한다 */
  const strayList = r.links.filter(h=>h && h.startsWith("/") &&
    (zh ? !h.startsWith("/zh") : h.startsWith("/zh")));
  if(strayList.length) flag(`${u} 언어가 다른 내부 링크 [${[...new Set(strayList)].slice(0,3)}]`);
  r.links.forEach(h=>{ if(h && h.startsWith("/")) seenLinks.add(h); });
}

/* 링크가 실제로 열리는지 */
console.log("\n[내부 링크]");
let broken = 0;
for(const h of seenLinks){
  const res = await p.request.get(BASE + h);
  if(res.status() !== 200){ flag(`끊긴 링크 ${h} → ${res.status()}`); broken++; }
}
say(`${seenLinks.size}개 내부 링크 확인, 끊김 ${broken}`);

/* 없는 주소 */
console.log("\n[그 밖]");
const four = await p.request.get(BASE+"/stay/does-not-exist");
say(`없는 주소 응답 ${four.status()} ${fs.existsSync("dist/404.html")?"(404.html 있음)":"(404.html 없음 —— 호스팅 기본 화면)"}`);

if(errs.length) flag(`콘솔/JS 오류 ${errs.length}건: ${errs.slice(0,3).join(" | ")}`);
else say("32쪽 전부 JS 오류 0");

await ctx.close(); await browser.close(); server.close();
console.log(notes.length ? `\n▲ 살펴볼 것 ${notes.length}건` : "\n문제 없음");

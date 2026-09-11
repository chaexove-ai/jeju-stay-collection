/* 빌드 결과 검증 —— dist/ 를 정적 서버로 띄우고 헤드리스 브라우저로 훑는다.
   외부 요청(폰트, 지도, 사진, GA)은 전부 가로막는다 —— 이 컨테이너는 밖으로 못 나간다. */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const MIME = {".html":"text/html;charset=utf-8",".xml":"application/xml",".txt":"text/plain",
              ".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg"};

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

const browser = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const fails = [];
const ok = m => console.log("  ✓ " + m);
const bad = m => { console.log("  ✗ " + m); fails.push(m); };

async function newPage(w=1440,h=1000){
  const ctx = await browser.newContext({viewport:{width:w,height:h}});
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
  p.on("pageerror", e => errs.push(String(e)));
  p.on("console", m => { if(m.type()==="error") errs.push(m.text()); });
  return {p, ctx, errs};
}

const IDS = JSON.parse(fs.readFileSync("dist/sitemap.xml","utf8")
  .match(/\/stay\/[^<]+/g).map(s=>s.replace("/stay/","")).reduce((a,c)=>(a.push(c),a),[]) .length
  ? JSON.stringify(fs.readFileSync("dist/sitemap.xml","utf8").match(/\/stay\/([^<]+)/g).map(s=>s.replace("/stay/","")))
  : "[]");

/* ── 1. 목록 페이지 ── */
console.log("\n[목록 페이지]");
{
  const {p, ctx, errs} = await newPage();
  await p.goto(BASE+"/", {waitUntil:"networkidle"});

  const cards = await p.$$eval(".card h3 a", els=>els.map(e=>e.dataset.detail));
  cards.length===15 ? ok(`카드 15장 (${cards.length})`) : bad(`카드 수 ${cards.length}, 15 기대`);
  cards[cards.length-1]==="dotlwat"
    ? ok("도틀왓 마지막") : bad(`마지막 카드가 도틀왓이 아님: ${cards[cards.length-1]}`);
  cards.indexOf("dotlwat")===14 ? ok("도틀왓 단 한 번, 맨 끝") : bad("도틀왓 위치 이상");

  const heroCap = await p.textContent("#heroCap").catch(()=>null);
  heroCap && !/dotlwat|도틀왓/i.test(heroCap) ? ok(`히어로: ${heroCap}`) : bad(`히어로 이상: ${heroCap}`);

  const links = await p.$$eval(".card h3 a", a=>a.map(x=>x.getAttribute("href")));
  links.every(h=>h.startsWith("/stay/")) ? ok("카드 제목 → /stay/*") : bad("카드 제목 링크 이상");

  const tog = await p.$$eval("button[data-toggle]", b=>b.length);
  tog>0 ? ok(`인라인 객실 펼치기 ${tog}곳`) : bad("인라인 객실 펼치기 없음");
  {
    const b = await p.$("button[data-toggle]");
    const id = await b.getAttribute("data-toggle");
    await b.click();
    const open = await p.$eval("#rooms-"+id, e=>getComputedStyle(e).display!=="none");
    open ? ok("펼치기 동작") : bad("펼쳐지지 않음");
    const gap = await p.$eval("#rooms-"+id+" .room-n", e=>{
      const n=e.getBoundingClientRect(), s=e.parentElement.querySelector(".room-s");
      return s ? s.getBoundingClientRect().top - n.bottom : 99;
    });
    gap>=0 ? ok(`객실명/인원 줄바꿈 (간격 ${gap.toFixed(1)}px)`) : bad(`객실명과 인원이 겹침 (${gap.toFixed(1)}px)`);
    const rl = await p.$$eval("#rooms-"+id+" .room", a=>a.map(x=>x.getAttribute("href")));
    rl.every(h=>/airbnb\./i.test(h)) ? ok("객실 각각 에어비앤비 직결") : bad("객실 링크 이상");
    await b.click();
  }

  const btns = await p.$$eval(".card .btn", a=>a.map(x=>x.getAttribute("href")));
  btns.every(h=>/airbnb\./i.test(h)) ? ok("카드 CTA → 에어비앤비 직결") : bad("카드 CTA 링크 이상");

  const newly = await p.$$eval(".card .stars", els=>els.filter(e=>/Newly listed/.test(e.textContent)).length);
  newly===4 ? ok("표본 부족 4곳 Newly listed") : bad(`Newly listed ${newly}곳, 4 기대`);

  const avg = await p.textContent(".avg b").catch(()=>null);
  avg ? ok(`평균 평점 ${avg}`) : bad("평균 평점 미표시");

  await p.click('.chip[data-v="g3"]');
  const after = await p.$$eval(".card", e=>e.length);
  after>0 && after<15 ? ok(`인원 필터 동작 (15 → ${after})`) : bad(`필터 결과 ${after}`);
  await p.click('.chip[data-f="guests"][data-v="all"]');

  await p.click('.lang button[data-lang="zh"]');
  await p.waitForTimeout(120);
  const zh = await p.textContent(".coll-head h2");
  /住宿/.test(zh) ? ok(`언어 전환 (${zh})`) : bad(`언어 전환 실패: ${zh}`);
  const zhCards = await p.$$eval(".card", e=>e.length);
  zhCards===15 ? ok("전환 후에도 15장") : bad(`전환 후 ${zhCards}장`);
  await p.click('.lang button[data-lang="en"]');

  /* 지도 */
  {
    const mini = await p.$$eval(".mmap", e=>e.length);
    mini===1 ? ok("작은 지도 있음") : bad(`작은 지도 ${mini}개`);
    const tiles = await p.$$eval(".mmap-tiles img", e=>e.length);
    tiles>=4 ? ok(`작은 지도 타일 ${tiles}장`) : bad(`타일 ${tiles}장`);
    const dots = await p.$$eval(".mmap-dots i", e=>e.length);
    dots===15 ? ok("작은 지도 점 15개") : bad(`점 ${dots}개`);
    const lib0 = await p.$$eval('script[src*="leaflet"]', e=>e.length);
    lib0===0 ? ok("첫 화면에서 Leaflet 미로드") : bad("Leaflet 이 처음부터 실려 있음");
    await p.click("#mmap");
    await p.waitForTimeout(300);
    const hid = await p.$eval("#grid", e=>e.hidden);
    const shown = await p.$eval("#mapwrap", e=>!e.hidden);
    hid && shown ? ok("지도 전환 동작") : bad("지도 전환 실패");
    const back = await p.$eval("#backList", e=>!e.hidden);
    back ? ok("목록 복귀 버튼 노출") : bad("복귀 버튼 없음");
    await p.click("#backList");
    await p.waitForTimeout(150);
    const back2 = await p.$eval("#grid", e=>!e.hidden);
    back2 ? ok("목록 복귀 동작") : bad("목록 복귀 실패");
  }

  const ow = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ow<=0 ? ok("가로 스크롤 없음") : bad(`가로 넘침 ${ow}px`);
  errs.length===0 ? ok("JS 에러 0") : bad("JS 에러: "+errs.join(" | "));
  await p.screenshot({path:"v-index.png", fullPage:false});
  await ctx.close();
}

/* ── 2. 모바일 ── */
console.log("\n[모바일 390px]");
{
  const {p, ctx, errs} = await newPage(390,844);
  await p.goto(BASE+"/", {waitUntil:"networkidle"});
  const ow = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ow<=0 ? ok("가로 스크롤 없음") : bad(`가로 넘침 ${ow}px`);
  errs.length===0 ? ok("JS 에러 0") : bad("JS 에러: "+errs.join(" | "));
  await p.screenshot({path:"v-index-m.png"});
  await ctx.close();
}

/* ── 3. 상세 페이지 전수 ── */
console.log(`\n[상세 페이지 ${IDS.length}개]`);
{
  const {p, ctx, errs} = await newPage();
  let maps=0;
  for(const id of IDS){
    const res = await p.goto(`${BASE}/stay/${id}`, {waitUntil:"networkidle"});
    const problems=[];
    if(res.status()!==200) problems.push("status "+res.status());
    const h1 = (await p.textContent("h1").catch(()=>""))?.trim();
    if(!h1) problems.push("h1 없음");
    const air = await p.$$eval('a[data-prop]', a=>a.map(x=>x.getAttribute("href")));
    if(!air.length || !air.every(h=>/airbnb\./i.test(h))) problems.push("에어비앤비 링크 이상");
    const map = await p.$$eval('.mapbox iframe', a=>a.length);
    if(map>1) problems.push("지도 "+map+"개");
    if(map===1) maps++;
    const back = await p.getAttribute(".crumb a","href");
    if(back!=="/") problems.push("뒤로가기 링크 "+back);
    const mini = await p.$$eval(".mini", e=>e.length);
    if(mini!==4) problems.push("다른 숙소 "+mini+"개");
    const self = await p.$$eval(".mini", (e,i)=>e.filter(x=>x.getAttribute("href")==="/stay/"+i).length, id);
    if(self) problems.push("자기 자신이 추천에 포함됨");
    const ow = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(ow>0) problems.push("가로 넘침 "+ow);
    const ld = await p.$$eval('script[type="application/ld+json"]', s=>s.length);
    if(ld!==1) problems.push("구조화 데이터 "+ld);
    problems.length ? bad(`${id}: ${problems.join(", ")}`) : ok(id);
  }
  console.log(`  · 지도 있는 페이지 ${maps}/${IDS.length} (좌표 없는 숙소는 지도 섹션 자체가 없음)`);
  errs.length===0 ? ok("JS 에러 0") : bad("JS 에러: "+errs.slice(0,3).join(" | "));
  await p.goto(`${BASE}/stay/${IDS[0]}`, {waitUntil:"networkidle"});
  await p.screenshot({path:"v-stay.png", fullPage:false});
  await p.click('.lang button[data-lang="zh"]');
  await p.waitForTimeout(150);
  const zh = await p.textContent(".band h2");
  /設施|訂房|位置|其他/.test(zh) ? ok(`상세 언어 전환 (${zh})`) : bad(`상세 언어 전환 실패: ${zh}`);
  await ctx.close();
}

/* ── 4. 모바일 상세 ── */
console.log("\n[상세 모바일]");
{
  const {p, ctx, errs} = await newPage(390,844);
  await p.goto(`${BASE}/stay/${IDS[0]}`, {waitUntil:"networkidle"});
  const ow = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ow<=0 ? ok("가로 스크롤 없음") : bad(`가로 넘침 ${ow}px`);
  errs.length===0 ? ok("JS 에러 0") : bad("JS 에러: "+errs.join(" | "));
  await p.screenshot({path:"v-stay-m.png"});
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails.length ? `\n실패 ${fails.length}건\n` : "\n전부 통과\n");
process.exit(fails.length?1:0);

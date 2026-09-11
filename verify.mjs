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

async function newPage(w=1440,h=1000,touch=false){
  /* touch:true 는 진짜 손가락 기기를 흉내 낸다 —— 창만 좁힌 데스크톱에서는
     hover 가 그대로 살아 있어서 「터치에서 호버가 안 걸리는지」를 못 잰다. */
  const ctx = await browser.newContext(touch
    ? {viewport:{width:w,height:h}, isMobile:true, hasTouch:true, deviceScaleFactor:2}
    : {viewport:{width:w,height:h}});
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


/* 상단 막대의 좌우 여백 —— 본문과 같은 자리에서 시작하고 끝나야 한다.
   .wrap 과 .bar-in 이 같은 요소에 붙어 있어서, .bar-in 이 padding 을
   한 줄로 쓰면 .wrap 이 준 좌우값이 통째로 0 이 된다. 한 번 그랬다. */
async function checkBar(p, label){
  const m = await p.evaluate(()=>{
    const bar=document.querySelector(".bar").getBoundingClientRect();
    const brand=document.querySelector(".brand").getBoundingClientRect();
    const lang=document.querySelector(".lang").getBoundingClientRect();
    const body=document.querySelector(".coll .wrap > .coll-head").getBoundingClientRect();
    return { left:Math.round(brand.left-bar.left), right:Math.round(bar.right-lang.right),
             bodyLeft:Math.round(body.left) };
  });
  const same = m.left===m.bodyLeft && m.right===m.bodyLeft;
  same && m.left>0
    ? ok(`${label} 상단 막대 여백 ${m.left}px (본문과 동일)`)
    : bad(`${label} 막대 좌 ${m.left} / 우 ${m.right} / 본문 ${m.bodyLeft}`);
}

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

  /* 히어로는 세 칸 —— 서로 다른 숙소여야 하고, 도틀왓은 절대 올라오면 안 된다 */
  const hero = await p.$$eval(".hero-img .hcell", els=>els.map(e=>({
    id:e.dataset.detail, href:e.getAttribute("href"), cap:e.querySelector(".hc").textContent.trim()
  })));
  const ids = hero.map(h=>h.id);
  hero.length===3 && new Set(ids).size===3
    ? ok(`히어로 3곳 (${hero.map(h=>h.cap).join(" / ")})`) : bad(`히어로 ${hero.length}칸 [${ids}]`);
  !ids.includes("dotlwat") ? ok("히어로에 도틀왓 없음") : bad("도틀왓이 히어로에 올라옴");
  hero.every(h=>h.href && h.href.startsWith("/stay/"))
    ? ok("히어로 각 칸 → 상세 페이지") : bad("히어로 링크 이상");

  const links = await p.$$eval(".card h3 a", a=>a.map(x=>x.getAttribute("href")));
  links.every(h=>h.startsWith("/stay/")) ? ok("카드 제목 → /stay/*") : bad("카드 제목 링크 이상");

  await checkBar(p, "데스크톱");

  /* 카드 호버 —— 얹으면 눈에 띄게 달라져야 한다. 버튼 배경이 어두워지고
     카드가 떠오르는지, 실제 계산된 값으로 확인한다. */
  {
    const base = await p.$eval(".card:nth-child(3) .btn", e=>getComputedStyle(e).backgroundColor);
    await p.hover(".card:nth-child(3) .thumb");
    await p.waitForTimeout(320);
    const hov  = await p.$eval(".card:nth-child(3) .btn", e=>getComputedStyle(e).backgroundColor);
    const card = await p.$eval(".card:nth-child(3)", e=>{
      const s=getComputedStyle(e);
      return { t:s.transform, sh:s.boxShadow, bd:s.borderColor };
    });
    base!==hov ? ok(`카드 호버 → 버튼 ${base} → ${hov}`) : bad(`버튼 색 그대로 ${base}`);
    /* 한 줄 강조 —— 같은 글자를 한 겹 더 얹고 왼쪽부터 열어 보인다.
       겹의 글자 폭이 원본과 어긋나면 호버할 때마다 글자가 흔들린다. */
    const ink = await p.evaluate(()=>{
      const el=[...document.querySelectorAll(".incl")].find(e=>e.dataset.txt);
      if(!el) return {none:true};
      const a=getComputedStyle(el,"::after");
      return { txt:el.dataset.txt, matches: a.content.includes(el.dataset.txt),
               clip:a.clipPath, stroke:a.webkitTextStrokeWidth, color:a.color };
    });
    !ink.none && ink.matches && /inset/.test(ink.clip)
      ? ok(`한 줄 강조 겹 (${ink.txt} · ${ink.stroke})`) : bad(`강조 겹 ${JSON.stringify(ink)}`);
    card.t!=="none" && card.sh!=="none"
      ? ok("카드 호버 → 떠오름 + 그림자") : bad(`transform ${card.t} / shadow ${card.sh}`);
    await p.hover(".coll-head h2");
    await p.waitForTimeout(200);
  }

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
  const zhHero = await p.$$eval(".hero-img .hc", e=>e.map(x=>x.textContent.trim()));
  zhHero.some(t=>/[一-鿿]/.test(t))
    ? ok(`히어로 이름 繁體中文 (${zhHero[0]})`) : bad(`히어로 이름 [${zhHero}]`);
  /* 지역 필터 칩도 한자여야 한다 —— 값(키)은 영문 그대로 두고 글자만 바꾼다 */
  const zhChips = await p.$$eval('.chip[data-f="region"]', e=>e.map(x=>({v:x.dataset.v,t:x.textContent.trim()})));
  const zhNamed = zhChips.filter(c=>c.v!=="all");
  zhNamed.length>0 && zhNamed.every(c=>/[一-鿿]/.test(c.t)) && zhNamed.some(c=>c.v==="Aewol"&&c.t==="涯月邑")
    ? ok(`지역 칩 繁體中文 (${zhNamed.slice(0,3).map(c=>c.t).join(" · ")})`)
    : bad(`지역 칩 [${zhNamed.map(c=>c.v+"→"+c.t).join(", ")}]`);
  /* 지도 라벨도 같이 한자로 바뀌어야 한다 —— 사전(T)에 없는 문구라 따로 걸린다 */
  const zhLbl = await p.$$eval(".maplbl u", e=>e.map(x=>x.textContent));
  zhLbl.includes("舊左邑") && zhLbl.includes("涯月邑")
    ? ok("지도 라벨 繁體中文 전환") : bad(`라벨 [${zhLbl}]`);
  await p.click('.lang button[data-lang="en"]');

  /* 지도 */
  {
    const mini = await p.$$eval(".mmap", e=>e.length);
    mini===1 ? ok("작은 지도 있음") : bad(`작은 지도 ${mini}개`);
    const isle = await p.$$eval(".mmap-canvas path.isle", e=>e.length);
    isle===1 ? ok("작은 지도 섬 윤곽") : bad(`섬 path ${isle}개`);
    const ext = await p.$$eval("img,script,link", e=>e.map(x=>x.src||x.href||"").filter(u=>/carto|tile\.|arcgis|leaflet/i.test(u)).length);
    ext===0 ? ok("외부 지도 서버 요청 0") : bad(`외부 지도 요청 ${ext}건`);
    const dots = await p.$$eval(".mmap-dots i", e=>e.length);
    dots===15 ? ok("작은 지도 점 15개") : bad(`점 ${dots}개`);
    /* 작은 지도에는 읍면 경계선이 없어야 한다 —— 372px 에서는 잡음이다 */
    const miniAdm = await p.$$eval(".mmap-canvas path.adm", e=>e.length);
    miniAdm===0 ? ok("작은 지도에 경계선 없음") : bad(`작은 지도 경계선 ${miniAdm}개`);
    await p.click("#mmap");
    await p.waitForTimeout(300);
    const hid = await p.$eval("#grid", e=>e.hidden);
    const shown = await p.$eval("#mapwrap", e=>!e.hidden);
    hid && shown ? ok("지도 전환 동작") : bad("지도 전환 실패");
    const pins = await p.$$eval(".mpin", e=>e.length);
    pins===15 ? ok("지도 핀 15개") : bad(`핀 ${pins}개`);
    const dup = await p.$$eval(".mpin", e=>e.filter(x=>x.hasAttribute("title")).length);
    dup===0 ? ok("브라우저 기본 툴팁 없음") : bad(`title 속성 ${dup}개`);
    /* 펼친 지도에는 경계선이 있어야 하고, 해안선 밖으로 새지 않게 clip 이 걸려 있어야 한다 */
    const admClip = await p.$eval("#mapStage path.adm", e=>e.getAttribute("clip-path")||"");
    /url\(#/.test(admClip) ? ok("경계선 해안선으로 clip") : bad(`clip-path "${admClip}"`);
    /* 라벨은 숙소가 있는 읍·면만 —— 7곳 */
    const lbl = await p.$$eval(".maplbl u", e=>e.map(x=>x.textContent));
    lbl.length===7 && lbl.includes("Gujwa-eup") && lbl.includes("Aewol-eup")
      ? ok("지역 라벨 7개 (영문)") : bad(`라벨 ${lbl.length}개 [${lbl}]`);
    /* 라벨이 핀을 가리면 안 된다 —— 핀이 위층 */
    const zOk = await p.evaluate(()=>{
      const l=getComputedStyle(document.querySelector(".maplbl")).pointerEvents;
      return l==="none";
    });
    zOk ? ok("라벨이 핀 클릭을 막지 않음") : bad("라벨이 포인터를 먹음");
    /* 말풍선 사진 —— 처음엔 주소만 들고 있다가 호버할 때 받아온다.
       지도를 열자마자 15장이 날아가면 안 된다. */
    const lazy = await p.$$eval(".mpin .tip img[data-src]", e=>e.length);
    const eager = await p.$$eval(".mpin .tip img[src]", e=>e.length);
    lazy===15 && eager===0
      ? ok("핀 사진 15장 지연 로딩 (초기 요청 0)") : bad(`대기 ${lazy} / 이미 로드 ${eager}`);
    /* 작은 크기로 바꿔 부르는지 —— 원본 w_1200 을 그대로 쓰면 한 장에 수백 KB */
    const small = await p.$eval(".mpin .tip img[data-src]", e=>e.dataset.src);
    /w_320/.test(small) ? ok("핀 사진 w_320 축소본") : bad(`사진 주소 ${small}`);
    await p.hover('.mpin[data-pin="casadia"]');
    await p.waitForTimeout(200);
    const woke = await p.$eval('.mpin[data-pin="casadia"] .tip img', e=>!!e.getAttribute("src"));
    const tipVis = await p.$eval('.mpin[data-pin="casadia"] .tip', e=>getComputedStyle(e).opacity);
    woke && tipVis==="1" ? ok("핀 호버 → 사진 + 이름") : bad(`호버 후 src ${woke} / opacity ${tipVis}`);
    /* 아래쪽 핀은 말풍선이 위로 열려야 지도 밖으로 안 잘린다 */
    const flip = await p.$$eval(".mpin.hi", e=>e.length);
    flip>0 ? ok(`아래쪽 핀 ${flip}개는 말풍선이 위로`) : bad("위로 여는 핀이 없음");
    /* 지도를 연 채로 언어를 바꾼다 —— 캡션·핀 이름·옆 목록이 같이 따라와야 한다.
       예전엔 지도가 열린 상태에서는 다시 그리지 않아 옛 언어로 남아 있었다. */
    await p.click('.lang button[data-lang="zh"]');
    await p.waitForTimeout(250);
    const capZh  = await p.textContent("#mapCap");
    const sideZh = await p.textContent("#side");
    /間/.test(capZh) ? ok(`지도 연 채 언어 전환 (${capZh.trim()})`) : bad(`지도 캡션 "${capZh}"`);
    /西部|南部|東部/.test(sideZh) ? ok("지도 옆 목록 지역명 西部 / 南部 / 東部") : bad("옆 목록이 영문 그대로");
    await p.click('.lang button[data-lang="en"]');
    await p.waitForTimeout(250);
    const sideEn = await p.textContent("#side");
    /West|South|East/.test(sideEn) ? ok("영문 복귀") : bad("영문 복귀 실패");
    await p.click('.mpin[data-pin="andostay"]');
    await p.waitForTimeout(200);
    const card = await p.$eval("#mapCard", e=>!e.hidden);
    card ? ok("핀 클릭 → 카드") : bad("카드 안 열림");
    const cardCol = await p.$eval("#mapCard .btn", e=>getComputedStyle(e).color);
    /251,\s*249,\s*245/.test(cardCol) ? ok(`카드 버튼 글자색 ${cardCol}`) : bad(`카드 버튼 글자색 ${cardCol}`);
    const inside = await p.$eval("#mapCard", (c)=>{
      const s=document.getElementById("mapStage").getBoundingClientRect(), r=c.getBoundingClientRect();
      return r.left>=s.left-1 && r.right<=s.right+1 && r.top>=s.top-1 && r.bottom<=s.bottom+1;
    });
    inside ? ok("카드가 지도 안에 들어감") : bad("카드가 지도 밖으로 나감");
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
  const {p, ctx, errs} = await newPage(390,844,true);
  await p.goto(BASE+"/", {waitUntil:"networkidle"});
  const ow = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ow<=0 ? ok("가로 스크롤 없음") : bad(`가로 넘침 ${ow}px`);

  await checkBar(p, "모바일");

  /* 탭과 칩이 같은 모양이면 세 줄이 전부 같은 물건으로 보인다 */
  const shapes = await p.evaluate(()=>{
    const t=getComputedStyle(document.querySelector("#vtabs button"));
    const c=getComputedStyle(document.querySelector(".chip"));
    const lbl=[...document.querySelectorAll(".fgrp > .lbl")]
      .filter(e=>getComputedStyle(e).display!=="none").map(e=>e.textContent.trim());
    return { tabBorder:t.borderTopWidth+"/"+t.borderBottomWidth, chipBorder:c.borderTopWidth, labels:lbl };
  });
  shapes.tabBorder==="0px/2px" && shapes.chipBorder!=="0px"
    ? ok("탭은 밑줄 · 칩은 상자로 구분") : bad(`탭 ${shapes.tabBorder} / 칩 ${shapes.chipBorder}`);
  shapes.labels.length===2
    ? ok(`필터 라벨 노출 (${shapes.labels.join(" · ")})`) : bad(`라벨 ${shapes.labels.length}개`);

  /* 핀 사이가 손가락으로 고를 만큼은 벌어져야 한다 */
  await p.click('#vtabs button[data-view="map"]');
  await p.waitForTimeout(400);
  const gap = await p.evaluate(()=>{
    const ps=[...document.querySelectorAll(".mpin")].map(e=>{const r=e.getBoundingClientRect();
      return [r.left+r.width/2, r.top+r.height/2];});
    let m=Infinity;
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)
      m=Math.min(m, Math.hypot(ps[j][0]-ps[i][0], ps[j][1]-ps[i][1]));
    return +m.toFixed(1);
  });
  gap>=15 ? ok(`핀 최소 간격 ${gap}px`) : bad(`핀이 ${gap}px 밖에 안 떨어짐 —— 손가락으로 못 고른다`);
  /* 빗나간 터치도 가장 가까운 점을 연다 */
  await p.evaluate(()=>{
    const st=document.getElementById("mapStage").getBoundingClientRect();
    const q=document.querySelector('.mpin[data-pin="hadoondam"]').getBoundingClientRect();
    document.getElementById("mapStage").dispatchEvent(new MouseEvent("click",
      {bubbles:true, clientX:q.left+q.width/2+13, clientY:q.top+q.height/2+11}));
  });
  await p.waitForTimeout(300);
  const nearOpened = await p.$eval("#mapCard", e=>!e.hidden);
  nearOpened ? ok("빗나간 터치 → 가장 가까운 숙소") : bad("빗나간 터치가 그냥 닫힘");
  await p.click('#vtabs button[data-view="list"]');
  await p.waitForTimeout(250);

  /* 첫 화면 —— 히어로 사진이 헤더 바로 아래에 있고, 글까지 한 화면에 들어가야 한다 */
  const hero = await p.evaluate(()=>{
    const y = s => { const e=document.querySelector(s); if(!e) return null;
      const r=e.getBoundingClientRect(); return Math.round(r.top+window.scrollY); };
    const b = document.querySelector(".hero-img").getBoundingClientRect();
    return { img:y(".hero-img"), txt:y(".hero-txt"), end:Math.round(
      document.querySelector("#hero").getBoundingClientRect().bottom+window.scrollY) , imgH:Math.round(b.height)};
  });
  hero.img < hero.txt ? ok("사진이 글보다 위") : bad(`사진 ${hero.img} / 글 ${hero.txt}`);
  hero.end <= 844 ? ok(`히어로가 첫 화면에 들어감 (${hero.end}px / 844)`)
                  : bad(`히어로가 ${hero.end}px 까지 —— 첫 화면을 넘김`);

  /* 작은 지도는 내려가고 목록/지도 탭이 그 자리를 대신한다 */
  const mmHidden = await p.$eval("#mmap", e=>getComputedStyle(e).display==="none");
  const tabShown = await p.$eval("#vtabs", e=>getComputedStyle(e).display!=="none");
  mmHidden && tabShown ? ok("작은 지도 내림 · 목록/지도 탭 노출")
                       : bad(`작은 지도 숨김 ${mmHidden} / 탭 노출 ${tabShown}`);

  /* 예약 버튼까지의 거리 —— 광고 랜딩에서 이게 전부다 */
  const btnY = await p.evaluate(()=>{
    const e=document.querySelector(".card .btn");
    return Math.round(e.getBoundingClientRect().top+window.scrollY);
  });
  btnY < 1900 ? ok(`첫 예약 버튼 ${btnY}px (화면 ${(btnY/844).toFixed(1)}개)`)
              : bad(`첫 예약 버튼이 ${btnY}px —— 너무 멂`);

  /* 카드 사진은 휴대폰에서 3:2 */
  const ar = await p.$eval(".card .thumb", e=>getComputedStyle(e).aspectRatio);
  /3\s*\/\s*2/.test(ar) ? ok("카드 사진 3:2") : bad(`사진 비율 ${ar}`);

  /* 탭 전환 —— 지도로 갔다가 목록으로 돌아온다 */
  await p.click('#vtabs button[data-view="map"]');
  await p.waitForTimeout(400);
  const onMap = await p.evaluate(()=>({
    grid:document.getElementById("grid").hidden,
    map:!document.getElementById("mapwrap").hidden,
    pressed:document.querySelector('#vtabs button[data-view="map"]').getAttribute("aria-pressed"),
    pins:document.querySelectorAll(".mpin").length
  }));
  onMap.grid && onMap.map && onMap.pressed==="true" && onMap.pins===15
    ? ok("지도 탭 → 지도 15핀") : bad(JSON.stringify(onMap));
  await p.click('#vtabs button[data-view="list"]');
  await p.waitForTimeout(300);
  const backOk = await p.evaluate(()=>!document.getElementById("grid").hidden
    && document.getElementById("mapwrap").hidden);
  backOk ? ok("목록 탭 복귀") : bad("목록으로 안 돌아옴");

  /* 히어로 사진은 화면 끝까지 —— 글 블록과 눈에 띄게 갈려야 한다 */
  const heroImgW = await p.$eval(".hero-img", e=>Math.round(e.getBoundingClientRect().width));
  heroImgW===390 ? ok("히어로 사진 화면 끝까지 (390px)") : bad(`사진 폭 ${heroImgW}px`);

  /* 핀을 눌렀을 때 —— 카드가 지도 상자 안에 온전히 들어가야 한다.
     예전엔 190px 짜리 지도 칸 안에 260px 카드를 띄워 사진부터 잘렸다. */
  await p.click('#vtabs button[data-view="map"]');
  await p.waitForTimeout(400);
  await p.click('.mpin[data-pin="ojori"]');
  await p.waitForTimeout(400);
  const card = await p.evaluate(()=>{
    const c=document.getElementById("mapCard"), box=document.querySelector(".mapbox");
    const r=c.getBoundingClientRect(), b=box.getBoundingClientRect();
    const x=c.querySelector(".x").getBoundingClientRect();
    return { clipped: r.bottom>b.bottom+1 || r.top<b.top-1 || r.right>b.right+1,
             xInside: x.top>=r.top-1 && x.right<=r.right+1,
             tip: getComputedStyle(document.querySelector(".mpin.on .tip")).opacity,
             h: Math.round(r.height) };
  });
  !card.clipped ? ok(`핀 카드가 지도 상자 안에 (높이 ${card.h}px)`) : bad("카드가 잘림");
  card.xInside ? ok("닫기 버튼이 카드 안") : bad("닫기 버튼이 카드 밖으로 날아감");
  card.tip==="0" ? ok("터치 기기에서 호버 말풍선 안 뜸") : bad(`말풍선 opacity ${card.tip}`);
  await p.click('#vtabs button[data-view="list"]');
  await p.waitForTimeout(250);
  await p.click('#vtabs button[data-view="map"]');
  await p.waitForTimeout(300);

  const ow2 = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ow2<=0 ? ok("지도 탭에서도 가로 스크롤 없음") : bad(`지도 탭 가로 넘침 ${ow2}px`);

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

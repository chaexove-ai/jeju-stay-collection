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

/* ── 화면 크기 전수 ──
   1440 과 390 만 보던 탓에, 761~1080px 구간(태블릿·휴대폰 가로)에서 지도가
   216px 밖으로 나가 있는 걸 몇 달 동안 못 봤다. 사파리는 넘치는 페이지를
   축소해서 맞추고, 가로로 눕혔다 세로로 돌리면 그 축소가 남아 「늘어나」 보인다.
   그래서 실제 기기 치수를 가로·세로 양쪽으로 전부 훑는다. */
console.log("\n[화면 크기 전수]");
{
  const VP = [
    [320,568,"SE 세로"],   [568,320,"SE 가로"],
    [375,667,"8 세로"],    [667,375,"8 가로"],
    [390,844,"14 세로"],   [844,390,"14 가로"],
    [430,932,"ProMax 세로"],[932,430,"ProMax 가로"],
    [768,1024,"iPad 세로"], [1024,768,"iPad 가로"],
    [1280,800,"노트북"],    [1920,1080,"큰 화면"]
  ];
  let bad_ = 0;
  for(const url of ["/", "/stay/"+IDS[0]]){
    for(const [w,h,tag] of VP){
      const {p, ctx} = await newPage(w,h,w<500);
      await p.goto(BASE+url, {waitUntil:"domcontentloaded"});
      await p.waitForTimeout(120);
      const r = await p.evaluate(()=>{
        const de=document.documentElement;
        const over=de.scrollWidth-de.clientWidth;
        const wide=[];
        if(over>0) document.querySelectorAll("body *").forEach(e=>{
          const b=e.getBoundingClientRect();
          if(b.right>de.clientWidth+1.5)
            wide.push((typeof e.className==="string"&&e.className?"."+e.className.split(" ")[0]:e.tagName));
        });
        return {over, wide:[...new Set(wide)].slice(0,4)};
      });
      if(r.over>0){ bad_++; bad(`${url} ${w}×${h} ${tag} 가로 ${r.over}px 넘침 [${r.wide}]`); }
      await ctx.close();
    }
  }
  bad_===0 ? ok(`${VP.length*2}개 화면 크기 전부 가로 넘침 없음`) : null;
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

  /* 히어로는 세 칸 —— 서로 다른 숙소여야 하고, 도틀왓은 절대 올라오면 안 된다.
     그리고 누를 수 없어야 한다: 여기 걸린 세 곳만 지름길을 얻으면 불공평해진다. */
  const hero = await p.$$eval(".hero-img .hcell", els=>els.map(e=>({
    id:e.querySelector(".hc").dataset.hid, tag:e.tagName,
    cap:e.querySelector(".hc").textContent.trim(),
    link:!!e.closest("a") || !!e.querySelector("a")
  })));
  const ids = hero.map(h=>h.id);
  hero.length===3 && new Set(ids).size===3
    ? ok(`히어로 3곳 (${hero.map(h=>h.cap).join(" / ")})`) : bad(`히어로 ${hero.length}칸 [${ids}]`);
  !ids.includes("dotlwat") ? ok("히어로에 도틀왓 없음") : bad("도틀왓이 히어로에 올라옴");
  hero.every(h=>h.tag!=="A" && !h.link)
    ? ok("히어로 사진은 링크 아님 (공정)") : bad("히어로 사진에 링크가 걸려 있음");

  const links = await p.$$eval(".card h3 a", a=>a.map(x=>x.getAttribute("href")));
  links.every(h=>h.startsWith("/stay/")) ? ok("카드 제목 → /stay/*") : bad("카드 제목 링크 이상");

  await checkBar(p, "데스크톱");

  /* 파비콘 —— 태그가 있고, 파일이 실제로 응답해야 한다.
     head 에 링크만 걸어두고 파일을 안 올리는 게 가장 흔한 실수다. */
  {
    const icons = await p.$$eval('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]',
      e=>e.map(x=>x.getAttribute("href")));
    const theme = await p.$eval('meta[name="theme-color"]', e=>e.content).catch(()=>null);
    const want = ["/favicon.ico","/favicon.svg","/apple-touch-icon.png","/site.webmanifest"];
    want.every(w=>icons.includes(w)) && theme==="#2F4A43"
      ? ok(`파비콘 태그 ${icons.length}개 · theme-color ${theme}`) : bad(`아이콘 [${icons}] / theme ${theme}`);
    const codes = [];
    for(const f of [...want,"/icon-192.png","/icon-512.png"]){
      const r = await p.request.get(BASE+f);
      codes.push(f+":"+r.status());
    }
    codes.every(c=>c.endsWith(":200"))
      ? ok(`아이콘 파일 ${codes.length}개 응답 200`) : bad(`아이콘 응답 ${codes.join(" ")}`);
  }

  /* 공유 카드 —— 카톡·아이메시지가 집어가는 그림.
     숙소 사진이 아니라 컬렉션 카드여야 하고(그 주의 히어로만 공짜 노출을
     가져가지 않게), 파일이 실제로 응답해야 하며, 제목이 잘리지 않아야 한다. */
  {
    const og = await p.evaluate(()=>{
      const m = n => (document.querySelector(`meta[property="og:${n}"]`)||{}).content || "";
      return { img:m("image"), title:m("title"), w:m("image:width"), h:m("image:height") };
    });
    const r = await p.request.get(og.img.replace(/^https?:\/\/[^/]+/, BASE));
    og.img.endsWith("/og.png") && r.status()===200 && og.title.length<=34 && og.w==="1200"
      ? ok(`공유 카드 ${og.img.split("/").pop()} 200 · 제목 “${og.title}” (${og.title.length}자)`)
      : bad(`og ${JSON.stringify(og)} / 응답 ${r.status()}`);
  }

  /* 맨 위로 —— 히어로를 지나기 전에는 안 보이고, 지나면 나타나고, 누르면 올라간다 */
  {
    const before = await p.$eval("#toTop", e=>e.hidden);
    /* 부드러운 스크롤이 켜져 있으면 2000px 에 닿기까지 시간이 걸린다 —— 끄고 잰다 */
    await p.addStyleTag({content:"html{scroll-behavior:auto !important}"});
    await p.evaluate(()=>window.scrollTo(0,2000));
    await p.waitForFunction(()=>window.scrollY>1900, null, {timeout:3000});
    await p.waitForTimeout(150);
    const after = await p.$eval("#toTop", e=>e.hidden);
    before && !after ? ok("맨 위로 버튼: 처음 숨김 → 내려가면 노출") : bad(`처음 ${before} / 스크롤 후 ${after}`);
    await p.click("#toTop");
    await p.waitForTimeout(900);
    const y = await p.evaluate(()=>window.scrollY);
    y < 40 ? ok(`맨 위로 동작 (${Math.round(y)}px)`) : bad(`눌러도 ${Math.round(y)}px`);
  }

  /* 후기가 아직 없는 곳 —— 별과 같은 색으로 */
  {
    const nl = await p.$eval(".stars.new", e=>{
      const s=getComputedStyle(e); return {c:s.color, w:s.fontWeight, t:e.textContent.trim()};
    }).catch(()=>null);
    const star = await p.$eval(".star", e=>getComputedStyle(e).color);
    nl && nl.c===star && +nl.w>=500
      ? ok(`${nl.t} 이 별과 같은 색 (${nl.c})`) : bad(`Newly listed ${JSON.stringify(nl)} / 별 ${star}`);
  }

  /* 숙소 특징 —— 가운뎃점으로 잇지 않고, 초록 칸으로 끊어 놓는다 */
  {
    const t = await p.$eval(".card .tags", e=>{
      const sp=[...e.querySelectorAll("span")];
      const s=getComputedStyle(sp[0]);
      return { n:sp.length, dot:sp.some(x=>x.textContent.trim()==="·"),
               c:s.color, bg:s.backgroundColor, txt:sp.map(x=>x.textContent.trim()).join(" | ") };
    }).catch(()=>null);
    const pine = await p.$eval(".btn", e=>getComputedStyle(e).backgroundColor);
    t && !t.dot && t.c===pine && t.bg!=="rgba(0, 0, 0, 0)"
      ? ok(`특징 뱃지 ${t.n}칸, 파인 글씨 (${t.txt})`)
      : bad(`특징 줄 ${JSON.stringify(t)} / 파인 ${pine}`);
  }

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

  /* 繁體中文은 이제 브라우저 안에서 갈아끼우는 게 아니라 주소가 다르다.
     링크가 실제로 /zh/ 로 가는지, 그 페이지가 자바스크립트가 돌기 전에
     이미 중국어인지(= 검색엔진이 읽을 수 있는지)까지 본다. */
  {
    const href = await p.getAttribute('.lang a[data-lang="zh"]', "href");
    href==="/zh" ? ok("언어 전환이 링크 (/zh)") : bad(`언어 링크 ${href}`);
    const raw = await (await p.request.get(BASE+"/zh")).text();
    const head = raw.slice(0, raw.indexOf("<body"));
    /<html lang="zh-Hant"/.test(raw)
      && /hreflang="zh-Hant"/.test(head) && /hreflang="x-default"/.test(head)
      && /canonical" href="[^"]*\/zh"/.test(head)
      ? ok("/zh 에 zh-Hant · hreflang · canonical")
      : bad("繁體 페이지 head 가 모자람");
    /* 본문이 서버에서 이미 한자여야 한다 —— 예전에는 브라우저가 채웠다 */
    /住宿選輯/.test(raw) && /涯月邑/.test(raw)
      ? ok("繁體 본문이 서버 HTML 에 이미 들어 있음") : bad("繁體 본문이 비어서 나감");
    /* 화면 안의 링크가 자기 언어 안에 머무는지 */
    const stray = (raw.match(/href="\/stay\//g)||[]).length;
    stray===0 ? ok("繁體 페이지 안의 링크가 모두 /zh/ 안") : bad(`영문 링크 ${stray}개 샘`);
  }

  await p.goto(BASE+"/zh", {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(200);
  const zh = await p.textContent(".coll-head h2");
  /住宿/.test(zh) ? ok(`繁體 페이지 (${zh})`) : bad(`繁體 페이지 실패: ${zh}`);
  const zhCards = await p.$$eval(".card", e=>e.length);
  zhCards===15 ? ok("繁體에서도 15장") : bad(`繁體 ${zhCards}장`);
  const zhHero = await p.$$eval(".hero-img .hc", e=>e.map(x=>x.textContent.trim()));
  zhHero.some(t=>/[一-鿿]/.test(t))
    ? ok(`히어로 이름 繁體中文 (${zhHero[0]})`) : bad(`히어로 이름 [${zhHero}]`);
  /* 지역 필터 칩도 한자여야 한다 —— 값(키)은 영문 그대로 두고 글자만 바꾼다 */
  const zhChips = await p.$$eval('.chip[data-f="region"]', e=>e.map(x=>({v:x.dataset.v,t:x.textContent.trim()})));
  const zhNamed = zhChips.filter(c=>c.v!=="all");
  zhNamed.length>0 && zhNamed.every(c=>/[一-鿿]/.test(c.t)) && zhNamed.some(c=>c.v==="Aewol"&&c.t==="涯月邑")
    ? ok(`지역 칩 繁體中文 (${zhNamed.slice(0,3).map(c=>c.t).join(" · ")})`)
    : bad(`지역 칩 [${zhNamed.map(c=>c.v+"→"+c.t).join(", ")}]`);
  const zhLbl = await p.$$eval(".maplbl u", e=>e.map(x=>x.textContent));
  zhLbl.includes("舊左邑") && zhLbl.includes("涯月邑")
    ? ok("지도 라벨 繁體中文") : bad(`라벨 [${zhLbl}]`);
  /* 지도를 繁體 페이지에서 열었을 때 캡션과 옆 목록도 한자여야 한다 */
  await p.click("#mmap");
  await p.waitForTimeout(300);
  const capZh  = await p.textContent("#mapCap");
  const sideZh = await p.textContent("#side");
  /間/.test(capZh) ? ok(`繁體 지도 캡션 (${capZh.trim()})`) : bad(`지도 캡션 "${capZh}"`);
  /西部|南部|東部/.test(sideZh) ? ok("지도 옆 목록 西部 / 南部 / 東部") : bad("옆 목록이 영문 그대로");
  /* 繁體 페이지의 영문 링크로 돌아오기 */
  const backEn = await p.getAttribute('.lang a[data-lang="en"]', "href");
  backEn==="/" ? ok("繁體 → 영문 링크 (/)") : bad(`영문 링크 ${backEn}`);
  await p.goto(BASE+"/", {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(200);

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
    const sideEn = await p.textContent("#side");
    /West|South|East/.test(sideEn) ? ok("지도 옆 목록 영문") : bad("옆 목록 영문 아님");
    /* 옆 목록의 평점 —— 별이 붙고, 후기 없는 곳은 카드와 같은 감귤색 */
    const rt = await p.evaluate(()=>{
      const stars = document.querySelectorAll("#side .rt .star").length;
      const nw = document.querySelector("#side .rt .new");
      const ref = getComputedStyle(document.querySelector(".card .star")).color;
      return { stars, newCol: nw ? getComputedStyle(nw).color : null, ref,
               starCol: getComputedStyle(document.querySelector("#side .rt .star")).color };
    });
    rt.stars>0 && rt.starCol===rt.ref && rt.newCol===rt.ref
      ? ok(`옆 목록 별 ${rt.stars}개 · Newly listed 도 같은 감귤색`)
      : bad(`별 ${rt.stars} / 별색 ${rt.starCol} / new ${rt.newCol} / 기준 ${rt.ref}`);
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
  /* 닫는 길 세 가지 —— × / 바깥 / Esc.
     카드가 지도 칸 밖으로 옮겨간 뒤로 × 위임이 끊겨 한동안 눌리지 않았다. */
  {
    const tap = async () => { await p.click('.mpin[data-pin="andostay"]'); await p.waitForTimeout(260); };
    const shut = () => p.$eval("#mapCard", e=>e.hidden);
    const xSize = await p.$eval("#mapCard .x", e=>{const r=e.getBoundingClientRect();
      return Math.round(Math.min(r.width, r.height));});
    await p.click("#mapCard .x"); await p.waitForTimeout(240);
    const byX = await shut();
    await tap(); await p.keyboard.press("Escape"); await p.waitForTimeout(240);
    const byEsc = await shut();
    await tap(); await p.click("#side"); await p.waitForTimeout(240);
    const byOut = await shut();
    byX && byEsc && byOut && xSize>=44
      ? ok(`카드 닫기 세 가지 동작 (× ${xSize}px · 바깥 · Esc)`)
      : bad(`× ${byX} (${xSize}px) / Esc ${byEsc} / 바깥 ${byOut}`);
    await tap();
    /* 지도 아래쪽 핀을 눌렀을 때 카드가 화면 밖에 생기면 안 된다 */
    const seen = await p.$eval("#mapCard", e=>{const r=e.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;});
    seen ? ok("핀을 누르면 카드가 화면 안으로") : bad("카드가 화면 밖에 생김");
    await p.click("#mapCard .x"); await p.waitForTimeout(200);
  }
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
    /* 「여기 뭐가 있나」 —— 항목마다 선 그림이 하나씩 붙어 있어야 한다 */
    const feat = await p.$$eval(".feat span", e=>({
      n:e.length, svg:e.filter(x=>x.querySelector("svg")).length,
      empty:e.filter(x=>!x.textContent.trim()).length
    })).catch(()=>({n:0,svg:0,empty:0}));
    if(feat.n && (feat.svg!==feat.n || feat.empty))
      problems.push(`설비 ${feat.n}개 중 아이콘 ${feat.svg}개`);
    problems.length ? bad(`${id}: ${problems.join(", ")}`) : ok(id);
  }
  console.log(`  · 지도 있는 페이지 ${maps}/${IDS.length} (좌표 없는 숙소는 지도 섹션 자체가 없음)`);
  errs.length===0 ? ok("JS 에러 0") : bad("JS 에러: "+errs.slice(0,3).join(" | "));
  await p.goto(`${BASE}/stay/${IDS[0]}`, {waitUntil:"networkidle"});
  await p.screenshot({path:"v-stay.png", fullPage:false});
  /* 상세 페이지도 언어마다 주소가 따로 있다 */
  const stayZhHref = await p.getAttribute('.lang a[data-lang="zh"]', "href");
  stayZhHref===`/zh/stay/${IDS[0]}` ? ok(`상세 繁體 링크 (${stayZhHref})`) : bad(`상세 繁體 링크 ${stayZhHref}`);
  await p.goto(`${BASE}/zh/stay/${IDS[0]}`, {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(150);
  const zh = await p.textContent(".band h2");
  /設施|訂房|位置|其他/.test(zh) ? ok(`상세 繁體 페이지 (${zh})`) : bad(`상세 繁體 실패: ${zh}`);
  const stayRaw = await (await p.request.get(`${BASE}/zh/stay/${IDS[0]}`)).text();
  /<html lang="zh-Hant"/.test(stayRaw) && /hreflang="zh-Hant"/.test(stayRaw)
    ? ok("상세 繁體 head (zh-Hant · hreflang)") : bad("상세 繁體 head 모자람");
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

#!/usr/bin/env node
/* ============================================================
   Jeju Stay Collection —— 정적 빌드
     구글 시트 → dist/index.html + dist/stay/<id>/index.html

   빌드 시점에 시트를 한 번만 읽는다. 시트를 고쳐도 재배포가
   없으면 사이트는 바뀌지 않는다 —— 시트에 붙인 앱스스크립트가
   Vercel Deploy Hook 을 때려 재배포를 건다.

   시트를 못 읽거나 숙소 수가 기준 아래로 떨어지면 빌드를
   실패시킨다. Vercel 은 실패한 빌드를 배포하지 않으므로
   직전 배포가 그대로 살아 있다 —— 빈 사이트가 나가는 것보다 낫다.
   ============================================================ */
import { writeFile, mkdir, rm, readFile, cp, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCSV, buildStays, pickHero, pickHeroes } from "./src/data.mjs";
import { T, TAGS, BADGES, MIN_REVIEWS } from "./src/i18n.mjs";
import { JEJU } from "./src/jeju.mjs";

const HERE  = path.dirname(fileURLToPath(import.meta.url));
const SRC   = path.join(HERE, "src");
const DIST  = path.join(HERE, "dist");
const PUBLIC= path.join(HERE, "public");

const SHEET_ID = "1HLiwPib_S6P4K5V3TzNWPu84y3D2Z_-nE3V7F87Hhfc";
const CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1`;
const SITE     = "https://www.jejustaycollection.com";
const GA_ID    = "G-VQ6CNN14WF";
const MIN_STAYS = 5;          /* 이보다 적게 파싱되면 시트가 깨진 것으로 본다 */

const args    = new Set(process.argv.slice(2));
const FIXTURE = [...args].find(a=>a.startsWith("--fixture="))?.split("=")[1]
             || (args.has("--fixture") ? "fixture.csv" : null);

/* ---------- 직렬화 (함수 포함) ---------- */
function serialize(v){
  if(typeof v === "function") return v.toString();
  if(Array.isArray(v))        return "[" + v.map(serialize).join(",") + "]";
  if(v && typeof v === "object")
    return "{" + Object.entries(v).map(([k,x])=>JSON.stringify(k)+":"+serialize(x)).join(",") + "}";
  return JSON.stringify(v===undefined ? null : v);
}

/* ---------- 시트 ---------- */
async function loadTable(){
  if(FIXTURE){
    console.log(`· 시트 대신 고정 데이터 사용: ${FIXTURE}`);
    return parseCSV(await readFile(path.join(HERE, FIXTURE), "utf8"));
  }
  console.log("· 구글 시트 읽는 중…");
  const res = await fetch(CSV_URL, { redirect:"follow" });
  if(!res.ok) throw new Error(`시트 응답 ${res.status} —— 공유 설정이 “링크가 있는 모든 사용자 · 뷰어”인지 확인할 것`);
  return parseCSV(await res.text());
}

/* 페이지 제목과 설명 —— 언어마다 따로. 브랜드 이름은 두 언어에서 같다.
   화면 위의 워드마크가 로마자이므로 제목만 한자로 바꾸면 다른 사이트로 읽힌다. */
const META = {
  en:{ title:"Jeju Stay Collection — Handpicked Villas &amp; Stays on Jeju Island",
       desc:"A curated collection of private pool villas, ocean-view retreats and quiet stone houses across Jeju Island — each one visited and looked after by a local team." },
  zh:{ title:"Jeju Stay Collection — 濟州島精選泳池別墅與住宿",
       desc:"精選濟州島的私人泳池別墅、海景住宿與石屋民宿。每一間都由住在島上的團隊親自走訪、長期照顧。" }
};

/* ---------- 페이지 껍데기 ---------- */
function shell({title, desc, canonical, ogImage, ogTitle, ogAlt, alts, noindex, css, body, script, lang="en"}){
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
${noindex?`<meta name="robots" content="noindex">
`:""}<link rel="canonical" href="${canonical}">${alts?`
<link rel="alternate" hreflang="en" href="${alts.en}">
<link rel="alternate" hreflang="zh-Hant" href="${alts.zh}">
<link rel="alternate" hreflang="x-default" href="${alts.en}">`:""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Jeju Stay Collection">
<meta property="og:locale" content="${lang.startsWith("zh")?"zh_TW":"en_US"}">
<meta property="og:locale:alternate" content="${lang.startsWith("zh")?"en_US":"zh_TW"}">
<meta property="og:title" content="${ogTitle||title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">${ogImage?`
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="${ogAlt||ogTitle||title}">${ogImage.endsWith("/og.png")?`
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`:""}`:""}
<meta name="twitter:card" content="${ogImage?"summary_large_image":"summary"}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#2F4A43">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=Jost:wght@400;500;600&family=Noto+Serif+TC:wght@400;600&family=Noto+Sans+TC:wght@400;500&display=swap">
<style>${css}</style>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','${GA_ID}');
</script>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>`;
}

const MARK = `<svg width="40" height="28" viewBox="0 0 40 28" fill="none" stroke="#191817" stroke-width="1.25" stroke-linecap="round" aria-hidden="true">
  <path d="M3 26 C 9 4, 31 4, 37 26"/><path d="M10 26 C 14 12, 26 12, 30 26"/><path d="M16 26 C 18 19, 22 19, 24 26"/>
</svg>`;
const MARK_LIGHT = MARK.replace('stroke="#191817"','stroke="#F4F1EA"').replace('width="40" height="28"','width="44" height="31"');

/* 언어 전환은 버튼이 아니라 링크다 —— 언어마다 주소가 따로 있기 때문.
   같은 화면을 브라우저 안에서 갈아끼우면 그 화면에는 주소가 없어서,
   광고 랜딩으로 지정할 수도, 공유할 수도, 검색엔진이 읽을 수도 없다. */
const masthead = (lang, hrefEn, hrefZh) => `<div class="bar">
  <div class="wrap bar-in">
    <a class="brand" href="${lang==="zh"?"/zh":"/"}">${MARK}<div class="brand-txt"><b>Jeju Stay</b><span>Collection</span></div></a>
    <div class="lang" role="group" aria-label="Language">
      <a href="${hrefEn}" hreflang="en" data-lang="en" aria-current="${lang==="en"}">English</a>
      <a href="${hrefZh}" hreflang="zh-Hant" data-lang="zh" aria-current="${lang==="zh"}">繁體中文</a>
    </div>
  </div>
</div>`;

const darkFoot = `<div class="dark">
  <div class="wrap">
    <div class="wall">
      <div class="eyebrow"><span class="lbl">03</span><i></i><span class="lbl" data-t="wallEyebrow"></span></div>
      <div class="wall-q" data-t="wallQ"></div>
      <div class="wall-s" data-t="wallS"></div>
    </div>
    <hr>
    <div class="foot">
      <div>${MARK_LIGHT}<div class="brand-txt" style="margin-top:16px"><b>Jeju Stay</b><span>Collection</span></div></div>
      <p data-t="footer"></p>
      <div class="meta">
        <div data-t="contact"></div>
        <div><a href="mailto:hello@jejustaycollection.com">hello@jejustaycollection.com</a></div>
      </div>
    </div>
    <div class="credit">Map data &copy; OpenStreetMap contributors, ODbL &middot; Administrative boundaries from South Korean public geospatial data.</div>
  </div>
</div>`;

/* ---------- 공통 클라이언트 머리말 ---------- */
const preamble = (renderSrc, extra, lang="en", prefix="") => `
${renderSrc}
const T=${serialize(T)};
const TAGS=${serialize(TAGS)};
const BADGES=${serialize(BADGES)};
const MIN_REVIEWS=${MIN_REVIEWS};
${extra}
const R=makeRender(T,TAGS,BADGES,MIN_REVIEWS,${JSON.stringify(prefix)});
/* 언어는 주소가 정한다 —— 예전에는 localStorage 에 담아두고 어느 주소에서든
   되살렸는데, 그러면 /(영문) 을 열어도 중국어가 나와 <html lang> · canonical ·
   광고 랜딩이 전부 어긋난다. 이제 이 페이지의 언어는 빌드 시점에 박힌다. */
const lang=${JSON.stringify(lang)};
function track(n,p){try{if(typeof gtag==="function")gtag("event",n,p);}catch(e){}}
function applyText(){
  const t=T[lang];
  document.querySelectorAll("[data-t]").forEach(el=>{
    const v=(typeof SITE_TXT!=="undefined" && SITE_TXT[el.dataset.t] && SITE_TXT[el.dataset.t][lang]) || t[el.dataset.t];
    if(typeof v==="string") el.innerHTML=v;
  });
  /* 사전(T)에 없는 고정 문구 —— 지도 라벨처럼 두 언어를 요소가 직접 들고 있는 것 */
  document.querySelectorAll("[data-en]").forEach(el=>{
    el.textContent = (lang==="zh" && el.dataset.zh) ? el.dataset.zh : el.dataset.en;
  });
}
document.querySelectorAll(".lang a").forEach(b=>b.addEventListener("click",()=>{
  track("language_switch",{language:b.dataset.lang});
}));
document.addEventListener("click",e=>{
  const a=e.target.closest("a[data-prop]");
  if(a) track("airbnb_click",{stay:a.dataset.prop, stay_name:a.dataset.name, room:a.dataset.room, language:lang});
  const d=e.target.closest("a[data-detail]");
  if(d) track("stay_detail",{stay:d.dataset.detail, language:lang});
});`;


/* ---------- 지도 ----------
   제주 해안선을 코드에 담아 직접 그린다. 타일 서버를 쓰지 않으므로
   외부 서비스의 요금제 변경에 사이트가 흔들리지 않고, 지명 없는
   섬 윤곽이라는 의도에도 정확히 맞는다. */
const my = lat => { const s = Math.sin(lat * Math.PI / 180);
                    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
function project(lat, lng){
  return [ (((lng + 180) / 360 - JEJU.x0) / (JEJU.x1 - JEJU.x0)) * 100,
           ((my(lat) - JEJU.y0) / (JEJU.y1 - JEJU.y0)) * 100 ];   /* 백분율 */
}
const ISLE = `<svg class="sea" viewBox="0 0 ${JEJU.w} ${JEJU.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path class="isle" d="${JEJU.d}"/></svg>`;

/* 펼친 지도에만 읍·면 경계선을 얹는다. 372px 짜리 작은 지도에서는
   같은 선이 정보가 아니라 잡음이 되므로 ISLE 을 그대로 쓴다.
   경계선은 해안선과 출처가 달라 바다 쪽으로 몇 px 씩 삐져나가는데,
   해안선 path 로 clip 해서 잘라낸다. */
const ISLE_BIG = `<svg class="sea" viewBox="0 0 ${JEJU.w} ${JEJU.h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs><clipPath id="isleClip"><path d="${JEJU.d}"/></clipPath></defs>
  <path class="isle" d="${JEJU.d}"/>
  <path class="adm" d="${JEJU.adm}" clip-path="url(#isleClip)"/>
</svg>`;

/* 라벨은 숙소가 있는 읍·면만. 지역 이름을 13개 다 띄우면
   사이트가 쓰는 West / South / East 세 구분과 층이 겹친다. */
const MAPLBL = lang => `<div class="maplbl" aria-hidden="true">${
  JEJU.labels.map(l => `<u class="a-${l.a}" style="left:${l.x}%;top:${l.y}%" data-en="${l.en}" data-zh="${l.zh}">${lang==="zh"?l.zh:l.en}</u>`).join("")
}</div>`;

function miniMap(list, R, t){
  const geo = list.filter(g => g.geo);
  if(!geo.length) return "";
  const dots = geo.map(g => {
    const [x, y] = project(g.geo.lat, g.geo.lng);
    return `<i style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"></i>`;
  }).join("");
  return `<button type="button" class="mmap" id="mmap" aria-label="${R.esc(t.mapOpenBig)}">
    <span class="mmap-canvas">${ISLE}<span class="mmap-dots" id="mmapDots">${dots}</span></span>
    <span class="mmap-foot">
      <span class="lbl" id="mmapLbl" style="white-space:nowrap">${R.esc(t.mapMini(geo.length))}</span>
      <span class="mmap-go">${R.esc(t.mapOpenBig)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
    </span>
  </button>`;
}

/* ---------- 목록 페이지 ---------- */
/* data-t / data-en 자리를 빌드 시점에 채운다.
   예전에는 브라우저가 켜진 뒤에야 글자가 들어갔다 —— 사람 눈에는 같아 보이지만
   검색엔진에는 빈 껍데기가 먼저 가고, 자바스크립트가 막히면 영영 빈칸이다.
   繁體 페이지를 따로 내보내는 이상 본문이 서버에서 이미 그 언어여야 한다.
   비어 있는 요소만 채우므로, 이미 값이 든 자리는 건드리지 않는다. */
function fillText(html, lang, siteTxt){
  const t = T[lang];
  return html
    .replace(/(<([a-z0-9]+)\b[^>]*\sdata-t="([A-Za-z0-9_]+)"[^>]*>)(<\/\2>)/g,
      (m, open, tag, key, close) => {
        const v = (siteTxt && siteTxt[key] && siteTxt[key][lang]) || t[key];
        return typeof v === "string" ? open + v + close : m;
      })
    .replace(/(<([a-z0-9]+)\b[^>]*\sdata-en="([^"]*)"[^>]*\sdata-zh="([^"]*)"[^>]*>)(<\/\2>)/g,
      (m, open, tag, en, zh, close) => open + (lang === "zh" && zh ? zh : en) + close);
}

function pageIndex({list, site, hero, heroes, css, renderSrc, R, lang="en"}){
  const t=T[lang];
  const zh = lang==="zh";
  const siteTxt={};
  if(site._hero){
    if(site._hero.h1?.en||site._hero.h1?.zh)     siteTxt.h1  ={en:R.fmt(site._hero.h1.en),  zh:R.fmt(site._hero.h1.zh||site._hero.h1.en)};
    if(site._hero.lede?.en||site._hero.lede?.zh) siteTxt.lede={en:R.fmt(site._hero.lede.en),zh:R.fmt(site._hero.lede.zh||site._hero.lede.en)};
  }
  const filt={region:"all",guests:"all",tag:"all"};
  const avg=R.avgRating(list);
  const villages=new Set(list.map(g=>g.region).filter(Boolean)).size;

  const body = `${masthead(lang, "/", "/zh")}
<header class="hero wrap" id="hero">
  <div class="hero-txt">
    <div class="eyebrow"><span class="lbl">01</span><i></i><span class="lbl" data-t="place"></span></div>
    <h1 data-t="h1"></h1>
    <p class="lede" data-t="lede"></p>
    <div class="hero-act">
      <a class="btn btn-auto" href="#collection" id="heroCta">
        <span data-t="heroCta"></span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBF9F5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </a>
      ${avg?`<div class="avg"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="star" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>
        <span><b>${avg}</b> <span data-t="avgLabel"></span></span></div>`:""}
    </div>
    <div class="rule" style="max-width:520px"></div>
    <div class="stats">
      <div class="stat"><b>${list.length||"—"}</b><span class="lbl" data-t="s1"></span></div>
      <div class="stat"><b>${villages||"—"}</b><span class="lbl" data-t="s2"></span></div>
      <div class="stat"><b data-t="s3b"></b><span class="lbl" data-t="s3"></span></div>
    </div>
  </div>
  ${/* 사진 한 장에 이름 하나면 「그 집 사이트」로 읽힌다. 세 곳을 한 번에
        보여주면 여러 곳을 모아둔 자리라는 게 움직임 없이 전달된다.
        세 곳은 히어로 순환과 같은 규칙으로 매주 같이 바뀌고,
        맨 아래로 고정된 숙소는 여기 올라오지 않는다. */""}
  <div class="hero-img">
    ${/* 누를 수 없게 둔다 —— 여기 걸린 세 곳만 상세로 가는 지름길이 생기면
          매주 바뀐다 해도 그 주의 세 곳이 유리해진다. 열다섯 곳을 같은
          조건으로 소개하는 자리라, 사진은 보여주기만 한다. */""}
    ${heroes.length?heroes.map((h,i)=>`<div class="hcell">
      <img src="${R.esc(R.photoAt(h.photo, i?600:1200))}" alt="" loading="${i?"lazy":"eager"}"
           style="object-position:${R.esc(R.FOCUS[h.focus]||"center")}">
      <span class="hc" data-hid="${R.esc(h.id)}">${R.esc(R.name(h,lang))}${i?"":" · "+R.esc(R.shortRegion(R.region(h,lang)))}</span>
    </div>`).join(""):""}
  </div>
</header>

<main class="coll" id="collection">
  <div class="wrap">
    <div class="coll-head">
      <div style="display:flex; flex-direction:column; gap:16px">
        <div class="eyebrow" style="margin:0"><span class="lbl">02</span><i></i><span class="lbl" data-t="secEyebrow"></span></div>
        <h2 data-t="secTitle"></h2>
      </div>
      <p class="coll-note" data-t="secNote"></p>
      ${miniMap(list, R, t)}
    </div>
    ${/* 휴대폰에서는 작은 지도를 목록 위에 두지 않는다 —— 첫 숙소의 예약
          버튼이 화면 두 개 반 아래로 밀려난다. 대신 목록/지도 탭을 준다.
          넓은 화면에서는 이 탭이 숨고 위의 작은 지도가 그 일을 한다. */""}
    <div class="vtabs" id="vtabs" role="group" aria-label="View">
      <button type="button" data-view="list" aria-pressed="true"><span data-t="tabList"></span></button>
      <button type="button" data-view="map" aria-pressed="false"><span data-t="tabMap"></span></button>
    </div>
    <div class="filters" id="filters">${R.filtersHTML(list,lang,filt)}</div>
    <div class="count-row">
      <div class="n" id="countTxt">${t.count(list.length,list.length)}</div>
      <div class="views"><button type="button" id="backList" hidden>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        <span data-t="backList"></span>
      </button></div>
    </div>
    <div class="rule" style="background:var(--hairline-2); margin-bottom:40px"></div>
    <div class="grid" id="grid">${R.gridHTML(list,lang,filt)}</div>
    <div class="mapwrap" id="mapwrap" hidden>
      <div class="mapbox">
        <div class="mapstage" id="mapStage">
          ${ISLE_BIG}
          ${MAPLBL(lang)}
          <div class="mappins" id="mapPins"></div>
        </div>
        ${/* 상세 카드는 지도 칸(mapstage) 밖, 지도 상자 안에 둔다.
              넓은 화면에서는 지도 위에 절대 위치로 떠 있고 —— mapbox 도 기준
              상자라 좌표 계산은 그대로다 —— 휴대폰에서는 position:static 이 되어
              지도 아래 한 줄로 깔린다. 지도 칸이 190px 밖에 안 돼서 그 안에
              띄우면 사진이 잘려나갔다. */""}
        <div class="mapcard" id="mapCard" hidden></div>
        <div class="map-cap"><i></i><span id="mapCap"></span></div>
      </div>
      <div class="side" id="side"></div>
    </div>
  </div>
</main>
${darkFoot}
<button type="button" class="totop" id="toTop" aria-label="Back to top" hidden>
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>`;

  const script = `${preamble(renderSrc, `
const DATA=${JSON.stringify(list)};
const SITE_TXT=${serialize(siteTxt)};
const HERO=${hero?JSON.stringify({id:hero.id}):"null"};
let filt={region:"all",guests:"all",tag:"all"};
let view="list";
const JE=${JSON.stringify({x0:JEJU.x0,x1:JEJU.x1,y0:JEJU.y0,y1:JEJU.y1})};
function PROJ(lat,lng){
  const s=Math.sin(lat*Math.PI/180);
  const my=0.5-Math.log((1+s)/(1-s))/(4*Math.PI);
  return [((lng+180)/360-JE.x0)/(JE.x1-JE.x0)*100, (my-JE.y0)/(JE.y1-JE.y0)*100];
}`, lang, zh?"/zh":"")}
function paint(){
  applyText();
  document.getElementById("filters").innerHTML=R.filtersHTML(DATA,lang,filt);
  document.getElementById("grid").innerHTML=R.gridHTML(DATA,lang,filt);
  const shown=DATA.filter(g=>R.matches(g,filt));
  document.getElementById("countTxt").innerHTML=T[lang].count(shown.length,DATA.length);
  /* 지도가 열려 있으면 같이 다시 그린다 —— 핀 이름과 옆 목록, 캡션이 언어를 따라간다.
     예전엔 여기 window.L(Leaflet) 조건이 붙어 있었는데, Leaflet 을 걷어낸 뒤로
     그 값이 영영 undefined 라 지도가 열린 채 언어를 바꾸면 지도만 옛 언어로 남았다. */
  if(typeof paintMini==="function"){ paintMini(); if(view==="map") paintMap(); }
  /* 히어로 세 칸의 이름 —— 큰 칸만 지역까지 붙인다 */
  document.querySelectorAll(".hcell .hc").forEach((el,i)=>{
    const h=DATA.find(g=>g.id===el.dataset.hid);
    if(h) el.textContent = R.name(h,lang) + (i?"":" · "+R.shortRegion(R.region(h,lang)));
  });
}
document.getElementById("filters").addEventListener("click",e=>{
  const b=e.target.closest("button[data-f]"); if(!b) return;
  filt[b.dataset.f]=b.dataset.v;
  track("filter_change",{filter_type:b.dataset.f,filter_value:b.dataset.v,language:lang});
  paint();
});
document.getElementById("grid").addEventListener("click",e=>{
  const b=e.target.closest("button[data-toggle]"); if(!b) return;
  const box=document.getElementById("rooms-"+b.dataset.toggle);
  const open=box.classList.toggle("open");
  b.textContent = open ? T[lang].ctaHide : T[lang].microRooms(box.children.length);
  if(open) track("rooms_open",{stay:b.dataset.toggle, language:lang});
});
document.getElementById("heroCta").addEventListener("click",()=>track("hero_cta",{language:lang}));

/* ══════════════════════════════════════════════════════════
   지도 —— 섬은 SVG 로 이미 그려져 있다. 여기서는 점을 얹고,
   필터에 맞춰 다시 찍고, 점을 누르면 카드를 띄운다.
   라이브러리도 타일 요청도 없다.
   ══════════════════════════════════════════════════════════ */
var GEO = DATA.filter(function(g){ return g.geo; });
function mapped(){ return GEO.filter(function(g){ return R.matches(g, filt); }); }
/* 지도 옆 목록·핀 카드의 평점 —— 카드와 같은 별, 같은 감귤색.
   숫자만 두면 무슨 숫자인지 모르고, 후기가 없는 곳은 회색으로 흘러 사라진다. */
var STAR_S = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="star" aria-hidden="true">'
           + '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>';
function ratingMark(g){
  return R.hasRating(g)
    ? STAR_S + "<b>" + g.rating.toFixed(2) + "</b> <span>(" + g.reviews + ")</span>"
    : '<span class="new">' + R.esc(T[lang].newListing) + "</span>";
}
function areaOf(g){
  var la = g.geo.lat, ln = g.geo.lng;
  if(la < 33.32 && ln > 126.35) return "S";     /* 남쪽 해안 */
  return ln < 126.55 ? "W" : "E";
}

function paintMini(){
  var box = document.getElementById("mmapDots");
  if(!box) return;
  box.innerHTML = mapped().map(function(g){
    var p = PROJ(g.geo.lat, g.geo.lng);
    return '<i style="left:' + p[0].toFixed(2) + '%;top:' + p[1].toFixed(2) + '%"></i>';
  }).join("");
  var lbl = document.getElementById("mmapLbl");
  if(lbl) lbl.textContent = T[lang].mapMini(mapped().length);
}

/* 250m 거리의 두 숙소는 섬 전체를 담은 지도에서 한 점으로 겹친다.
   겹친 핀은 누를 수가 없으므로, 서로 밀어내 최소 간격을 확보한다.
   밀어내는 거리는 섬 폭의 2% 미만 —— 「어느 쪽 마을인가」라는
   이 지도의 목적에는 영향이 없고, 대신 두 곳이라는 사실이 보인다. */
/* 최소 간격은 지도가 실제로 몇 px 로 그려졌는지에 달렸다. 넓은 화면에서는
   0.019(≈1.9%)면 점끼리 안 겹치지만, 340px 짜리 휴대폰 지도에서는 그게
   6.5px 라 손가락으로 고를 수가 없다. 좁으면 0.05 로 벌린다 —— 점이 제자리에서
   최대 2km 쯤 밀려나는데, 이 지도는 원래 「어느 쪽 마을인가」만 말한다. */
function sepFor(w){ return w < 520 ? 0.05 : 0.019; }
var ASPECT = ${JEJU.h} / ${JEJU.w};      /* 세로 %를 가로 %와 같은 척도로 맞추는 비 */
function spread(pts, SEP){
  for(var pass = 0; pass < 24; pass++){
    var moved = false;
    for(var i = 0; i < pts.length; i++)
      for(var j = i + 1; j < pts.length; j++){
        var dx = (pts[j].x - pts[i].x) / 100;
        var dy = (pts[j].y - pts[i].y) / 100 * ASPECT;
        var d = Math.sqrt(dx*dx + dy*dy);
        if(d >= SEP) continue;
        if(d < 1e-6){ dx = 1e-4; dy = 0; d = 1e-4; }
        var push = (SEP - d) / 2 / d;
        pts[i].x -= dx * push * 100;       pts[j].x += dx * push * 100;
        pts[i].y -= dy * push * 100/ASPECT; pts[j].y += dy * push * 100/ASPECT;
        moved = true;
      }
    if(!moved) break;
  }
  return pts;
}
function paintMap(){
  var t = T[lang], list = mapped();
  var stageW = (document.getElementById("mapStage") || {}).clientWidth || 900;
  var pts = spread(list.map(function(g){
    var p = PROJ(g.geo.lat, g.geo.lng);
    return { g: g, x: p[0], y: p[1] };
  }), sepFor(stageW));
  document.getElementById("mapPins").innerHTML = pts.map(function(q){
    /* 말풍선은 핀 오른쪽·아래로 자라는 게 기본이다.
       핀이 섬 오른쪽에 있으면 왼쪽으로(left), 아래쪽에 있으면 위로(hi) 뒤집어
       말풍선이 지도 밖으로 잘려나가지 않게 한다. */
    var cls = "mpin" + (q.x > 58 ? " left" : "") + (q.y > 52 ? " hi" : "");
    /* 사진은 처음 호버할 때 넣는다 —— 지도를 열자마자 15장을 받아오면
       지도 자체가 느려진다. 여기서는 주소만 들려 보낸다. */
    var img = q.g.photo
      ? '<img alt="" decoding="async" data-src="' + R.esc(R.photoAt(q.g.photo, 320)) + '">'
      : "";
    return '<button type="button" class="' + cls + '" data-pin="' + R.esc(q.g.id) + '"' +
      ' style="left:' + q.x.toFixed(2) + '%;top:' + q.y.toFixed(2) + '%">' +
      '<i></i><span class="tip">' + img +
      '<b>' + R.esc(R.name(q.g, lang)) + "</b></span></button>";
  }).join("");
  PINPOS = {}; pts.forEach(function(q){ PINPOS[q.g.id] = q; });
  document.getElementById("mapCap").textContent = t.mapOn(list.length);
  closeCard();
  paintSide(list);
}
var PINPOS = {};

function paintSide(list){
  var t = T[lang], names = { W:t.areaW, S:t.areaS, E:t.areaE };
  document.getElementById("side").innerHTML = ["W","S","E"].map(function(a){
    var v = list.filter(function(g){ return areaOf(g) === a; });
    if(!v.length) return "";
    return '<div class="grp"><span class="lbl">' + R.esc(names[a]) + "<em>" + v.length + "</em></span></div>" +
      v.map(function(g){
        return '<button type="button" class="item" data-go="' + R.esc(g.id) + '">' +
          '<span class="nm">' + R.esc(R.name(g, lang)) + '</span>' +
          '<span class="rt">' + ratingMark(g) + "</span></button>";
      }).join("");
  }).filter(Boolean).join('<div class="rule"></div>');
}

function highlight(id){
  document.querySelectorAll(".mpin").forEach(function(el){
    el.classList.toggle("on", el.dataset.pin === id);
  });
  document.querySelectorAll(".item").forEach(function(el){
    el.classList.toggle("on", el.dataset.go === id);
  });
}
function closeCard(){
  var c = document.getElementById("mapCard");
  if(c){ c.hidden = true; c.innerHTML = ""; }
}
function openCard(id){
  var g = GEO.filter(function(x){ return x.id === id; })[0];
  if(!g) return;
  var t = T[lang], c = document.getElementById("mapCard"), stage = document.getElementById("mapStage");
  var q = PINPOS[id] || { x: PROJ(g.geo.lat, g.geo.lng)[0], y: PROJ(g.geo.lat, g.geo.lng)[1] };
  var p = [q.x, q.y], n = R.name(g, lang);
  c.innerHTML = '<button type="button" class="x" data-close="1" aria-label="close">&times;</button>' +
    (g.photo ? '<div class="pop-img"><img src="' + R.esc(g.photo) + '" alt="' + R.esc(n) + '"></div>' : "") +
    '<div class="pop-b"><span class="pop-meta"><span class="lbl">' + R.esc(R.region(g, lang)) + "</span>" +
    '<span class="rt">' + ratingMark(g) + "</span></span>" +
    "<h4>" + R.esc(n) + "</h4>" +
    '<div class="meta">' + R.esc(R.availLine(g, t)) + "</div>" +
    '<a class="btn" href="' + R.stayUrl(g) + '" data-detail="' + R.esc(g.id) + '">' + R.esc(t.detail) + "</a></div>";
  c.hidden = false;
  /* 카드가 지도 밖으로 나가지 않게 붙이는 쪽을 고른다 */
  var W = stage.clientWidth, H = stage.clientHeight, cw = c.offsetWidth, ch = c.offsetHeight;
  var x = p[0] / 100 * W, y = p[1] / 100 * H;
  var left = x + 20; if(left + cw > W - 8) left = x - cw - 20;
  if(left < 8) left = 8;
  var top = y - ch / 2; if(top < 8) top = 8;
  if(top + ch > H - 8) top = Math.max(8, H - 8 - ch);
  c.style.left = left + "px"; c.style.top = top + "px";
  highlight(id);
  /* 휴대폰에서는 카드가 지도 아래에 붙는다 —— 지도 아래쪽 핀을 누르면
     카드가 화면 밖에 생겨서 「아무 일도 안 일어났다」로 보인다. */
  if(window.matchMedia("(max-width:760px)").matches){
    var soft = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    c.scrollIntoView({ block:"nearest", behavior: soft ? "smooth" : "auto" });
  }
}

/* 말풍선 사진을 처음 볼 때 한 번만 받아온다. 두 번째부터는 data-src 가
   지워져 있어 아무 일도 하지 않는다. 사진이 아직 안 왔으면 이름만 뜬다. */
function wakeTip(btn){
  var img = btn.querySelector(".tip img[data-src]");
  if(!img) return;
  img.src = img.dataset.src;
  delete img.dataset.src;
  img.onerror = function(){ img.remove(); };
}

function showMap(on){
  view = on ? "map" : "list";
  document.getElementById("grid").hidden = on;
  document.getElementById("mapwrap").hidden = !on;
  document.getElementById("backList").hidden = !on;
  var mm = document.getElementById("mmap");
  if(mm) mm.hidden = on;
  document.querySelectorAll("#vtabs button").forEach(function(b){
    b.setAttribute("aria-pressed", String((b.dataset.view === "map") === on));
  });
  if(on) paintMap(); else closeCard();
}
document.querySelectorAll("#vtabs button").forEach(function(b){
  b.addEventListener("click", function(){
    var toMap = b.dataset.view === "map";
    if(toMap === (view === "map")) return;
    showMap(toMap);
    if(toMap) track("map_open", { language: lang, from: "tab" });
  });
});
/* 맨 위로 —— 랜딩이 길어서 아래까지 내려간 사람이 돌아올 길이 없었다.
   히어로를 지나야 나타나고, 그 전에는 화면을 가리지 않는다. */
var toTop = document.getElementById("toTop");
if(toTop){
  var showAt = 900, shown = false, ticking = false;
  var sync = function(){
    var want = window.scrollY > showAt;
    if(want !== shown){ shown = want; toTop.hidden = !want; }
    ticking = false;
  };
  window.addEventListener("scroll", function(){
    if(!ticking){ ticking = true; requestAnimationFrame(sync); }
  }, {passive:true});
  sync();
  toTop.addEventListener("click", function(){
    var soft = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top:0, behavior: soft ? "auto" : "smooth" });
  });
}

var mmapBtn = document.getElementById("mmap");
if(mmapBtn) mmapBtn.addEventListener("click", function(){
  showMap(true);
  track("map_open", { language: lang });
});
var backBtn = document.getElementById("backList");
if(backBtn) backBtn.addEventListener("click", function(){ showMap(false); });

/* 핀 카드 닫기.
   카드(#mapCard)는 지도 칸(#mapStage) 밖, 지도 상자(.mapbox) 안에 있다 ——
   좁은 화면에서 카드가 지도에 잘리던 걸 고치며 옮겼다. 그런데 닫기 위임은
   지도 칸에 그대로 남아 있어서, × 를 눌러도 아무 일도 일어나지 않았다.
   닫는 길은 셋이다: × 를 누르거나, 카드 바깥을 누르거나, Esc. */
var cardEl = document.getElementById("mapCard");
if(cardEl){
  cardEl.addEventListener("click", function(e){
    if(e.target.closest("[data-close]")) closeCard();
  });
  document.addEventListener("click", function(e){
    if(cardEl.hidden) return;
    /* 지도 칸 안의 클릭은 지도 쪽 처리기가 알아서 한다 (가까운 핀 / 닫기) */
    if(e.target.closest("#mapCard") || e.target.closest("#mapStage")) return;
    closeCard();
  });
  document.addEventListener("keydown", function(e){
    if((e.key === "Escape" || e.key === "Esc") && !cardEl.hidden) closeCard();
  });
}

var stageEl = document.getElementById("mapStage");
if(stageEl){
  stageEl.addEventListener("click", function(e){
    if(e.target.closest("[data-close]")) return closeCard();
    var b = e.target.closest("[data-pin]");
    if(b) return openCard(b.dataset.pin);
    if(e.target.closest(".mapcard")) return;
    /* 빗나간 터치는 버리지 말고 가장 가까운 점으로 보낸다 —— 점 사이가
       17px 인 휴대폰 지도에서 손가락으로 정확히 맞히기는 어렵다. */
    var st = e.currentTarget.getBoundingClientRect();
    var px = (e.clientX - st.left) / st.width * 100;
    var py = (e.clientY - st.top) / st.height * 100;
    var near = null, best = Infinity;
    for(var id in PINPOS){
      var q = PINPOS[id];
      var dx = (q.x - px) / 100 * st.width;
      var dy = (q.y - py) / 100 * st.height;
      var d = Math.sqrt(dx*dx + dy*dy);
      if(d < best){ best = d; near = id; }
    }
    if(near && best <= 34) openCard(near); else closeCard();
  });
  stageEl.addEventListener("mouseover", function(e){
    var b = e.target.closest("[data-pin]"); if(b){ highlight(b.dataset.pin); wakeTip(b); }
  });
  /* 키보드로 핀을 훑을 때도 사진이 나와야 한다 —— focus 는 버블링하지 않으므로 캡처로 받는다 */
  stageEl.addEventListener("focusin", function(e){
    var b = e.target.closest("[data-pin]"); if(b) wakeTip(b);
  });
  stageEl.addEventListener("mouseout", function(e){
    if(e.target.closest("[data-pin]")) highlight(null);
  });
}
var sideEl = document.getElementById("side");
if(sideEl){
  sideEl.addEventListener("mouseover", function(e){
    var b = e.target.closest("[data-go]"); if(b) highlight(b.dataset.go);
  });
  sideEl.addEventListener("mouseout", function(e){
    if(e.target.closest("[data-go]")) highlight(null);
  });
  sideEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-go]"); if(b) openCard(b.dataset.go);
  });
}

/* 최초 렌더 —— 지도 상태가 다 준비된 뒤에 한 번 */
paint();
`;

  /* 검색엔진용 목록 —— 이 페이지가 「숙소 열다섯 곳의 목록」이라는 것을
     사람 눈이 아니라 기계에 알려 준다. 화면 순서를 그대로 따르므로
     맨 아래로 고정한 곳은 여기서도 맨 뒤다. 평점은 넣지 않는다 ——
     상세 페이지에서 표본 기준을 넘긴 곳만 쓰기로 한 규칙을 목록이
     우회해 버리면 안 되기 때문. */
  const ld = {
    "@context":"https://schema.org", "@type":"CollectionPage",
    name:"Jeju Stay Collection",
    url:SITE+"/",
    mainEntity:{
      "@type":"ItemList",
      numberOfItems:list.length,
      itemListOrder:"https://schema.org/ItemListOrderAscending",
      itemListElement:list.map((g,i)=>({
        "@type":"ListItem", position:i+1,
        item:{
          "@type":"LodgingBusiness",
          name:R.name(g,"en"),
          url:`${SITE}/stay/${g.id}`,
          ...(g.photo?{image:g.photo}:{}),
          address:{"@type":"PostalAddress",
                   addressRegion:R.region(g,"en"), addressCountry:"KR"},
          ...(g.geo?{geo:{"@type":"GeoCoordinates",
                          latitude:g.geo.lat, longitude:g.geo.lng}}:{})
        }
      }))
    }
  };

  const html = shell({
    title:META[lang].title,
    desc:META[lang].desc,
    lang:zh?"zh-Hant":"en",
    canonical:SITE+(zh?"/zh":"/"),
    alts:{en:SITE+"/", zh:SITE+"/zh"},
    /* 공유 카드 —— 카톡·아이메시지가 집어가는 그림은 한 장짜리 정지
       이미지라, 숙소 사진 한 장을 쓰면 그 주의 히어로 숙소만 공짜 노출을
       가져간다. 컬렉션 전체를 가리키는 그림을 따로 둔다. ogcard.mjs 로 만든다. */
    ogImage:SITE+"/og.png",
    ogAlt:"Jeju Stay Collection",
    /* 공유 카드의 제목은 따로 —— 검색용 <title> 을 그대로 쓰면
       카톡에서 「… Handpicked Vil…」 로 잘린다. */
    ogTitle:"Jeju Stay Collection",
    css, body:fillText(body, lang, siteTxt), script
  });
  return html.replace("</head>",
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
}

/* ---------- 상세 페이지 ---------- */
function pageStay({g, others, css, renderSrc, R, lang="en"}){
  const t=T[lang];
  const zh=lang==="zh";
  const n=R.name(g,lang), region=R.region(g,lang);
  const desc=(R.intro(g,lang) || (zh ? `${n} —— 濟州島 ${region} 的精選住宿。`
                                     : `${n} — a handpicked stay in ${region}, Jeju Island.`)).slice(0,300);

  const body = `${masthead(lang, `/stay/${g.id}`, `/zh/stay/${g.id}`)}
<div id="stayRoot">${R.stayHTML(g,others,lang)}</div>
${darkFoot}`;

  const script = `${preamble(renderSrc, `
const STAY=${JSON.stringify(g)};
const OTHERS=${JSON.stringify(others)};`, lang, zh?"/zh":"")}
function paint(){
  applyText();
  document.getElementById("stayRoot").innerHTML=R.stayHTML(STAY,OTHERS,lang);
  document.title = R.name(STAY,lang) + " — Jeju Stay Collection";
}
paint();`;

  /* 검색엔진용 구조화 데이터 —— 평점은 표본 기준을 넘겼을 때만 넣는다 */
  const ld = {
    "@context":"https://schema.org", "@type":"LodgingBusiness",
    name:n, description:desc, url:`${SITE}/stay/${g.id}`,
    address:{"@type":"PostalAddress", addressRegion:region, addressCountry:"KR"},
    ...(g.photo?{image:g.photo}:{}),
    ...(g.geo?{geo:{"@type":"GeoCoordinates", latitude:g.geo.lat, longitude:g.geo.lng}}:{}),
    ...(R.hasRating(g)?{aggregateRating:{"@type":"AggregateRating",
        ratingValue:g.rating.toFixed(2), reviewCount:g.reviews, bestRating:5}}:{})
  };

  const html = shell({
    title:`${n} — Jeju Stay Collection`,
    desc:desc.replace(/"/g,"&quot;"),
    lang:zh?"zh-Hant":"en",
    canonical:`${SITE}${zh?"/zh":""}/stay/${g.id}`,
    alts:{en:`${SITE}/stay/${g.id}`, zh:`${SITE}/zh/stay/${g.id}`},
    /* 상세 페이지는 그 숙소 사진이 맞다 —— 그 숙소를 보라고 보내는 링크이므로.
       사진이 없으면 컬렉션 카드로 떨어진다. */
    ogImage:g.photo||SITE+"/og.png",
    ogTitle:n, ogAlt:`${n}, ${region}`,
    css, body:fillText(body, lang, null), script
  });
  return html.replace("</head>",
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
}

/* ---------- 없는 주소 ----------
   주소를 잘못 눌렀거나, 시트에서 내린 숙소의 링크가 어딘가에 남아 있을 때
   호스팅 기본 화면이 뜨면 그 사람은 그대로 나간다. 컬렉션으로 돌려보낸다. */
function page404({css}){
  const body = `${masthead("en", "/", "/zh")}
<main class="wrap nf">
  <div class="eyebrow"><span class="lbl">404</span></div>
  <h1>This page has moved on.</h1>
  <p class="lede">The stay you were looking for may have left the collection,
     or the address was mistyped. The fifteen houses are all one click away.</p>
  <div class="s-act"><a class="btn btn-auto" href="/">The Collection</a></div>
</main>
${darkFoot}`;
  return shell({
    title:"Not found — Jeju Stay Collection",
    desc:"That page is not here. The collection of handpicked stays on Jeju Island is one click away.",
    canonical:SITE+"/", noindex:true, ogImage:SITE+"/og.png", ogTitle:"Jeju Stay Collection",
    css, body:fillText(body, "en", null),
    script:`document.querySelectorAll(".lang a").forEach(function(b){b.addEventListener("click",function(){});});`
  });
}

/* ---------- 실행 ---------- */
async function main(){
  /* 지도 비율은 해안선 데이터에서 나온다 —— 좌표를 다시 뽑으면
     뷰박스가 달라지므로 CSS 에 숫자를 박아두면 조용히 어긋난다. */
  const css       = await readFile(path.join(SRC,"theme.css"), "utf8")
                  + `\n:root{--map-ar:${JEJU.w}/${JEJU.h}}\n`;
  const renderSrc = await readFile(path.join(SRC,"render.js"), "utf8");
  /* 같은 렌더러를 언어별 접두사만 바꿔 두 벌 만든다 */
  const mkR       = pre => new Function(renderSrc + "; return makeRender;")()(T,TAGS,BADGES,MIN_REVIEWS,pre);
  const R         = mkR(""), Rz = mkR("/zh");

  const {list, site} = buildStays(await loadTable());
  if(list.length < MIN_STAYS)
    throw new Error(`숙소가 ${list.length}개만 파싱됨 (최소 ${MIN_STAYS}). 시트가 비었거나 열 순서가 바뀐 것 —— 배포를 멈춘다.`);

  const heroes = pickHeroes(list, 3);
  const hero = heroes[0] || null;

  await rm(DIST,{recursive:true,force:true});
  await mkdir(DIST,{recursive:true});
  if(existsSync(PUBLIC)) await cp(PUBLIC, DIST, {recursive:true});

  await writeFile(path.join(DIST,"index.html"),
    pageIndex({list, site, hero, heroes, css, renderSrc, R, lang:"en"}), "utf8");
  await mkdir(path.join(DIST,"zh"),{recursive:true});
  await writeFile(path.join(DIST,"zh","index.html"),
    pageIndex({list, site, hero, heroes, css, renderSrc, R:Rz, lang:"zh"}), "utf8");

  for(const g of list){
    /* 「다른 숙소」 —— 같은 지역 먼저, 그다음 정렬 순서. 자기 자신 제외. */
    const rest = list.filter(o=>o.id!==g.id);
    const near = rest.filter(o=>o.region===g.region);
    const others = [...near, ...rest.filter(o=>o.region!==g.region)].slice(0,4);
    for(const [lang, rr, sub] of [["en",R,""],["zh",Rz,"zh"]]){
      const dir = path.join(DIST, sub, "stay", g.id);
      await mkdir(dir,{recursive:true});
      await writeFile(path.join(dir,"index.html"),
        pageStay({g, others, css, renderSrc, R:rr, lang}), "utf8");
    }
  }

  /* 사이트맵에는 두 언어를 모두 넣는다 —— 한쪽만 내면 다른 언어는
     색인이 늦거나 아예 안 잡힌다. 서로를 가리키는 hreflang 은 각 페이지 head 에. */
  const paths = ["/", ...list.map(g=>`/stay/${g.id}`)];
  const urls  = [...paths, ...paths.map(u => u==="/" ? "/zh" : "/zh"+u)];
  const today = new Date().toISOString().slice(0,10);
  await writeFile(path.join(DIST,"sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
    urls.map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")+
    `\n</urlset>\n`, "utf8");
  await writeFile(path.join(DIST,"404.html"), page404({css}), "utf8");
  await writeFile(path.join(DIST,"robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, "utf8");

  console.log(`· 숙소 ${list.length}곳`);
  console.log(`· 히어로 ${hero?hero.id:"(없음)"}`);
  console.log(`· 좌표 있는 숙소 ${list.filter(g=>g.geo).length}곳 / 평점 표시 ${list.filter(g=>R.hasRating(g)).length}곳`);
  console.log(`· 페이지 ${urls.length}개 (영문 ${paths.length} · 繁體 ${paths.length}) → dist/`);
}

main().catch(e=>{ console.error("\n✗ 빌드 실패:", e.message, "\n"); process.exit(1); });

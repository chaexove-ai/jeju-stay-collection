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

import { parseCSV, buildStays, pickHero } from "./src/data.mjs";
import { T, TAGS, BADGES, MIN_REVIEWS } from "./src/i18n.mjs";

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

/* ---------- 페이지 껍데기 ---------- */
function shell({title, desc, canonical, ogImage, css, body, script, lang="en"}){
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Jeju Stay Collection">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">${ogImage?`
<meta property="og:image" content="${ogImage}">`:""}
<meta name="twitter:card" content="${ogImage?"summary_large_image":"summary"}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Jost:wght@400;500&family=Noto+Serif+TC:wght@400&family=Noto+Sans+TC:wght@400;500&display=swap">
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

const masthead = `<div class="bar">
  <div class="wrap bar-in">
    <a class="brand" href="/">${MARK}<div class="brand-txt"><b>Jeju Stay</b><span>Collection</span></div></a>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="en" aria-pressed="true">English</button>
      <button type="button" data-lang="zh" aria-pressed="false">繁體中文</button>
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
  </div>
</div>`;

/* ---------- 공통 클라이언트 머리말 ---------- */
const preamble = (renderSrc, extra) => `
${renderSrc}
const T=${serialize(T)};
const TAGS=${serialize(TAGS)};
const BADGES=${serialize(BADGES)};
const MIN_REVIEWS=${MIN_REVIEWS};
${extra}
const R=makeRender(T,TAGS,BADGES,MIN_REVIEWS);
let lang="en";
try{const s=localStorage.getItem("mm_lang"); if(s&&T[s]) lang=s;}catch(e){}
function track(n,p){try{if(typeof gtag==="function")gtag("event",n,p);}catch(e){}}
function applyText(){
  document.documentElement.lang = lang==="zh" ? "zh-Hant" : "en";
  const t=T[lang];
  document.querySelectorAll("[data-t]").forEach(el=>{
    const v=(typeof SITE_TXT!=="undefined" && SITE_TXT[el.dataset.t] && SITE_TXT[el.dataset.t][lang]) || t[el.dataset.t];
    if(typeof v==="string") el.innerHTML=v;
  });
  document.querySelectorAll(".lang button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===lang)));
}
document.querySelectorAll(".lang button").forEach(b=>b.addEventListener("click",()=>{
  lang=b.dataset.lang;
  try{localStorage.setItem("mm_lang",lang);}catch(e){}
  track("language_switch",{language:lang});
  paint();
}));
document.addEventListener("click",e=>{
  const a=e.target.closest("a[data-prop]");
  if(a) track("airbnb_click",{stay:a.dataset.prop, stay_name:a.dataset.name, room:a.dataset.room, language:lang});
  const d=e.target.closest("a[data-detail]");
  if(d) track("stay_detail",{stay:d.dataset.detail, language:lang});
});`;

/* ---------- 목록 페이지 ---------- */
function pageIndex({list, site, hero, css, renderSrc, R}){
  const t=T.en;
  const siteTxt={};
  if(site._hero){
    if(site._hero.h1?.en||site._hero.h1?.zh)     siteTxt.h1  ={en:R.fmt(site._hero.h1.en),  zh:R.fmt(site._hero.h1.zh||site._hero.h1.en)};
    if(site._hero.lede?.en||site._hero.lede?.zh) siteTxt.lede={en:R.fmt(site._hero.lede.en),zh:R.fmt(site._hero.lede.zh||site._hero.lede.en)};
  }
  const filt={region:"all",guests:"all",tag:"all"};
  const avg=R.avgRating(list);
  const villages=new Set(list.map(g=>g.region).filter(Boolean)).size;

  const body = `${masthead}
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
      ${avg?`<div class="avg"><svg width="15" height="15" viewBox="0 0 24 24" fill="#57534B" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>
        <span><b>${avg}</b> <span data-t="avgLabel"></span></span></div>`:""}
    </div>
    <div class="rule" style="max-width:520px"></div>
    <div class="stats">
      <div class="stat"><b>${list.length||"—"}</b><span class="lbl" data-t="s1"></span></div>
      <div class="stat"><b>${villages||"—"}</b><span class="lbl" data-t="s2"></span></div>
      <div class="stat"><b data-t="s3b"></b><span class="lbl" data-t="s3"></span></div>
    </div>
  </div>
  <div class="hero-img">
    ${hero?`<img src="${R.esc(hero.photo)}" alt="" style="object-position:${R.esc(R.FOCUS[hero.focus]||"center")}">
    <div class="hero-cap"><i></i><span id="heroCap">${R.esc(R.name(hero,"en"))} · ${R.esc(R.shortRegion(R.region(hero,"en")))}</span></div>`:""}
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
    </div>
    <div class="filters" id="filters">${R.filtersHTML(list,"en",filt)}</div>
    <div class="count-row"><div class="n" id="countTxt">${t.count(list.length,list.length)}</div></div>
    <div class="rule" style="background:var(--hairline-2); margin-bottom:40px"></div>
    <div class="grid" id="grid">${R.gridHTML(list,"en",filt)}</div>
  </div>
</main>
${darkFoot}`;

  const script = `${preamble(renderSrc, `
const DATA=${JSON.stringify(list)};
const SITE_TXT=${serialize(siteTxt)};
const HERO=${hero?JSON.stringify({id:hero.id}):"null"};
let filt={region:"all",guests:"all",tag:"all"};`)}
function paint(){
  applyText();
  document.getElementById("filters").innerHTML=R.filtersHTML(DATA,lang,filt);
  document.getElementById("grid").innerHTML=R.gridHTML(DATA,lang,filt);
  const shown=DATA.filter(g=>R.matches(g,filt));
  document.getElementById("countTxt").innerHTML=T[lang].count(shown.length,DATA.length);
  const cap=document.getElementById("heroCap");
  if(cap&&HERO){
    const h=DATA.find(g=>g.id===HERO.id);
    if(h) cap.textContent=R.name(h,lang)+" · "+R.shortRegion(R.region(h,lang));
  }
}
document.getElementById("filters").addEventListener("click",e=>{
  const b=e.target.closest("button[data-f]"); if(!b) return;
  filt[b.dataset.f]=b.dataset.v;
  track("filter_change",{filter_type:b.dataset.f,filter_value:b.dataset.v,language:lang});
  paint();
});
document.getElementById("heroCta").addEventListener("click",()=>track("hero_cta",{language:lang}));
paint();`;

  return shell({
    title:"Jeju Stay Collection — Handpicked Villas &amp; Stays on Jeju Island",
    desc:"A curated collection of private pool villas, ocean-view retreats and quiet stone houses across Jeju Island — each one visited and looked after by a local team.",
    canonical:SITE+"/",
    ogImage:hero?hero.photo:"",
    css, body, script
  });
}

/* ---------- 상세 페이지 ---------- */
function pageStay({g, others, css, renderSrc, R}){
  const t=T.en;
  const n=R.name(g,"en"), region=R.region(g,"en");
  const desc=(R.intro(g,"en") || `${n} — a handpicked stay in ${region}, Jeju Island.`).slice(0,300);

  const body = `${masthead}
<div id="stayRoot">${R.stayHTML(g,others,"en")}</div>
${darkFoot}`;

  const script = `${preamble(renderSrc, `
const STAY=${JSON.stringify(g)};
const OTHERS=${JSON.stringify(others)};`)}
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
    canonical:`${SITE}/stay/${g.id}`,
    ogImage:g.photo||"",
    css, body, script
  });
  return html.replace("</head>",
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);
}

/* ---------- 실행 ---------- */
async function main(){
  const css       = await readFile(path.join(SRC,"theme.css"), "utf8");
  const renderSrc = await readFile(path.join(SRC,"render.js"), "utf8");
  const R         = new Function(renderSrc + "; return makeRender;")()(T,TAGS,BADGES,MIN_REVIEWS);

  const {list, site} = buildStays(await loadTable());
  if(list.length < MIN_STAYS)
    throw new Error(`숙소가 ${list.length}개만 파싱됨 (최소 ${MIN_STAYS}). 시트가 비었거나 열 순서가 바뀐 것 —— 배포를 멈춘다.`);

  const hero = pickHero(list);

  await rm(DIST,{recursive:true,force:true});
  await mkdir(DIST,{recursive:true});
  if(existsSync(PUBLIC)) await cp(PUBLIC, DIST, {recursive:true});

  await writeFile(path.join(DIST,"index.html"),
    pageIndex({list, site, hero, css, renderSrc, R}), "utf8");

  for(const g of list){
    /* 「다른 숙소」 —— 같은 지역 먼저, 그다음 정렬 순서. 자기 자신 제외. */
    const rest = list.filter(o=>o.id!==g.id);
    const near = rest.filter(o=>o.region===g.region);
    const others = [...near, ...rest.filter(o=>o.region!==g.region)].slice(0,4);
    const dir = path.join(DIST,"stay",g.id);
    await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,"index.html"),
      pageStay({g, others, css, renderSrc, R}), "utf8");
  }

  const urls = ["/", ...list.map(g=>`/stay/${g.id}`)];
  const today = new Date().toISOString().slice(0,10);
  await writeFile(path.join(DIST,"sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
    urls.map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")+
    `\n</urlset>\n`, "utf8");
  await writeFile(path.join(DIST,"robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, "utf8");

  console.log(`· 숙소 ${list.length}곳`);
  console.log(`· 히어로 ${hero?hero.id:"(없음)"}`);
  console.log(`· 좌표 있는 숙소 ${list.filter(g=>g.geo).length}곳 / 평점 표시 ${list.filter(g=>R.hasRating(g)).length}곳`);
  console.log(`· 페이지 ${urls.length}개 → dist/`);
}

main().catch(e=>{ console.error("\n✗ 빌드 실패:", e.message, "\n"); process.exit(1); });

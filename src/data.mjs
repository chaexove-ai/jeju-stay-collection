/* ============================================================
   구글 시트 → 숙소 목록
   열 순서로 값을 읽으므로 시트의 열을 사이에 끼워넣지 말 것.
   A고정순서 B예약률 C노출 D숙소ID E배지 F숙소명KO G이름EN H이름ZH
   I지역EN J지역ZH K소개EN L소개ZH M태그 N객실EN O객실ZH P최대인원
   Q전체대관 R사진 S링크 T사진위치 U소개KO V평점 W후기수 X위도 Y경도
   ============================================================ */

export const COL = {
  pin:0, occ:1, show:2, id:3, badge:4, nameKo:5, nameEn:6, nameZh:7,
  regionEn:8, regionZh:9, introEn:10, introZh:11, tags:12,
  roomEn:13, roomZh:14, sleeps:15, whole:16, photo:17, link:18,
  focus:19, introKo:20, rating:21, reviews:22, lat:23, lng:24
};

export const IMG_DIR = "img";

export function parseCSV(text){
  const out=[]; let row=[], cell="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=c;
    }else{
      if(c==='"') q=true;
      else if(c===","){ row.push(cell); cell=""; }
      else if(c==="\n"){ row.push(cell); out.push(row); row=[]; cell=""; }
      else if(c!=="\r") cell+=c;
    }
  }
  if(cell!==""||row.length){ row.push(cell); out.push(row); }
  return out;
}

const num = s => { const v=parseFloat(String(s??"").replace(/[^\d.\-]/g,"")); return Number.isFinite(v)?v:null; };
const isUrl = s => { const v=(s||"").trim(); return /^https?:\/\/\S+\.\S+/.test(v) && !v.startsWith("https://..."); };

export function photoSrc(v){
  const s=(v||"").trim();
  if(!s || s.startsWith("https://...")) return "";
  if(/^https?:\/\//.test(s)) return s;
  if(s.startsWith("/")||s.startsWith("./")) return s;
  if(/\.(jpe?g|png|webp|avif)$/i.test(s)) return IMG_DIR.replace(/\/$/,"") + "/" + s;
  return "";
}

export const shortRegion = r => (r||"").split(/[-,]/)[0].trim();

/* 좌표는 제주도 범위 안에 있을 때만 신뢰한다.
   위경도를 뒤집어 넣는 실수가 잦아서, 값이 밖으로 나가면 그냥 버린다.
   제주 본섬 + 부속도서: 위도 33.1~33.6, 경도 126.1~126.99 */
export function geo(latRaw, lngRaw){
  const lat=num(latRaw), lng=num(lngRaw);
  if(lat===null || lng===null) return null;
  if(lat>=33.0 && lat<=33.7 && lng>=126.0 && lng<=127.0) return {lat,lng};
  /* 뒤집힌 경우 한 번 구제 */
  if(lng>=33.0 && lng<=33.7 && lat>=126.0 && lat<=127.0) return {lat:lng, lng:lat};
  return null;
}

const CARRY = ["badge","badgeRaw","nameKo","nameEn","nameZh","regionEn","regionZh",
               "introEn","introZh","introKo","tagsRaw","photo","focus","rating","reviews","lat","lng"];

export function buildStays(table){
  const body = table.slice(1).filter(r=>r.some(c=>c&&c.trim()));
  const map = new Map(); const site = {};
  const cell = (r,i) => (r[i]||"").trim();

  for(const c of body){
    const id = cell(c, COL.id);
    if(!id || id==="숙소ID") continue;

    if(id.startsWith("_")){
      site[id.toLowerCase()] = {
        h1:  {en:cell(c,COL.nameEn),  zh:cell(c,COL.nameZh)},
        lede:{en:cell(c,COL.introEn), zh:cell(c,COL.introZh)}
      };
      continue;
    }

    if(!map.has(id)) map.set(id,{id,pin:null,occ:null,rooms:[],
      badge:"",badgeRaw:"",nameKo:"",nameEn:"",nameZh:"",regionEn:"",regionZh:"",
      introEn:"",introZh:"",introKo:"",tagsRaw:"",photo:"",focus:"",
      rating:null,reviews:null,lat:null,lng:null});
    const g=map.get(id);
    if(g.pin===null) g.pin=num(c[COL.pin]);
    if(g.occ===null) g.occ=num(c[COL.occ]);

    const row={
      badge:cell(c,COL.badge).toUpperCase(), badgeRaw:cell(c,COL.badge),
      nameKo:cell(c,COL.nameKo), nameEn:cell(c,COL.nameEn), nameZh:cell(c,COL.nameZh),
      regionEn:cell(c,COL.regionEn), regionZh:cell(c,COL.regionZh),
      introEn:cell(c,COL.introEn), introZh:cell(c,COL.introZh), introKo:cell(c,COL.introKo),
      tagsRaw:cell(c,COL.tags), photo:cell(c,COL.photo),
      focus:cell(c,COL.focus).toLowerCase(),
      rating:num(c[COL.rating]), reviews:num(c[COL.reviews]),
      lat:num(c[COL.lat]), lng:num(c[COL.lng])
    };
    for(const k of CARRY) if(!g[k] && row[k]) g[k]=row[k];

    const show = (cell(c,COL.show)||"Y").toUpperCase()!=="N";
    const link = cell(c,COL.link);
    if(show && isUrl(link)){
      g.rooms.push({
        nameEn:cell(c,COL.roomEn), nameZh:cell(c,COL.roomZh),
        sleeps:num(c[COL.sleeps]), whole:cell(c,COL.whole).toUpperCase()==="Y",
        photo:cell(c,COL.photo), focus:cell(c,COL.focus).toLowerCase(), link
      });
    }
  }

  const list=[...map.values()].filter(g=>g.rooms.length);
  list.forEach(g=>{
    g.tags = g.tagsRaw.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
    g.rooms.sort((a,b)=>(b.whole?1:0)-(a.whole?1:0));
    if(!photoSrc(g.photo)){
      const src=g.rooms.find(r=>photoSrc(r.photo));
      if(src){ g.photo=src.photo; if(!g.focus) g.focus=src.focus; }
    }
    g.photo = photoSrc(g.photo) || "";
    g.rooms.forEach(r=>{ r.photo = photoSrc(r.photo) || ""; });
    g.maxSleeps = Math.max(0, ...g.rooms.map(r=>r.sleeps||0));
    g.anyWhole  = g.rooms.some(r=>r.whole);
    /* 지역 필터의 키는 언제나 영문 약칭이다 —— 언어를 바꿔도 고른 필터가
       풀리면 안 되기 때문. 화면에 찍을 글자는 따로 들고 간다.
       繁體는 「濟州 涯月邑」처럼 앞에 시 이름이 붙어 오므로 뒤 토막만 쓴다. */
    g.region    = shortRegion(g.regionEn);
    g.regionTag = { en: g.region,
                    zh: (g.regionZh||"").trim().split(/\s+/).pop() || g.region };
    g.bottom    = g.pin!==null && g.pin<0;
    g.geo       = geo(g.lat, g.lng);
    delete g.lat; delete g.lng; delete g.tagsRaw;
  });

  /* 정렬: 고정(양수) → 예약률 낮은 순 → 이름 / 음수 고정은 맨 아래 */
  list.sort((a,b)=>{
    if(a.bottom!==b.bottom) return a.bottom?1:-1;
    if(a.bottom&&b.bottom) return a.pin-b.pin;
    const aT=a.pin!==null, bT=b.pin!==null;
    if(aT!==bT) return aT?-1:1;
    if(aT) return a.pin-b.pin;
    const ao=a.occ===null?9999:a.occ, bo=b.occ===null?9999:b.occ;
    if(ao!==bo) return ao-bo;
    return (a.nameEn||"").localeCompare(b.nameEn||"");
  });
  return {list, site};
}

/* 히어로 사진 —— 손으로 고르지 않는다.
   사진이 있는 숙소들 사이에서 주 단위로 자동 순환하며,
   맨 아래로 고정된 숙소(고정순서 음수)는 순환에서 제외된다.
   시트 _hero 행의 사진 칸은 무시된다 — 컬렉션 운영자가 자기 숙소를
   히어로에 올릴 수 없게 하려는 규칙이므로 되돌리지 말 것.
   빌드 시점에 결정되므로, 재배포가 없으면 사진도 바뀌지 않는다.
   시트 수정마다 재배포가 걸려 있으니 실질적으로는 주 단위로 돈다. */
export function pickHero(list, now = Date.now()){
  const pool = list.filter(g=>g.photo && !g.bottom);
  if(!pool.length) return null;
  const week = Math.floor(now/6048e5);
  return pool[week % pool.length];
}

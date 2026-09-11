/* ============================================================
   렌더러 —— 빌드(Node)와 브라우저가 같은 소스를 쓴다.
   이 파일은 import/export 없는 평범한 스크립트여야 한다.
   build.mjs 는 소스를 그대로 페이지에 넣고,
   서버 렌더링을 위해 new Function 으로도 불러온다.
   따라서 여기서 DOM 을 건드리면 안 된다 —— 문자열만 만든다.
   ============================================================ */
function makeRender(T, TAGS, BADGES, MIN_REVIEWS, PREFIX){

  /* 언어마다 주소가 다르다 —— 영문은 /, 繁體는 /zh/.
     같은 렌더러를 접두사만 바꿔 두 번 돌린다. 화면 안의 모든 내부 링크가
     자기 언어 안에 머물러야, 중국어로 보던 사람이 링크 한 번에 영어로
     떨어지지 않는다. */
  PREFIX = PREFIX || "";
  const HOME = PREFIX || "/";

  const esc = s => String(s??"").replace(/[&<>"]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmt = s => esc(s).replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\r?\n/g,"<br>");

  const FOCUS = {top:"center top",bottom:"center bottom",left:"left center",right:"right center",center:"center"};
  const PH = ["#1c6b7a","#0d3b45","#2F4A43","#6E6558","#3d5058","#134f5c"];
  const shortRegion = r => (r||"").split(/[-,]/)[0].trim();

  const ARROW='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const BACK ='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  const STAR ='<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="star" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>';


  /* 설비 아이콘 —— 「여기 뭐가 있나」를 글자만으로 읽게 하면 목록을 훑지 않는다.
     선 하나짜리 그림이면 눈이 먼저 잡고 글자가 뒤따른다.
     굵기·둥근 끝은 브랜드 마크와 같은 값이라 한 손에서 나온 것처럼 보인다.
     사전(TAGS)의 키와 1:1 이고, 없는 키는 그냥 글자만 나간다. */
  const IC = {
    POOL:    'M7 13.5V7a2.5 2.5 0 0 1 5 0v6.5M7 9h5M7 11.5h5M3 17c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0M3 21c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0',
    HEATED:  'M3 18c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0M8 12c0-2 2-2 2-4s-2-2-2-4M16 12c0-2-2-2-2-4s2-2 2-4',
    INDOOR:  'M4 10.5 12 4l8 6.5V20H4zM7 16c1.7-1.6 3.3-1.6 5 0s3.3 1.6 5 0',
    OCEAN:   'M3 8c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0M3 13c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0M3 18c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0',
    BEACH:   'M12 12v8M4 12a8 8 0 0 1 16 0zM3 21c1.5-1.3 3-1.3 4.5 0M16.5 21c1.5-1.3 3-1.3 4.5 0',
    MOUNTAIN:'M2 19l6.5-9 3.5 4.6L15.5 10 22 19zM8.5 10l1.7 2.3',
    SUNRISE: 'M3 20h18M7.5 16a4.5 4.5 0 0 1 9 0M12 3v5M12 3L9.5 5.5M12 3l2.5 2.5M4 12.5l1.8 1.8M20 12.5l-1.8 1.8',
    SUNSET:  'M3 20h18M7.5 16a4.5 4.5 0 0 1 9 0M12 8V3M12 8L9.5 5.5M12 8l2.5-2.5M4 12.5l1.8 1.8M20 12.5l-1.8 1.8',
    JACUZZI: 'M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM7 12V6a2 2 0 0 1 4 0M10 4.5h2M15 9V7.5M18 9.5V8',
    SPA:     'M12 21c0-4.5 2.8-7.5 7.5-7.5C19.5 18 16.7 21 12 21zM12 21c0-4.5-2.8-7.5-7.5-7.5C4.5 18 7.3 21 12 21zM12 21v-6.5c0-3 1.2-5.5 3-7',
    SAUNA:   'M4 20h16M6 20v-3a6 6 0 0 1 12 0v3M9 9c0-1.6 1.5-1.8 1.5-3.2S9 3.6 9 2M15 9c0-1.6-1.5-1.8-1.5-3.2S15 3.6 15 2',
    CINEMA:  'M3 5h18v12H3zM9 21h6M12 17v4M10.5 8.5l4 2.5-4 2.5z',
    KARAOKE: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V21M9 21h6',
    BBQ:     'M4 11h16v1.5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM8.5 18.5 6.5 21.5M15.5 18.5l2 3M9 7.5c0-1.6 1.5-1.6 1.5-3.2M14 7.5c0-1.6-1.5-1.6-1.5-3.2',
    KITCHEN: 'M3.5 11.5h12V15a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4zM15.5 13.5h5M8 8c0-1.4 1.3-1.4 1.3-2.8M12 8c0-1.4 1.3-1.4 1.3-2.8',
    PARKING: 'M4 4h16v16H4zM10 16.5V8h3.2a2.6 2.6 0 0 1 0 5.2H10',
    GARDEN:  'M12 21v-5.5M12 15.5a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4zM8 21h8',
    ORCHARD: 'M12 21a6 6 0 0 0 0-12 6 6 0 0 0 0 12zM12 9c0-2.5 2-4.5 4.5-4.5C16.5 7 14.5 9 12 9z',
    FOREST:  'M8 16L4 16l4-7 4 7H10M8 16v5M17 18h-3.5l3.5-6 3.5 6H17M17 18v3',
    CAMPING: 'M12 4 3.5 20h17zM12 4v16M8.5 20l3.5-6.5 3.5 6.5',
    STONE:   'M3 5h18v14H3zM3 9.5h18M3 14.5h18M9 5v4.5M15 5v4.5M6 9.5v5M12 9.5v5M18 9.5v5M9 14.5V19M15 14.5V19',
    DESIGN:  'M9.5 4a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM11 11h9v9h-9z',
    PHOTO:   'M3 7.5h4l1.5-3h7L17 7.5h4V20H3zM12 10.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
    PRIVATE: 'M4 20V10l8-6 8 6v10zM10 20v-6h4v6',
    GROUP:   'M9 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16.5 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM17 14.5c2.3.3 4 2.2 4 4.5',
    FAMILY:  'M8 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3.5 20c0-2.8 2-4.8 4.5-4.8s4.5 2 4.5 4.8M16.5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13.5 20c0-1.9 1.3-3.3 3-3.3s3 1.4 3 3.3',
    COUPLE:  'M12 20.5S4.5 15.6 4.5 10.4A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7.5 1.8c0 5.2-7.5 10.1-7.5 10.1z',
    PET:     'M6.5 9.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6zM17.5 9.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6zM9.8 4.5a1.7 2.2 0 1 1 0 4.4 1.7 2.2 0 0 1 0-4.4zM14.2 4.5a1.7 2.2 0 1 1 0 4.4 1.7 2.2 0 0 1 0-4.4zM12 12.5c3 0 4.8 2 4.8 4 0 1.8-1.5 3-3.4 3h-2.8c-1.9 0-3.4-1.2-3.4-3 0-2 1.8-4 4.8-4z'
  };
  const icon = k => IC[k]
    ? `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k]}"/></svg>`
    : "";

  const name   = (g,lang)=> (lang==="zh"?g.nameZh:g.nameEn) || g.nameEn || g.nameKo || g.id;
  const region = (g,lang)=> (lang==="zh"?g.regionZh:g.regionEn) || g.regionEn || "";
  const intro  = (g,lang)=> (lang==="zh"?g.introZh:g.introEn) || g.introEn || "";
  const stayUrl= g => PREFIX + "/stay/" + encodeURIComponent(g.id);

  /* 같은 사진을 작은 크기로 —— 사진은 Cloudinary 에 w_1200 으로 올라가 있다.
     지도 핀 미리보기에 1200px 짜리를 그대로 쓰면 한 장에 수백 KB 다.
     변환 구간의 w_ 만 바꿔치기하고, 형식이 다르면 원본을 그대로 돌려준다. */
  function photoAt(url, w){
    const s = String(url||"");
    return /\/image\/upload\/[^/]*\bw_\d+/.test(s)
      ? s.replace(/(\/image\/upload\/[^/]*\b)w_\d+/, "$1w_" + w)
      : s;
  }

  /* 표본이 작은 평점은 숫자로 내보내지 않는다.
     후기 2~3건의 5.00 / 4.67 은 정보가 아니라 잡음이다.
     시트에는 실제 값을 넣어두고, 기준을 넘기면 자동으로 숫자가 나온다. */
  function hasRating(g){
    return g.rating!==null && g.rating!==undefined
        && g.reviews!==null && g.reviews!==undefined
        && g.reviews >= MIN_REVIEWS;
  }
  function ratingHTML(g,lang,t){
    if(hasRating(g))
      return `<span class="stars">${STAR}<b>${g.rating.toFixed(2)}</b> <span>${esc(t.reviews(g.reviews))}</span></span>`;
    /* 평점 대신 나가는 줄 —— 회색으로 흘리면 「없는 것」처럼 보인다.
       별과 같은 색, 같은 굵기로 두어 후기가 아직 없다는 사실을 그대로 말한다. */
    return `<span class="stars new">${esc(t.newListing)}</span>`;
  }

  /* 알약 배지는 두 개뿐 —— 신규 등록, 그리고 할인.
     「영문|繁體」 자유 문구는 설명 아래 이탤릭 한 줄로.
     FEATURED / POPULAR 는 정보가 아니라 자기 선언이라 표시하지 않는다. */
  function badgeParts(g,lang){
    const out={flag:"", incl:""};
    if(!g.badge) return out;
    const raw=g.badgeRaw||g.badge;
    const m=/^DEAL:?(\d+)?$/.exec(g.badge);
    if(m)                    out.flag = m[1] ? `${m[1]}% ${lang==="zh"?"優惠":"off"}` : (lang==="zh"?"優惠":"Deal");
    else if(BADGES[g.badge]) out.flag = BADGES[g.badge][lang];
    else if(raw.includes("|")){ const p=raw.split("|"); out.incl=((lang==="zh"?p[1]:p[0])||p[0]).trim(); }
    return out;
  }

  function availLine(g,t){
    if(g.rooms.length>1) return g.anyWhole ? t.optWhole(g.rooms.length-1) : t.optPlain(g.rooms.length);
    if(g.anyWhole)       return t.oneGroup;
    return t.sleepsUp(g.maxSleeps);
  }

  function thumbHTML(g,i,lang,cls){
    const n=name(g,lang);
    return g.photo
      ? `<img src="${esc(g.photo)}" alt="${esc(n)}" loading="lazy" decoding="async"
              style="object-position:${esc(FOCUS[g.focus]||"center")}" onerror="this.remove()">`
      : `<div class="ph" style="background:${PH[i%PH.length]}">${esc((n||"?").trim()[0])}</div>`;
  }

  /* ---------- 컬렉션 카드 ---------- */
  function cardHTML(g,i,lang){
    const t=T[lang];
    const n=name(g,lang), r=region(g,lang), p=intro(g,lang);
    const tags=g.tags.map(k=>TAGS[k]&&TAGS[k][lang]).filter(Boolean).slice(0,3);
    const bp=badgeParts(g,lang);
    const primary=g.rooms[0];
    const multi=g.rooms.length>1;

    return `<article class="card">
      <a class="thumb" href="${stayUrl(g)}" data-detail="${esc(g.id)}" aria-label="${esc(n)}"
        >${bp.flag?`<span class="flag">${esc(bp.flag)}</span>`:""}${thumbHTML(g,i,lang)}</a>
      <div class="c-top"><span class="lbl">${esc(r)}</span>${ratingHTML(g,lang,t)}</div>
      <h3><a href="${stayUrl(g)}" data-detail="${esc(g.id)}">${esc(n)}</a></h3>
      ${p?`<p>${esc(p)}</p>`:""}
      ${bp.incl?`<div class="incl" data-txt="${esc(bp.incl)}">${esc(bp.incl)}</div>`:""}
      ${tags.length?`<div class="tags">${tags.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
      <div class="c-foot">
        <div class="avail">${esc(availLine(g,t))}</div>
        <a class="btn" href="${esc(primary.link)}" target="_blank" rel="noopener"
           data-prop="${esc(g.id)}" data-name="${esc(g.nameEn||g.id)}"
           data-room="${esc((lang==="zh"?primary.nameZh:primary.nameEn)||t.whole)}">${t.cta} ${ARROW}</a>
        ${multi
          /* 객실이 여럿이면 카드 안에서 바로 펼친다 —— 방을 고르러 다른 페이지로
             넘어가게 하지 않는다. 상세 페이지는 사진과 제목으로만 간다. */
          ? `<div class="micro micro-a"><button type="button" data-toggle="${esc(g.id)}">${esc(t.microRooms(g.rooms.length))}</button></div>
             <div class="rooms" id="rooms-${esc(g.id)}">${
               g.rooms.map(rm=>{
                 const rn=(lang==="zh"?rm.nameZh:rm.nameEn) || rm.nameEn || (rm.whole?t.whole:n);
                 return `<a class="room" href="${esc(rm.link)}" target="_blank" rel="noopener"
                            data-prop="${esc(g.id)}" data-name="${esc(g.nameEn||g.id)}" data-room="${esc(rn)}">
                   <span class="room-t"><span class="room-n">${esc(rn)}</span>${rm.sleeps?`<span class="room-s">${esc(t.sleeps(rm.sleeps))}</span>`:""}</span>
                   <span class="room-go">${esc(t.book)} ${ARROW}</span></a>`;
               }).join("")}</div>`
          : `<div class="micro">${esc(t.micro)}</div>`}
      </div>
    </article>`;
  }

  /* ---------- 작은 카드 (다른 숙소) ---------- */
  function miniHTML(g,i,lang){
    const n=name(g,lang), r=region(g,lang);
    return `<a class="mini" href="${stayUrl(g)}" data-detail="${esc(g.id)}">
      <span class="thumb">${thumbHTML(g,i,lang)}</span>
      <h3>${esc(n)}</h3>
      <span class="lbl">${esc(r)}</span>
    </a>`;
  }

  /* ---------- 필터 ---------- */
  function filtersHTML(list,lang,filt){
    const t=T[lang];
    /* 키는 영문 약칭 하나로 고정하고, 칩에 찍는 글자만 언어를 따라간다 */
    const label={};
    list.forEach(g=>{ if(g.region && !label[g.region])
      label[g.region] = (g.regionTag && g.regionTag[lang]) || g.region; });
    const regions=[...new Set(list.map(g=>g.region).filter(Boolean))];
    const n={}; list.forEach(g=>g.tags.forEach(k=>{ if(TAGS[k]) n[k]=(n[k]||0)+1; }));
    const tags=Object.entries(n).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
    const chip=(label,key,val,on)=>
      `<button type="button" class="chip" data-f="${key}" data-v="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    /* 라벨을 칩 줄 안이 아니라 밖에 둔다 —— 휴대폰에서는 칩 줄이 옆으로
       스크롤되기 때문에, 안에 있으면 라벨이 같이 밀려 사라진다. */
    return `<div class="fgrp">
        <span class="lbl">${esc(t.fWhere)}</span>
        <div class="frow">
          ${chip(t.fAll,"region","all",filt.region==="all")}
          ${regions.map(r=>chip(label[r]||r,"region",r,filt.region===r)).join("")}
        </div>
      </div>
      <div class="fgrp">
        <span class="lbl">${esc(t.fWho)}</span>
        <div class="frow">
          ${chip(t.fAny,"guests","all",filt.guests==="all")}
          ${chip(t.g1,"guests","g1",filt.guests==="g1")}
          ${chip(t.g2,"guests","g2",filt.guests==="g2")}
          ${chip(t.g3,"guests","g3",filt.guests==="g3")}
          ${tags.map(k=>chip(TAGS[k][lang],"tag",k,filt.tag===k)).join("")}
        </div>
      </div>`;
  }

  function matches(g,filt){
    if(filt.region!=="all" && g.region!==filt.region) return false;
    if(filt.tag!=="all" && !g.tags.includes(filt.tag)) return false;
    if(filt.guests!=="all"){
      const m=g.maxSleeps;
      if(filt.guests==="g1" && !(m>=2&&m<=4)) return false;
      if(filt.guests==="g2" && !(m>=5&&m<=8)) return false;
      if(filt.guests==="g3" && !(m>=9))       return false;
    }
    return true;
  }

  function gridHTML(list,lang,filt){
    const t=T[lang];
    const shown=list.filter(g=>matches(g,filt));
    if(!shown.length) return `<div class="note">${t.none}</div>`;
    return shown.map((g,i)=>cardHTML(g,i,lang)).join("");
  }

  /* 평균 평점 —— 표본이 기준을 넘는 숙소만으로 후기 수 가중 평균 */
  function avgRating(list){
    const rated=list.filter(hasRating);
    if(!rated.length) return null;
    const w = rated.reduce((s,g)=>s+g.rating*g.reviews,0) / rated.reduce((s,g)=>s+g.reviews,0);
    return w.toFixed(2);
  }

  /* ---------- 숙소 상세 본문 ---------- */
  function stayHTML(g, others, lang){
    const t=T[lang];
    const n=name(g,lang), r=region(g,lang), p=intro(g,lang);
    const feats=g.tags.filter(k=>TAGS[k]).map(k=>({k, label:TAGS[k][lang]})).filter(x=>x.label);
    const bp=badgeParts(g,lang);
    const primary=g.rooms[0];
    const multi=g.rooms.length>1;

    const rooms = g.rooms.map(rm=>{
      const rn=(lang==="zh"?rm.nameZh:rm.nameEn) || rm.nameEn || (rm.whole?t.whole:n);
      return `<div class="rrow">
        <span><span class="rrow-n">${esc(rn)}</span>${rm.sleeps?`<span class="rrow-s">${esc(t.sleepsRoom(rm.sleeps))}</span>`:""}</span>
        <a class="rrow-go" href="${esc(rm.link)}" target="_blank" rel="noopener"
           data-prop="${esc(g.id)}" data-name="${esc(g.nameEn||g.id)}" data-room="${esc(rn)}">${esc(t.book)} ${ARROW}</a>
      </div>`;
    }).join("");

    const map = g.geo ? `
      <section class="band band-paper">
        <div class="wrap">
          <h2>${esc(t.mapTitle)}</h2>
          <p class="sub">${esc(r)}</p>
          <div class="two two-map">
            <div class="mapbox">
              <iframe title="${esc(n)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=${g.geo.lat},${g.geo.lng}&z=13&hl=${lang==="zh"?"zh-TW":"en"}&output=embed"></iframe>
            </div>
            <div class="map-side">
              <p class="map-note">${esc(t.mapNote)}</p>
              <a class="btn btn-o btn-auto" style="align-self:flex-start" target="_blank" rel="noopener"
                 href="https://www.google.com/maps/search/?api=1&amp;query=${g.geo.lat}%2C${g.geo.lng}">${esc(t.mapOpen)} ${ARROW}</a>
            </div>
          </div>
        </div>
      </section>` : "";

    return `
      <div class="wrap">
        <nav class="crumb"><a href="${HOME}">${BACK} ${esc(t.back)}</a></nav>
      </div>

      <header class="s-hero wrap">
        <div class="s-hero-txt">
          <div class="eyebrow"><span class="lbl">${esc(r)}</span><i></i><span class="lbl">${esc(t.place)}</span></div>
          <h1>${esc(n)}</h1>
          <div class="s-meta">
            ${ratingHTML(g,lang,t)}
            <span class="sep">·</span>
            <span class="avail">${esc(availLine(g,t))}</span>
          </div>
          ${p?`<p class="s-intro">${esc(p)}</p>`:""}
          ${bp.incl?`<div class="incl" data-txt="${esc(bp.incl)}" style="margin:0 0 24px">${esc(bp.incl)}</div>`:""}
          <div class="s-act">
            <a class="btn" href="${esc(primary.link)}" target="_blank" rel="noopener"
               data-prop="${esc(g.id)}" data-name="${esc(g.nameEn||g.id)}"
               data-room="${esc((lang==="zh"?primary.nameZh:primary.nameEn)||t.whole)}">${t.cta} ${ARROW}</a>
            <div class="micro">${esc(t.micro)}</div>
          </div>
        </div>
        <div class="s-img">${bp.flag?`<span class="flag">${esc(bp.flag)}</span>`:""}${thumbHTML(g,0,lang)}</div>
      </header>

      <section class="band band-lime">
        <div class="wrap">
          <div class="two">
            <div>
              <h2>${esc(t.featTitle)}</h2>
              ${hasRating(g)?`<p class="sub">${esc(t.ratingNote)}</p>`:`<p class="sub">&nbsp;</p>`}
              ${feats.length?`<div class="feat">${feats.map(x=>`<span>${icon(x.k)}${esc(x.label)}</span>`).join("")}</div>`
                            :`<p class="prose">${esc(p)}</p>`}
            </div>
            <div class="book">
              <h2>${esc(multi?t.roomsTitle:t.roomsOne)}</h2>
              <p class="sub">${esc(t.micro)}</p>
              <div class="rlist">${rooms}</div>
            </div>
          </div>
        </div>
      </section>

      ${map}

      ${others.length?`
      <section class="band band-lime">
        <div class="wrap">
          <h2>${esc(t.alsoTitle)}</h2>
          <p class="sub">${esc(t.alsoNote)}</p>
          <div class="also">${others.map((o,i)=>miniHTML(o,i,lang)).join("")}</div>
          <div style="margin-top:34px"><a class="btn btn-o btn-auto" href="${HOME}">${esc(t.seeAll)} ${ARROW}</a></div>
        </div>
      </section>`:""}
    `;
  }

  return {esc, fmt, name, region, intro, stayUrl, hasRating, ratingHTML,
          availLine, cardHTML, miniHTML, filtersHTML, matches, gridHTML,
          avgRating, stayHTML, shortRegion, photoAt, FOCUS};
}

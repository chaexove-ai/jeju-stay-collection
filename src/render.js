/* ============================================================
   렌더러 —— 빌드(Node)와 브라우저가 같은 소스를 쓴다.
   이 파일은 import/export 없는 평범한 스크립트여야 한다.
   build.mjs 는 소스를 그대로 페이지에 넣고,
   서버 렌더링을 위해 new Function 으로도 불러온다.
   따라서 여기서 DOM 을 건드리면 안 된다 —— 문자열만 만든다.
   ============================================================ */
function makeRender(T, TAGS, BADGES, MIN_REVIEWS){

  const esc = s => String(s??"").replace(/[&<>"]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fmt = s => esc(s).replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\r?\n/g,"<br>");

  const FOCUS = {top:"center top",bottom:"center bottom",left:"left center",right:"right center",center:"center"};
  const PH = ["#1c6b7a","#0d3b45","#2F4A43","#6E6558","#3d5058","#134f5c"];
  const shortRegion = r => (r||"").split(/[-,]/)[0].trim();

  const ARROW='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const BACK ='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  const STAR ='<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="star" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>';

  const name   = (g,lang)=> (lang==="zh"?g.nameZh:g.nameEn) || g.nameEn || g.nameKo || g.id;
  const region = (g,lang)=> (lang==="zh"?g.regionZh:g.regionEn) || g.regionEn || "";
  const intro  = (g,lang)=> (lang==="zh"?g.introZh:g.introEn) || g.introEn || "";
  const stayUrl= g => "/stay/" + encodeURIComponent(g.id);

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
    return `<span class="stars" style="color:var(--clay)">${esc(t.newListing)}</span>`;
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
      ${tags.length?`<div class="tags">${tags.map((x,j)=>`<span>${esc(x)}</span>${j<tags.length-1?"<span>·</span>":""}`).join("")}</div>`:""}
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
    const feats=g.tags.map(k=>TAGS[k]&&TAGS[k][lang]).filter(Boolean);
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
        <nav class="crumb"><a href="/">${BACK} ${esc(t.back)}</a></nav>
      </div>

      <header class="s-hero wrap">
        <div class="s-hero-txt">
          <div class="eyebrow"><span class="lbl">${esc(r)}</span><i></i><span class="lbl">${esc(t.place)}</span></div>
          <h1>${esc(n)}</h1>
          <div class="s-meta">
            ${ratingHTML(g,lang,t)}
            <span style="color:var(--hairline-2)">·</span>
            <span style="font-family:var(--serif); font-style:italic; font-size:16px; color:var(--clay)">${esc(availLine(g,t))}</span>
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
              ${feats.length?`<div class="feat">${feats.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`
                            :`<p class="prose">${esc(p)}</p>`}
            </div>
            <div>
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
          <div style="margin-top:34px"><a class="btn btn-o btn-auto" href="/">${esc(t.seeAll)} ${ARROW}</a></div>
        </div>
      </section>`:""}
    `;
  }

  return {esc, fmt, name, region, intro, stayUrl, hasRating, ratingHTML,
          availLine, cardHTML, miniHTML, filtersHTML, matches, gridHTML,
          avgRating, stayHTML, shortRegion, photoAt, FOCUS};
}

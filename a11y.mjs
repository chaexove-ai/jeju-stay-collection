/* 대비와 손가락 자리 —— 실제로 화면에 그려진 값으로 잰다.
   색은 계산된 색과 실제 뒤 배경(투명하면 위로 거슬러 올라가서)을 쓴다. */
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const DIST = path.resolve("dist");
const MIME = {".html":"text/html;charset=utf-8",".png":"image/png",".svg":"image/svg+xml",
              ".ico":"image/x-icon",".json":"application/json",".xml":"application/xml",".txt":"text/plain",
              ".webmanifest":"application/manifest+json"};
const srv = http.createServer((q,r)=>{
  let f = path.join(DIST, decodeURIComponent(q.url.split("?")[0]));
  if(!path.extname(f)) f = path.join(f,"index.html");
  if(!fs.existsSync(f)){ r.writeHead(404); return r.end(); }
  r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});
  r.end(fs.readFileSync(f));
});
await new Promise(r=>srv.listen(0,r));
const B = "http://127.0.0.1:"+srv.address().port;

const PROBE = `(() => {
  const lum = c => { const [r,g,b]=c.map(v=>{v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4);});
                     return .2126*r+.7152*g+.0722*b; };
  const rgb = s => (s.match(/[\\d.]+/g)||[0,0,0]).slice(0,3).map(Number);
  const alpha = s => { const m = s.match(/[\\d.]+/g); return m && m.length>3 ? +m[3] : 1; };
  const bgOf = el => {
    let e = el;
    while(e){ const b = getComputedStyle(e).backgroundColor;
      if(alpha(b) > .95) return rgb(b);
      e = e.parentElement; }
    return [251,249,245];
  };
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1];
                           return (hi+.05)/(lo+.05); };
  const out = [];
  const seen = new Set();
  document.querySelectorAll("body *").forEach(el=>{
    const txt = [...el.childNodes].filter(n=>n.nodeType===3 && n.textContent.trim()).length;
    if(!txt) return;
    const cs = getComputedStyle(el);
    if(cs.visibility==="hidden" || cs.display==="none" || +cs.opacity===0) return;
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const big = size >= 24 || (size >= 18.66 && weight >= 700);
    const r = ratio(rgb(cs.color), bgOf(el));
    const key = (el.className||el.tagName) + "|" + Math.round(size) + "|" + cs.color;
    if(seen.has(key)) return; seen.add(key);
    if(r < (big ? 3 : 4.5))
      out.push({ sel: (typeof el.className==="string" && el.className ? "."+el.className.trim().split(/\\s+/).join(".") : el.tagName),
                 size: Math.round(size*10)/10, ratio: Math.round(r*100)/100,
                 need: big ? 3 : 4.5, text: el.textContent.trim().slice(0,26) });
  });
  /* 손가락 자리 —— 44×44 가 기준 */
  const small = [];
  document.querySelectorAll("a,button,[role=button]").forEach(el=>{
    const r = el.getBoundingClientRect();
    if(!r.width || !r.height) return;
    if(getComputedStyle(el).visibility==="hidden") return;
    if(r.width < 40 || r.height < 40)
      small.push({ sel: (typeof el.className==="string" && el.className ? "."+el.className.trim().split(/\\s+/)[0] : el.tagName),
                   w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim().slice(0,20) });
  });
  return { out, small };
})()`;

const br = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
async function run(url, w, h, touch, label){
  const ctx = await br.newContext(touch
    ? {viewport:{width:w,height:h}, isMobile:true, hasTouch:true, deviceScaleFactor:2}
    : {viewport:{width:w,height:h}});
  await ctx.route("**/*", r=>{ const u=r.request().url();
    if(u.startsWith(B)) return r.continue();
    if(/\.(png|jpe?g|webp)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:"image/gif",
      body:Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==","base64")});
    return r.fulfill({status:200,contentType:"text/plain",body:""}); });
  const p = await ctx.newPage();
  await p.goto(B+url, {waitUntil:"networkidle"});
  if(touch){ await p.click('.vtabs button[data-view="map"]').catch(()=>{}); await p.waitForTimeout(300); }
  const r = await p.evaluate(PROBE);
  console.log(`\n[${label}]`);
  if(!r.out.length) console.log("  · 대비 기준 미달 없음");
  r.out.forEach(x=>console.log(`  ! 대비 ${x.ratio} (${x.need} 필요) ${x.sel} ${x.size}px — "${x.text}"`));
  const uniq = [...new Map(r.small.map(s=>[s.sel+s.w+s.h, s])).values()];
  if(touch){
    if(!uniq.length) console.log("  · 40px 미만 누를 것 없음");
    uniq.forEach(x=>console.log(`  ! 손가락 자리 ${x.w}×${x.h} ${x.sel} — "${x.text}"`));
  }
  await ctx.close();
}
await run("/", 1440, 1000, false, "데스크톱 목록");
await run("/stay/andostay", 1440, 1000, false, "데스크톱 상세");
await run("/", 390, 844, true, "모바일 목록 + 지도");
await run("/zh", 390, 844, true, "모바일 繁體");
await br.close(); srv.close();

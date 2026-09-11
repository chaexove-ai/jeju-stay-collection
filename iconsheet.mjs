import { chromium } from "playwright";
import fs from "node:fs";
const src = fs.readFileSync("src/render.js","utf8");
const block = src.slice(src.indexOf("const IC = {"), src.indexOf("};", src.indexOf("const IC = {"))+2);
const IC = new Function(block + "; return IC;")();
const TAGS = (await import("./src/i18n.mjs")).TAGS;
const cells = Object.entries(IC).map(([k,d])=>`<div class="c">
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2F4A43" stroke-width="1.35"
       stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>
  <b>${(TAGS[k]&&TAGS[k].en)||k}</b><i>${k}</i></div>`).join("");
const html = `<style>body{margin:0;background:#FBF9F5;font:13px system-ui;padding:26px}
.g{display:grid;grid-template-columns:repeat(7,1fr);gap:22px}
.c{display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center}
b{font-weight:500;color:#191817}i{font-style:normal;color:#8B857A;font-size:11px}</style>
<div class="g">${cells}</div>`;
const br=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const p=await br.newPage({viewport:{width:1240,height:760},deviceScaleFactor:2});
await p.setContent(html); await p.waitForTimeout(200);
await p.screenshot({path:"icons.png", fullPage:true});
await br.close(); console.log(Object.keys(IC).length);

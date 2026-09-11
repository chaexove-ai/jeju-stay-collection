/* ============================================================
   공유 카드(og:image) 만들기 —— 1200×630 PNG

   카카오톡·아이메시지·페이스북이 집어가는 대표 이미지는 한 장짜리
   정지 이미지다. 특정 숙소 사진 한 장을 쓰면 그 숙소만 공짜 노출을
   가져가므로, 컬렉션 전체를 보여주는 그림이어야 한다.

   실행:  node ogcard.mjs map      →  og-map.png    섬 + 숙소 자리 15개
          node ogcard.mjs grid 5   →  og-grid.png   색 격자 (팔레트 5 가 현재 것)
          node ogcard.mjs type     →  og-type.png   글자만

   결과는 public/og.png 로 복사해 커밋한다. 빌드 때 만들지 않는 이유는
   Vercel 빌드에 크로미움을 얹지 않기 위해서다 —— 숙소가 바뀌어도 이 그림은
   틀리지 않으므로(사진도 숫자도 없다) 다시 만들 일이 거의 없다.

   폰트는 @fontsource 의 로컬 파일을 data URI 로 박는다
   (이 컨테이너에서 구글 폰트로 나가지 못하므로). 이 스크립트를 돌릴 때만
   필요하므로 package.json 에 넣지 않는다:
     npm i --no-save @fontsource/source-serif-4 @fontsource/jost
   ============================================================ */
import { chromium } from "playwright";
import fs from "node:fs";
import { JEJU } from "./src/jeju.mjs";
import { parseCSV, buildStays } from "./src/data.mjs";

const VARIANT = process.argv[2] || "map";
const SRC     = process.argv[4] || "fixture-geo.csv";   /* 색 격자는 쓰지 않는다 */

/* ---------- 숙소 좌표 ---------- */
const my = lat => { const s = Math.sin(lat * Math.PI / 180);
                    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
const project = (lat, lng) => [
  (((lng + 180) / 360 - JEJU.x0) / (JEJU.x1 - JEJU.x0)) * 100,
  ((my(lat) - JEJU.y0) / (JEJU.y1 - JEJU.y0)) * 100
];

const { list } = buildStays(parseCSV(fs.readFileSync(SRC, "utf8")));
const pins = list.filter(g => g.geo).map(g => {
  const [x, y] = project(g.geo.lat, g.geo.lng);
  return { x, y, id: g.id };
});

/* 겹치는 점 벌리기 —— 같은 마을에 두 곳이 있으면 한 점으로 보인다 */
const AR = JEJU.h / JEJU.w, SEP = 1.6;
for (let pass = 0; pass < 60; pass++) {
  let moved = false;
  for (let i = 0; i < pins.length; i++)
    for (let j = i + 1; j < pins.length; j++) {
      const a = pins[i], b = pins[j];
      const dx = b.x - a.x, dy = (b.y - a.y) * AR;
      const d = Math.hypot(dx, dy);
      if (d < SEP && d > 0) {
        const k = (SEP - d) / d / 2;
        a.x -= dx * k;      b.x += dx * k;
        a.y -= dy * k / AR; b.y += dy * k / AR;
        moved = true;
      }
    }
  if (!moved) break;
}

/* ---------- 폰트 ---------- */
const font = f => "data:font/woff2;base64," +
  fs.readFileSync(`node_modules/@fontsource/${f}`).toString("base64");
const SERIF   = font("source-serif-4/files/source-serif-4-latin-400-normal.woff2");
const SERIF_I = font("source-serif-4/files/source-serif-4-latin-400-italic.woff2");
const JOST    = font("jost/files/jost-latin-400-normal.woff2");
const JOST_5  = font("jost/files/jost-latin-500-normal.woff2");

const PINE = "#2F4A43", PAPER = "#FBF9F5", TANGERINE = "#E8820A", SUB = "#BCC9C4";

const MARK = (c, w = 62) => `<svg width="${w}" height="${w * 28 / 40}" viewBox="0 0 40 28"
  fill="none" stroke="${c}" stroke-width="1.25" stroke-linecap="round">
  <path d="M3 26 C 9 4, 31 4, 37 26"/><path d="M10 26 C 14 12, 26 12, 30 26"/>
  <path d="M16 26 C 18 19, 22 19, 24 26"/></svg>`;

const WORDMARK = (size, gap) => `<div class="bt" style="font-size:${size}px;gap:${gap}px">
  <b>Jeju Stay</b><span>Collection</span></div>`;

const FONTS = `
@font-face{font-family:S;src:url(${SERIF}) format("woff2");font-weight:400}
@font-face{font-family:S;src:url(${SERIF_I}) format("woff2");font-style:italic}
@font-face{font-family:J;src:url(${JOST}) format("woff2");font-weight:400}
@font-face{font-family:J;src:url(${JOST_5}) format("woff2");font-weight:500}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;font-family:J,sans-serif}
.bt{display:flex;flex-direction:column;letter-spacing:.26em;text-transform:uppercase}
.bt b{font-weight:500}
.bt span{color:${SUB}}`;

/* 색 격자용 팔레트 —— 15칸.
   가운데 판이 2행 2~4열을 가리므로, 그 자리에는 눈에 덜 띄는 색을 둔다.
   ①은 모래에서 세이지까지만, ②는 거기에 감귤 한 칸, ③은 파인까지 끌고 간다. */
const PALETTES = {
  1: ["#EFE9DC","#E3DED1","#D6D8CC","#C6D0C8","#B4C4BC",
      "#E7E2D6","#D9D3C5","#CBD3CB","#BAC8C0","#A2B7AF",
      "#DCD5C6","#CFC8B8","#BDC7BE","#A8BDB6","#8FAAA2"],
  2: ["#EFE9DC","#E3DED1","#D6D8CC","#C6D0C8","#B4C4BC",
      "#E7E2D6","#D9D3C5","#CBD3CB","#BAC8C0","#E8820A",
      "#DCD5C6","#CFC8B8","#BDC7BE","#A8BDB6","#8FAAA2"],
  3: ["#EFE9DC","#D9D3C5","#B4C4BC","#8FAAA2","#5C7A72",
      "#E3DED1","#C4BEB2","#A8BDB6","#7E9A92","#3E5B53",
      "#CFC8B8","#CBD3CB","#A2B7AF","#4E6B63","#2F4A43"],
  /* 5 —— 실제로 고른 색. 왼쪽 위 회보라에서 오른쪽 아래 연한 세이지까지,
        어느 칸도 종이색보다 진하지 않다. 카톡 흰 배경에서 카드 테두리가
        거의 안 보이는 대신, 가운데 파인 판이 전부를 잡아 준다. */
  5: ["#B9B3AC","#C8C2B7","#D5D0C3","#E2DED0","#E8E7E3",
      "#BCBCA9","#C9CBB4","#D4D8C0","#DADCD6","#E7E9E2",
      "#B5C0A5","#C0CEB1","#CBD0C8","#D7DED4","#E3EAE1"],
  /* 4 —— 줄지어 옅어지는 대신 흩어 놓는다. 열다섯 곳이 서로 다른
        동네에 있다는 느낌이 가지런한 그러데이션보다 잘 산다.
        감귤은 모서리 한 칸 —— 가운데 판 옆에 두면 판을 이긴다. */
  4: ["#E3DED1","#A8BDB6","#EFE9DC","#7E9A92","#E8820A",
      "#C6D0C8","#D9D3C5","#CBD3CB","#B4C4BC","#CFC8B8",
      "#8FAAA2","#EFE9DC","#A2B7AF","#3E5B53","#C4BEB2"]
};
const PALETTE = PALETTES[process.argv[3] || 5] || PALETTES[5];

const DOTS = pins.map(p =>
  `<circle cx="${p.x / 100 * JEJU.w}" cy="${p.y / 100 * JEJU.h}" r="9"
     fill="${TANGERINE}" stroke="${PINE}" stroke-width="3.4"/>`).join("");

/* ---------- 시안 ---------- */
const VIEWS = {

/* ① 섬 + 숙소 자리 —— 사이트의 지도를 그대로 한 장에 담는다.
      어느 숙소도 대표가 되지 않고, 「제주 전역에 흩어진 곳들」이 보인다. */
map: `<style>${FONTS}
body{background:${PINE};color:${PAPER}}
.isle{position:absolute;left:392px;top:52px;width:796px}
.pad{position:absolute;inset:0;padding:70px 78px;display:flex;flex-direction:column;align-items:flex-start}
h1{font-family:S,serif;font-weight:400;font-size:54px;line-height:1.14;margin-top:34px;max-width:9ch}
.lede{font-family:S,serif;font-style:italic;font-size:23px;color:${SUB};
      margin-top:18px;max-width:25ch;line-height:1.5}
.url{margin-top:auto;padding-top:24px;font-size:16px;letter-spacing:.16em;text-transform:uppercase;color:${SUB}}
</style>
<svg class="isle" viewBox="0 0 ${JEJU.w} ${JEJU.h}" fill="none">
  <path d="${JEJU.d}" fill="#3E5B53" stroke="${PAPER}" stroke-opacity=".45"
        stroke-width="2" stroke-linejoin="round"/>${DOTS}
</svg>
<div class="pad">
  ${MARK(PAPER)}<div style="margin-top:14px">${WORDMARK(19, 5)}</div>
  <h1>Handpicked stays on Jeju</h1>
  <div class="lede">Places we visit, look after and would send a friend to.</div>
  <div class="url">jejustaycollection.com</div>
</div>`,

/* ② 색 격자 —— 숙소 수만큼의 칸을 색으로만 채운다.
      사진을 쓰지 않으므로 어느 집도 대표가 되지 않고, 숙소가 바뀌어도
      그림이 틀리지 않는다. 색은 사이트 팔레트 밖으로 나가지 않는다 ——
      모래(서쪽 밭)에서 소나무(한라산)로 건너가는 한 줄기. */
grid: `<style>${FONTS}
body{background:${PAPER}}
.g{position:absolute;inset:0;display:grid;grid-template-columns:repeat(5,1fr);
   grid-template-rows:repeat(3,1fr);gap:3px}
.plate{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  background:${PINE};color:${PAPER};padding:44px 70px 40px;
  display:flex;flex-direction:column;align-items:center;text-align:center}
.plate .bt{align-items:center;margin-top:14px}
.plate .lede{font-family:S,serif;font-style:italic;font-size:21px;color:${SUB};margin-top:20px}
</style>
<div class="g">${PALETTE.map(c => `<div style="background:${c}"></div>`).join("")}</div>
<div class="plate">${MARK(PAPER, 56)}${WORDMARK(20, 6)}
  <div class="lede">Handpicked stays on Jeju Island</div></div>`,

/* ③ 글자만 —— 가장 안전하지만 가장 심심하다 */
type: `<style>${FONTS}
body{background:${PINE};color:${PAPER}}
.isle{position:absolute;right:-6px;top:126px;width:566px}
.pad{position:absolute;inset:0;padding:74px 80px;display:flex;flex-direction:column}
h1{font-family:S,serif;font-weight:400;font-size:62px;line-height:1.12;margin-top:auto;max-width:13ch}
.lede{font-family:S,serif;font-style:italic;font-size:25px;color:${SUB};margin-top:22px}
.foot{margin-top:38px;padding-top:24px;border-top:1px solid rgba(251,249,245,.22);
  display:flex;gap:34px;font-size:16px;letter-spacing:.16em;text-transform:uppercase;color:${SUB}}
</style>
<svg class="isle" viewBox="0 0 ${JEJU.w} ${JEJU.h}" fill="none">
  <path d="${JEJU.d}" fill="#5C7A72" fill-opacity=".38" stroke="${PAPER}"
        stroke-width="2.2" stroke-opacity=".55" stroke-linejoin="round"/></svg>
<div class="pad">
  <div style="display:flex;align-items:center;gap:20px">${MARK(PAPER)}${WORDMARK(19, 5)}</div>
  <h1>Handpicked villas &amp; stays on Jeju Island</h1>
  <div class="lede">Places we visit, look after and would send a friend to.</div>
  <div class="foot"><span>Private pools</span><span>Ocean views</span><span>Stone houses</span></div>
</div>`
};

const html = `<!doctype html><meta charset="utf-8">${VIEWS[VARIANT]}`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(200);
await p.screenshot({ path: `og-${VARIANT}.png` });
await b.close();
console.log(`og-${VARIANT}.png  (핀 ${pins.length}개)`);

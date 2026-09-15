/* ============================================================
   개인정보처리방침 · 법적 고지

   화면에 나가는 언어는 영문·繁體 두 가지지만, 개인정보보호법 제30조가
   요구하는 것은 「수립·공개」이지 언어가 아니다. 국내 민원이나 조사가
   들어왔을 때 근거가 되는 것은 국문본이므로, 두 언어 페이지 모두
   맨 아래에 국문 원문을 함께 싣는다. 번역본과 국문본이 어긋나면
   국문본이 기준이다.

   내용을 고칠 때는 세 언어를 같이 고칠 것 —— 한쪽만 고치면
   어긋난 채로 배포되고, 어긋난 처리방침은 없는 것보다 나쁘다.
   ============================================================ */

/* 처리방침 시행일. 내용을 고치면 이 날짜도 함께 올린다. */
export const PRIVACY_DATE = "2026-09-15";

/* 개인정보 보호책임자 —— 법 제31조. 성명과 연락처는 반드시 들어간다. */
export const DPO = { name: "Seokyoung Lim (임석영)", email: "hello@jejustaycollection.com" };

/* 사업자 정보 —— 「도틀왓앤코」 등록이 끝나면 regNo 에 번호를 넣는다.
   번호가 비어 있는 동안에는 상호·대표자 줄을 아예 내보내지 않는다.
   미등록 상태에서 상호를 내거는 쪽이 안 적는 쪽보다 위험하기 때문. */
export const BIZ = {
  nameEn : "Dotlwat & Co.",
  nameKo : "도틀왓앤코",
  owner  : "Seokyoung Lim (임석영)",
  regNo  : "",                                  /* ← 등록 후 여기만 채우면 푸터·/privacy 양쪽에 함께 나간다 */
  address: "Jeju Island, Republic of Korea"
};

const GA_OPTOUT = "https://tools.google.com/dlpage/gaoptout";

/* 각 절은 { h, p:[...], ul:[...] } —— p 는 문단, ul 은 목록. */
export const PRIVACY = {
  en: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    lede: `Jeju Stay Collection introduces independent stays on Jeju Island and links to their pages on Airbnb. We take no bookings and no payments, so the information this site sees is limited — but it is not nothing, and this page says exactly what it is.`,
    effective: d => `In effect from ${d}. Korean law governs this policy; the Korean text at the foot of this page is the original.`,
    sections: [
      { h:"1. Who runs this site",
        p:[`Jeju Stay Collection is run from Jeju Island, Republic of Korea. Questions about this policy, or about your own information, go to <a href="mailto:${DPO.email}">${DPO.email}</a>.`] },

      { h:"2. What is collected",
        p:[`Two things, and nothing else.`],
        ul:[
          `<b>Site analytics.</b> Google Analytics 4 sets cookies in your browser and records which pages you open, which links you press — including the press that sends you to a stay's Airbnb page — your approximate location worked out from your IP address, your device and browser, and the site you arrived from. Google Analytics does not keep your full IP address.`,
          `<b>Email.</b> If you write to us, we receive your email address and whatever you choose to put in the message.`
        ],
        after:[`Because bookings happen on Airbnb and not here, this site never receives your name, phone number, passport details or card details.`] },

      { h:"3. Why it is collected",
        ul:[
          `To see which stays visitors are interested in, and to measure whether our advertising is reaching the right people.`,
          `To answer the message you sent us.`
        ] },

      { h:"4. How long it is kept",
        ul:[
          `Analytics data: 14 months, after which Google deletes it automatically.`,
          `Email: up to one year after our last reply, then deleted.`
        ] },

      { h:"5. Who else handles it, and where",
        p:[`We do not sell your information and we do not hand it to advertisers. Three services process it on our behalf, and all three are outside Korea — using this site means your information is transferred abroad to them.`],
        ul:[
          `<b>Google LLC</b> (United States) — Google Analytics. Cookies, page and event records, device and approximate location. Kept 14 months.`,
          `<b>Vercel Inc.</b> (United States) — hosting. Server logs holding IP address, browser and time of request, kept briefly for security and reliability.`,
          `<b>Zoho Corporation</b> (United States / India) — email. Messages sent to our address, kept as described above.`
        ] },

      { h:"6. Cookies, and how to refuse them",
        p:[`Analytics cookies can be refused. You can block or delete them in your browser's settings, or install Google's opt-out add-on at <a href="${GA_OPTOUT}" rel="nofollow noopener" target="_blank">${GA_OPTOUT}</a>. Refusing them does not stop you using any part of this site.`] },

      { h:"7. Your rights",
        p:[`You may ask to see what we hold about you, to have it corrected or deleted, or to have its use suspended. Write to <a href="mailto:${DPO.email}">${DPO.email}</a> and we will answer within 10 days, as Korean law requires.`] },

      { h:"8. Who is responsible",
        p:[`Data protection officer: ${DPO.name}, <a href="mailto:${DPO.email}">${DPO.email}</a>.`] },

      { h:"9. If you are not satisfied",
        p:[`You can take a complaint to the Korean authorities directly, without going through us.`],
        ul:[
          `Personal Information Dispute Mediation Committee — 1833-6972 — kopico.go.kr`,
          `Privacy Infringement Report Centre — 118 — privacy.kisa.or.kr`,
          `Supreme Prosecutors' Office cybercrime — 1301 — spo.go.kr`,
          `National Police Agency cybercrime — 182 — ecrm.police.go.kr`
        ] },

      { h:"10. Changes to this policy",
        p:[`If this policy changes, the new version is posted on this page with a new date. Where a change matters to you, we will say what changed rather than quietly replacing the text.`] }
    ]
  },

  zh: {
    eyebrow: "隱私權",
    title: "隱私權政策",
    lede: `Jeju Stay Collection 僅介紹濟州島上的獨立住宿，並連結至各住宿的 Airbnb 頁面。本站不受理訂房，也不收取任何款項，因此本站接觸到的資料十分有限 —— 但並非沒有，本頁說明的正是這些資料。`,
    effective: d => `自 ${d} 起施行。本政策適用大韓民國法律；頁面下方的韓文版本為正本。`,
    sections: [
      { h:"1. 本站的營運者",
        p:[`Jeju Stay Collection 由位於大韓民國濟州島的團隊營運。關於本政策或您個人資料的任何問題，請寄至 <a href="mailto:${DPO.email}">${DPO.email}</a>。`] },

      { h:"2. 蒐集的資料",
        p:[`僅有以下兩類，此外沒有其他。`],
        ul:[
          `<b>網站分析。</b>Google Analytics 4 會在您的瀏覽器中設置 Cookie，並記錄您開啟的頁面、點擊的連結（包含前往住宿 Airbnb 頁面的點擊）、依 IP 位址推估的大致所在地、您的裝置與瀏覽器，以及您從哪個網站前來。Google Analytics 不會保存您完整的 IP 位址。`,
          `<b>電子郵件。</b>若您來信，我們會收到您的電子郵件地址，以及您在信中所寫的內容。`
        ],
        after:[`由於訂房在 Airbnb 完成而非本站，本站不會取得您的姓名、電話號碼、護照資料或信用卡資料。`] },

      { h:"3. 蒐集目的",
        ul:[
          `了解訪客對哪些住宿感興趣，並衡量廣告是否觸及了合適的對象。`,
          `回覆您寄來的訊息。`
        ] },

      { h:"4. 保存期間",
        ul:[
          `分析資料：14 個月，期滿後由 Google 自動刪除。`,
          `電子郵件：自我方最後一次回覆起最長保存一年，之後刪除。`
        ] },

      { h:"5. 委外處理與跨境傳輸",
        p:[`我們不販售您的資料，也不會提供給廣告主。以下三項服務代為處理資料，且三者皆位於韓國境外 —— 使用本站即表示您的資料會傳輸至境外。`],
        ul:[
          `<b>Google LLC</b>（美國）—— Google Analytics。Cookie、頁面與事件記錄、裝置與大致所在地。保存 14 個月。`,
          `<b>Vercel Inc.</b>（美國）—— 網站代管。伺服器日誌含 IP 位址、瀏覽器與請求時間，基於安全與穩定考量短期保存。`,
          `<b>Zoho Corporation</b>（美國／印度）—— 電子郵件。寄至本站信箱的訊息，保存期間如上所述。`
        ] },

      { h:"6. Cookie 與拒絕方式",
        p:[`分析用 Cookie 可以拒絕。您可以在瀏覽器設定中封鎖或刪除，或安裝 Google 的停用外掛：<a href="${GA_OPTOUT}" rel="nofollow noopener" target="_blank">${GA_OPTOUT}</a>。拒絕 Cookie 不會影響您使用本站的任何功能。`] },

      { h:"7. 您的權利",
        p:[`您可要求查閱我方所保有關於您的資料、要求更正或刪除，或要求停止處理。請寄信至 <a href="mailto:${DPO.email}">${DPO.email}</a>，我們將依韓國法律規定於 10 日內回覆。`] },

      { h:"8. 個人資料保護負責人",
        p:[`個人資料保護負責人：${DPO.name}，<a href="mailto:${DPO.email}">${DPO.email}</a>。`] },

      { h:"9. 申訴管道",
        p:[`您也可以不透過本站，直接向韓國主管機關提出申訴。`],
        ul:[
          `個人資料糾紛調解委員會 —— 1833-6972 —— kopico.go.kr`,
          `個人資料侵害申報中心 —— 118 —— privacy.kisa.or.kr`,
          `大檢察廳網路犯罪 —— 1301 —— spo.go.kr`,
          `警察廳網路犯罪 —— 182 —— ecrm.police.go.kr`
        ] },

      { h:"10. 本政策的變更",
        p:[`本政策若有變更，將於本頁公告新版本並標註新的施行日期。若變更對您具有實質影響，我們會說明變更內容，而非悄悄替換文字。`] }
    ]
  }
};

/* ---------- 국문 원문 ----------
   두 언어 페이지 모두 이 블록을 맨 아래에 함께 싣는다. */
export const PRIVACY_KO = {
  title: "개인정보처리방침 (국문 원문)",
  lede: `Jeju Stay Collection(이하 「본 사이트」)은 제주도의 독립 숙소를 소개하고 각 숙소의 에어비앤비 페이지로 연결합니다. 본 사이트는 예약을 받지 않고 결제를 처리하지 않으므로 수집하는 정보가 제한적이나, 아래와 같이 개인정보를 처리하고 있어 개인정보 보호법 제30조에 따라 처리방침을 수립·공개합니다.`,
  effective: d => `시행일 ${d}. 본 방침의 영문·번체중문 번역본과 내용이 다를 경우 이 국문본을 기준으로 합니다.`,
  notParty: `본 사이트는 제주 숙소를 소개하고 각 숙소의 예약 페이지로 연결합니다. 예약 계약은 게스트와 각 숙소(에어비앤비) 사이에 체결되며, 본 사이트는 예약·결제·환불의 당사자가 아닙니다.`,
  sections: [
    { h:"제1조 (운영 주체 및 연락처)",
      p:[`본 사이트는 대한민국 제주특별자치도에서 운영됩니다. 본 방침 또는 본인의 개인정보에 관한 문의는 <a href="mailto:${DPO.email}">${DPO.email}</a> 으로 보내주시기 바랍니다.`] },

    { h:"제2조 (처리하는 개인정보의 항목)",
      p:[`본 사이트가 처리하는 개인정보는 다음 두 가지에 한합니다.`],
      ul:[
        `<b>웹 분석 정보(자동 수집)</b> — Google Analytics 4를 통해 쿠키가 설치되며, 방문한 페이지, 클릭한 링크(각 숙소의 에어비앤비 페이지로 이동한 클릭 포함), IP 주소로 추정한 대략적 위치, 기기·브라우저 정보, 유입 경로가 기록됩니다. Google Analytics는 완전한 IP 주소를 저장하지 않습니다.`,
        `<b>문의 정보</b> — 이용자가 문의 메일을 보낸 경우 이메일 주소 및 메일 본문에 기재한 내용.`
      ],
      after:[`예약과 결제는 에어비앤비에서 이루어지므로, 본 사이트는 이용자의 성명·전화번호·여권정보·결제수단 정보를 일절 수집하지 않습니다.`] },

    { h:"제3조 (개인정보의 처리 목적)",
      ul:[
        `방문자의 관심 숙소 파악 및 광고 효과 측정`,
        `문의에 대한 응답`
      ] },

    { h:"제4조 (개인정보의 처리 및 보유 기간)",
      ul:[
        `웹 분석 정보: 수집일로부터 14개월. 기간 경과 후 Google에 의해 자동 삭제됩니다.`,
        `문의 정보: 최종 회신일로부터 1년 이내. 기간 경과 후 지체 없이 파기합니다.`
      ] },

    { h:"제5조 (개인정보 처리의 위탁 및 국외 이전)",
      p:[`본 사이트는 개인정보를 판매하지 않으며 광고주에게 제공하지 않습니다. 다만 아래 사업자에게 처리를 위탁하고 있으며, 모두 국외에 소재하므로 개인정보 보호법 제28조의8에 따라 다음과 같이 알려드립니다. 이용자는 본 사이트를 이용함으로써 아래 국외 이전에 관하여 고지받은 것으로 봅니다.`],
      ul:[
        `<b>Google LLC</b> — 미국 — 웹 분석(Google Analytics) — 쿠키, 페이지·이벤트 기록, 기기 및 대략적 위치 — 보유 14개월 — 이전 방법: 정보통신망을 통한 전송`,
        `<b>Vercel Inc.</b> — 미국 — 웹사이트 호스팅 — 서버 접속 기록(IP 주소, 브라우저, 요청 시각) — 보안 및 안정성 목적의 단기 보관 — 이전 방법: 정보통신망을 통한 전송`,
        `<b>Zoho Corporation</b> — 미국/인도 — 이메일 수·발신 — 문의 메일의 발신 주소 및 본문 — 보유 기간은 제4조와 같음 — 이전 방법: 정보통신망을 통한 전송`
      ],
      after:[`이용자는 국외 이전을 거부할 수 있습니다. 다만 거부하는 경우 본 사이트 이용이 제한될 수 있으며, 웹 분석에 한해서는 제6조의 방법으로 거부할 수 있습니다.`] },

    { h:"제6조 (자동 수집 장치의 설치·운영 및 거부에 관한 사항)",
      p:[`본 사이트는 이용 분석을 위하여 쿠키를 사용합니다. 이용자는 웹 브라우저의 설정을 통해 쿠키 저장을 거부하거나 저장된 쿠키를 삭제할 수 있고, Google이 제공하는 차단 부가기능(<a href="${GA_OPTOUT}" rel="nofollow noopener" target="_blank">${GA_OPTOUT}</a>)을 설치할 수 있습니다. 쿠키를 거부하더라도 본 사이트의 이용에는 아무런 제한이 없습니다.`] },

    { h:"제7조 (정보주체의 권리·의무 및 행사 방법)",
      p:[`이용자는 언제든지 자신의 개인정보에 대한 열람, 정정·삭제, 처리정지를 요구할 수 있습니다. <a href="mailto:${DPO.email}">${DPO.email}</a> 으로 요청하시면 개인정보 보호법이 정한 바에 따라 10일 이내에 조치하고 그 결과를 알려드립니다. 이용자는 법정대리인이나 위임을 받은 자를 통하여 권리를 행사할 수도 있습니다.`] },

    { h:"제8조 (개인정보 보호책임자)",
      p:[`개인정보 보호책임자: ${DPO.name} / 연락처: <a href="mailto:${DPO.email}">${DPO.email}</a>`,
         `이용자는 본 사이트를 이용하면서 발생한 모든 개인정보 보호 관련 문의를 개인정보 보호책임자에게 할 수 있으며, 본 사이트는 지체 없이 답변하고 처리합니다.`] },

    { h:"제9조 (개인정보의 안전성 확보 조치)",
      p:[`본 사이트는 별도의 회원 데이터베이스를 운영하지 않으며 정적 페이지로만 제공됩니다. 모든 통신은 HTTPS로 암호화되고, 문의 메일 계정은 접근 권한을 운영자 1인으로 제한하고 있습니다.`] },

    { h:"제10조 (권익침해 구제 방법)",
      p:[`이용자는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담을 신청할 수 있습니다. 본 사이트를 거치지 않고 직접 신청할 수 있습니다.`],
      ul:[
        `개인정보분쟁조정위원회 — 1833-6972 — kopico.go.kr`,
        `개인정보침해신고센터 — 118 — privacy.kisa.or.kr`,
        `대검찰청 사이버수사과 — 1301 — spo.go.kr`,
        `경찰청 사이버수사국 — 182 — ecrm.police.go.kr`
      ],
      after:[`또한 개인정보 보호법 제35조(열람), 제36조(정정·삭제), 제37조(처리정지)에 따른 요구에 대하여 공공기관의 장이 행한 처분 또는 부작위로 권리·이익을 침해받은 경우에는 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다.`] },

    { h:"제11조 (처리방침의 변경)",
      p:[`본 방침이 변경되는 경우 변경된 내용과 시행일을 본 페이지에 게시합니다. 이용자에게 중요한 영향을 미치는 변경은 무엇이 달라졌는지를 함께 밝힙니다.`] }
  ]
};

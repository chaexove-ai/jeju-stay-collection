/* ============================================================
   문구 · 태그 · 배지 사전

   숙소 수가 들어가는 문구는 글자로 박지 말 것 —— 열여섯 번째 집이
   들어오는 날 사이트가 조용히 거짓말을 한다. 값이 필요하면 함수로 두면
   빌드가 실제 숙소 수를 넣어 준다 (wallEyebrow 참고).
   이 파일의 객체는 빌드 시 페이지 안으로 직렬화되어 들어간다.
   함수를 값으로 써도 되지만 클로저를 잡으면 안 된다 —
   serialize()가 Function.toString()으로 옮기기 때문.
   ============================================================ */

export const T = {
  en:{
    place:"Jeju Island",
    h1:'Not every stay on Jeju.<br>Only the ones we would<br>send <em>a friend</em> to.',
    lede:"Independent houses across the island — visited, photographed and looked after by a small team that lives here. Book each one directly on Airbnb; we take no commission.",
    heroCta:"See the stays",
    avgLabel:"average across the collection",
    s1:"Stays", s2:"Villages", s3:"Visited in person", s3b:"All",
    secEyebrow:"On the island", secTitle:"The Collection",
    secNote:"Ratings come from Airbnb. Rates change by season — check them on the listing.",
    fWhere:"Where", fWho:"Who for", fFeat:"Features",
    fAll:"All Jeju", fAny:"Any size", fAnyFeat:"Any feature",
    clear:"Clear filters",
    g1:"2 – 4 guests", g2:"5 – 8", g3:"9 or more",
    count:(n,t)=> n===t ? `<b>${n} ${n===1?"stay":"stays"}</b> · showing all` : `<b>${n} of ${t}</b> stays match`,
    cta:"Check dates &amp; prices",
    ctaHide:"Hide houses",
    micro:"Opens Airbnb · we take no commission",
    microRooms:n=>`See the ${n} rooms`,
    book:"Check dates",
    whole:"Whole property",
    oneGroup:"One group at a time",
    optWhole:n=>`The whole property, or ${n} rooms`,
    optPlain:n=>`${n} rooms to choose from`,
    sleeps:n=>`Sleeps ${n}`,
    sleepsUp:n=>`Sleeps up to ${n}`,
    newListing:"Newly listed",
    reviews:n=>`(${n})`,
    mapMini:n=>`${n} stays on the island`,
    mapOpenBig:"Open the map",
    backList:"Back to the list",
    tabList:"List", tabMap:"Map",
    mapOn:n=> n===1 ? "1 stay shown" : `${n} stays shown`,
    areaW:"West", areaS:"South", areaE:"East",
    wallEyebrow:n=>`Why these ${n}`,
    wallQ:"Every house here is looked after by the same small team that lives on the island — before your booking, and long after it.",
    wallS:"We take no booking commission. Every stay is booked directly with its host on Airbnb.",
    footer:"A curated collection of independent stays across Jeju Island, put together and looked after by a team that lives here.",
    contact:"Jeju Island, Republic of Korea",
    email:"hello@jejustaycollection.com",
    /* 전자상거래법 제20조 —— 거래의 당사자가 아니라는 사실을 미리 알린다.
       이 한 줄이 없으면 숙소와 게스트 사이에 문제가 생겼을 때
       사이트가 책임을 나눠 지게 된다. 지우지 말 것. */
    notParty:"Jeju Stay Collection introduces independent stays on Jeju Island and links to their booking pages. Reservations are made with each stay through Airbnb; we are not a party to the booking, payment, or refund.",
    privacyLink:"Privacy Policy",
    none:"<b>Nothing matches those filters.</b><br>Try widening the region, the party size or the features.",

    /* ── 상세 페이지 ── */
    detail:"View the stay",
    back:"The Collection",
    aboutTitle:"About the house",
    roomsTitle:"How it is taken",
    roomsOne:"Booking",
    mapTitle:"Where it is",
    mapOpen:"Open in Google Maps",
    mapNote:"Approximate location. The host sends the exact address after booking.",
    alsoTitle:"Elsewhere on the island",
    alsoNote:"Other stays in the collection.",
    featTitle:"What is here",
    ratingNote:"Rating and reviews from Airbnb.",
    seeAll:"See all stays",
    sleepsRoom:n=>`Sleeps up to ${n}`
  },
  zh:{
    place:"濟州島",
    h1:'不是濟州所有的住宿。<br>只有我們願意<br><em>推薦給朋友</em>的那幾間。',
    lede:"島上的獨立住宿 —— 每一間都由住在這裡的小團隊親自走訪、拍攝並長期照顧。直接在 Airbnb 訂房，我們不收任何佣金。",
    heroCta:"查看住宿",
    avgLabel:"為本系列平均評分",
    s1:"合作住宿", s2:"村落", s3:"親自走訪", s3b:"全部",
    secEyebrow:"島上", secTitle:"住宿選輯",
    secNote:"評分來自 Airbnb。房價隨季節變動，請於房源頁面確認。",
    fWhere:"地區", fWho:"人數", fFeat:"特色",
    fAll:"全濟州", fAny:"不限人數", fAnyFeat:"不限特色",
    clear:"清除篩選",
    g1:"2 – 4 人", g2:"5 – 8 人", g3:"9 人以上",
    count:(n,t)=> n===t ? `<b>共 ${n} 間</b> · 顯示全部` : `<b>${t} 間中 ${n} 間</b>符合`,
    cta:"查看日期與房價",
    ctaHide:"收合客房",
    micro:"前往 Airbnb · 我們不收佣金",
    microRooms:n=>`查看 ${n} 間客房`,
    book:"查看日期",
    whole:"整棟包棟",
    oneGroup:"一天只接待一組",
    optWhole:n=>`整棟包棟，或 ${n} 間客房`,
    optPlain:n=>`${n} 間客房可選`,
    sleeps:n=>`可住 ${n} 人`,
    sleepsUp:n=>`最多 ${n} 人`,
    newListing:"新上架",
    reviews:n=>`(${n})`,
    mapMini:n=>`島上 ${n} 間住宿`,
    mapOpenBig:"開啟地圖",
    backList:"回到清單",
    tabList:"清單", tabMap:"地圖",
    mapOn:n=>`顯示 ${n} 間`,
    areaW:"西部", areaS:"南部", areaE:"東部",
    wallEyebrow:n=>`為什麼是這 ${n} 間`,
    wallQ:"這裡的每一棟房子，都由同一組住在島上的人照顧 —— 在您訂房之前，也在很久之後。",
    wallS:"我們不收訂房佣金。每一間都直接在 Airbnb 向房東預訂。",
    footer:"由住在濟州島的團隊親自挑選並長期照顧的獨立住宿選輯。",
    contact:"大韓民國 濟州島",
    email:"hello@jejustaycollection.com",
    notParty:"Jeju Stay Collection 僅介紹濟州島上的獨立住宿，並連結至各住宿的訂房頁面。訂房契約成立於旅客與各住宿之間（透過 Airbnb），本站並非訂房、付款或退款的當事人。",
    privacyLink:"隱私權政策",
    none:"<b>沒有符合條件的住宿。</b><br>請放寬地區、人數或特色條件。",

    detail:"查看詳情",
    back:"住宿選輯",
    aboutTitle:"關於這棟房子",
    roomsTitle:"訂房方式",
    roomsOne:"訂房",
    mapTitle:"位置",
    mapOpen:"在 Google 地圖開啟",
    mapNote:"此為概略位置。確切地址由房東於訂房後提供。",
    alsoTitle:"島上其他住宿",
    alsoNote:"選輯中的其他住宿。",
    featTitle:"設施與特色",
    ratingNote:"評分與評價來自 Airbnb。",
    seeAll:"查看全部住宿",
    sleepsRoom:n=>`最多 ${n} 人`
  },
  ko:{
    place:"제주",
    h1:'제주의 모든 숙소가 아닙니다.<br>친구에게 권할 수 있는<br><em>몇 곳</em>만 모았습니다.',
    lede:"섬에 사는 작은 팀이 직접 가 보고, 찍고, 돌보는 독립 숙소들. 예약은 각 숙소의 네이버 예약으로 바로 연결되고, 저희는 수수료를 받지 않습니다.",
    heroCta:"숙소 보기",
    avgLabel:"컬렉션 평균",
    s1:"숙소", s2:"마을", s3:"직접 방문", s3b:"전부",
    secEyebrow:"제주에서", secTitle:"컬렉션",
    secNote:"요금은 시즌마다 달라집니다. 네이버 예약에서 확인하세요.",
    fWhere:"지역", fWho:"인원", fFeat:"시설",
    fAll:"제주 전체", fAny:"인원 무관", fAnyFeat:"시설 무관",
    clear:"필터 지우기",
    g1:"2 – 4인", g2:"5 – 8인", g3:"9인 이상",
    count:(n,t)=> n===t ? `<b>${n}곳</b> · 전체 표시` : `<b>${t}곳 중 ${n}곳</b>`,
    cta:"네이버에서 예약",
    ctaHide:"접기",
    micro:"네이버 예약으로 이동 · 수수료를 받지 않습니다",
    microRooms:n=>`객실 ${n}개 보기`,
    book:"날짜 보기",
    whole:"통째로 대관",
    oneGroup:"하루 한 팀",
    optWhole:n=>`통째로, 또는 객실 ${n}개`,
    optPlain:n=>`객실 ${n}개 중 선택`,
    sleeps:n=>`${n}인`,
    sleepsUp:n=>`최대 ${n}인`,
    newListing:"신규",
    reviews:n=>`(${n})`,
    mapMini:n=>`섬 안의 숙소 ${n}곳`,
    mapOpenBig:"지도 열기",
    backList:"목록으로",
    tabList:"목록", tabMap:"지도",
    mapOn:n=>`${n}곳 표시`,
    areaW:"서부", areaS:"남부", areaE:"동부",
    wallEyebrow:n=>`왜 이 ${n}곳인가`,
    wallQ:"여기 있는 집들은 모두 섬에 사는 같은 팀이 돌봅니다 —— 예약하시기 전에도, 다녀가신 뒤에도 오래.",
    wallS:"예약 수수료를 받지 않습니다. 모든 예약은 각 숙소에 직접 들어갑니다.",
    footer:"제주에 사는 팀이 직접 고르고 돌보는 독립 숙소 모음.",
    contact:"대한민국 제주",
    email:"hello@jejustaycollection.com",
    notParty:"제주 스테이 컬렉션은 제주의 독립 숙소를 소개하고 각 숙소의 예약 페이지로 연결합니다. 예약 계약은 이용자와 각 숙소 사이에 체결되며, 본 사이트는 예약·결제·환불의 당사자가 아닙니다.",
    privacyLink:"개인정보처리방침",
    none:"<b>조건에 맞는 숙소가 없습니다.</b><br>지역·인원·시설 조건을 넓혀 보세요.",

    detail:"숙소 보기",
    back:"컬렉션",
    aboutTitle:"이 집에 대하여",
    roomsTitle:"예약",
    roomsOne:"예약",
    mapTitle:"위치",
    mapOpen:"구글 지도에서 열기",
    mapNote:"대략적인 위치입니다. 정확한 주소는 예약 후 숙소에서 안내합니다.",
    alsoTitle:"섬의 다른 숙소",
    alsoNote:"컬렉션의 다른 숙소입니다.",
    featTitle:"갖춰진 것",
    ratingNote:"",
    seeAll:"전체 숙소 보기",
    sleepsRoom:n=>`최대 ${n}인`
  }
};

export const TAGS = {
  POOL:{en:"Private pool",zh:"私人泳池",ko:"프라이빗 풀"},      HEATED:{en:"Heated pool",zh:"溫水泳池",ko:"사계절 온수풀"},
  INDOOR:{en:"Indoor pool",zh:"室內泳池",ko:"실내 수영장"},     OCEAN:{en:"Ocean view",zh:"海景",ko:"오션뷰"},
  BEACH:{en:"Near beach",zh:"鄰近海灘",ko:"해변 근처"},       MOUNTAIN:{en:"Mountain view",zh:"山景",ko:"산 전망"},
  SUNRISE:{en:"Sunrise view",zh:"日出景觀",ko:"일출 전망"},   SUNSET:{en:"Sunset view",zh:"日落景觀",ko:"일몰 전망"},
  JACUZZI:{en:"Jacuzzi",zh:"按摩浴缸",ko:"자쿠지"},        SPA:{en:"Spa",zh:"水療",ko:"스파"},
  SAUNA:{en:"Finnish sauna",zh:"芬蘭浴",ko:"핀란드 사우나"},      CINEMA:{en:"Home cinema",zh:"家庭劇院",ko:"홈시네마"},
  KARAOKE:{en:"Karaoke",zh:"卡拉OK",ko:"노래방"},          BBQ:{en:"BBQ",zh:"烤肉",ko:"바비큐"},
  KITCHEN:{en:"Full kitchen",zh:"完整廚房",ko:"주방 완비"},   PARKING:{en:"Free parking",zh:"免費停車",ko:"무료 주차"},
  GARDEN:{en:"Garden",zh:"庭園",ko:"정원"},              ORCHARD:{en:"Tangerine grove",zh:"橘園景觀",ko:"귤밭 전망"},
  FOREST:{en:"Forest setting",zh:"森林環繞",ko:"숲속"},  CAMPING:{en:"Camping",zh:"露營",ko:"캠핑"},
  STONE:{en:"Jeju stone house",zh:"濟州石屋",ko:"제주 돌집"}, DESIGN:{en:"Design stay",zh:"設計旅宿",ko:"디자인 스테이"},
  PHOTO:{en:"Instagrammable",zh:"網美打卡",ko:"포토 스팟"},   PRIVATE:{en:"Entire place",zh:"獨棟包棟",ko:"독채"},
  GROUP:{en:"Group friendly",zh:"適合團體",ko:"단체 가능"},   FAMILY:{en:"Family friendly",zh:"適合家庭",ko:"가족 여행"},
  COUPLE:{en:"For couples",zh:"適合情侶",ko:"커플 여행"},     PET:{en:"Pet friendly",zh:"寵物友善",ko:"반려동물 동반"}
};

/* 필터 줄에 세우는 시설 칩 —— 목록을 여기에 고정한다.
   예전에는 시트에서 가장 많이 쓰인 태그 상위 5개를 매 빌드마다 다시 뽑았는데,
   5건 동점이 여럿이라 5등 자리가 시트 행 순서에 따라 뒤집혔다. 매월 예약률(B열)을
   갱신하면 정렬이 바뀌므로 아무것도 안 건드려도 칩이 달라졌다.
   광고 소재와 재방문 화면이 흔들리면 안 되므로 목록은 사람이 정한다.
   순서가 곧 화면 순서다. 해당 태그를 가진 숙소가 0곳이면 그 칩만 자동으로 숨는다.
   바꿀 때는 GA4 filter_change 의 filter_value 분포를 근거로. */
export const FILTER_TAGS = ["POOL","HEATED","OCEAN","PRIVATE","STONE"];

/* 알약 배지는 두 개뿐 —— 신규 등록, 그리고 할인.
   「영문|繁體」 자유 문구는 설명 아래 이탤릭 한 줄로.
   FEATURED / POPULAR 는 정보가 아니라 자기 선언이라 표시하지 않는다. */
export const BADGES = { NEW:{en:"Newly added",zh:"新上架",ko:"신규"} };

/* 평점을 화면에 내보내는 최소 후기 수.
   표본이 이보다 적으면 숫자 대신 「Newly listed」로 나간다 —
   후기 2~3건짜리 4.67 / 5.00 은 정보가 아니라 잡음이기 때문.
   시트에는 실제 값을 그대로 넣고, 판단은 여기서 한다. */
export const MIN_REVIEWS = 5;

/* 지역 한글 —— I열(Region EN)의 앞 토막을 키로 쓴다.
   시트에 한글 지역 열을 새로 만들지 않는 이유는, 열을 늘리면 사람이 세 칸을
   맞춰 채워야 하고 하나만 비면 그 숙소의 필터가 조용히 깨지기 때문.
   읍·면은 몇 개 안 되고 바뀌지 않으므로 코드에 둔다.
   여기 없는 지역은 영문 약칭이 그대로 나간다 —— 빈 칸보다 낫다. */
export const REGION_KO = {
  Gujwa:    {full:"제주 구좌읍",   short:"구좌읍"},
  Aewol:    {full:"제주 애월읍",   short:"애월읍"},
  Hallim:   {full:"제주 한림읍",   short:"한림읍"},
  Hangyeong:{full:"제주 한경면",   short:"한경면"},
  Jocheon:  {full:"제주 조천읍",   short:"조천읍"},
  Seongsan: {full:"서귀포 성산읍", short:"성산읍"},
  Namwon:   {full:"서귀포 남원읍", short:"남원읍"},
  Andeok:   {full:"서귀포 안덕면", short:"안덕면"},
  Pyoseon:  {full:"서귀포 표선면", short:"표선면"},
  Daejeong: {full:"서귀포 대정읍", short:"대정읍"}
};

/* ============================================================
   문구 · 태그 · 배지 사전
   이 파일의 객체는 빌드 시 페이지 안으로 직렬화되어 들어간다.
   함수를 값으로 써도 되지만 클로저를 잡으면 안 된다 —
   serialize()가 Function.toString()으로 옮기기 때문.
   ============================================================ */

export const T = {
  en:{
    place:"Jeju Island",
    h1:'Not every stay on Jeju.<br>Only the ones we would<br>send <em>a friend</em> to.',
    lede:"Fifteen independent houses across the island — visited, photographed and looked after by a small team that lives here. Book each one directly on Airbnb; we take no commission.",
    heroCta:"See the stays",
    avgLabel:"average across the collection",
    s1:"Stays", s2:"Villages", s3:"Visited in person", s3b:"All",
    secEyebrow:"On the island", secTitle:"The Collection",
    secNote:"Ratings come from Airbnb. Rates change by season — check them on the listing.",
    fWhere:"Where", fWho:"Who for", fAll:"All Jeju", fAny:"Any size",
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
    wallEyebrow:"Why these fifteen",
    wallQ:"Every house here is looked after by the same small team that lives on the island — before your booking, and long after it.",
    wallS:"We take no booking commission. Every stay is booked directly with its host on Airbnb.",
    footer:"A curated collection of independent stays across Jeju Island, put together and looked after by a team that lives here.",
    contact:"Jeju Island, Republic of Korea",
    email:"hello@jejustaycollection.com",
    none:"<b>Nothing matches those filters.</b><br>Try widening the region or the party size.",

    /* ── 상세 페이지 ── */
    detail:"View the stay",
    back:"The Collection",
    backAll:"All fifteen stays",
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
    lede:"島上十五間獨立住宿 —— 每一間都由住在這裡的小團隊親自走訪、拍攝並長期照顧。直接在 Airbnb 訂房，我們不收任何佣金。",
    heroCta:"查看住宿",
    avgLabel:"為本系列平均評分",
    s1:"合作住宿", s2:"村落", s3:"親自走訪", s3b:"全部",
    secEyebrow:"島上", secTitle:"住宿選輯",
    secNote:"評分來自 Airbnb。房價隨季節變動，請於房源頁面確認。",
    fWhere:"地區", fWho:"人數", fAll:"全濟州", fAny:"不限",
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
    wallEyebrow:"為什麼是這十五間",
    wallQ:"這裡的每一棟房子，都由同一組住在島上的人照顧 —— 在您訂房之前，也在很久之後。",
    wallS:"我們不收訂房佣金。每一間都直接在 Airbnb 向房東預訂。",
    footer:"由住在濟州島的團隊親自挑選並長期照顧的獨立住宿選輯。",
    contact:"大韓民國 濟州島",
    email:"hello@jejustaycollection.com",
    none:"<b>沒有符合條件的住宿。</b><br>請放寬地區或人數條件。",

    detail:"查看詳情",
    back:"住宿選輯",
    backAll:"全部十五間",
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
  }
};

export const TAGS = {
  POOL:{en:"Private pool",zh:"私人泳池"},      HEATED:{en:"Heated pool",zh:"溫水泳池"},
  INDOOR:{en:"Indoor pool",zh:"室內泳池"},     OCEAN:{en:"Ocean view",zh:"海景"},
  BEACH:{en:"Near beach",zh:"鄰近海灘"},       MOUNTAIN:{en:"Mountain view",zh:"山景"},
  SUNRISE:{en:"Sunrise view",zh:"日出景觀"},   SUNSET:{en:"Sunset view",zh:"日落景觀"},
  JACUZZI:{en:"Jacuzzi",zh:"按摩浴缸"},        SPA:{en:"Spa",zh:"水療"},
  SAUNA:{en:"Finnish sauna",zh:"芬蘭浴"},      CINEMA:{en:"Home cinema",zh:"家庭劇院"},
  KARAOKE:{en:"Karaoke",zh:"卡拉OK"},          BBQ:{en:"BBQ",zh:"烤肉"},
  KITCHEN:{en:"Full kitchen",zh:"完整廚房"},   PARKING:{en:"Free parking",zh:"免費停車"},
  GARDEN:{en:"Garden",zh:"庭園"},              ORCHARD:{en:"Tangerine grove",zh:"橘園景觀"},
  FOREST:{en:"Forest setting",zh:"森林環繞"},  CAMPING:{en:"Camping",zh:"露營"},
  STONE:{en:"Jeju stone house",zh:"濟州石屋"}, DESIGN:{en:"Design stay",zh:"設計旅宿"},
  PHOTO:{en:"Instagrammable",zh:"網美打卡"},   PRIVATE:{en:"Entire place",zh:"獨棟包棟"},
  GROUP:{en:"Group friendly",zh:"適合團體"},   FAMILY:{en:"Family friendly",zh:"適合家庭"},
  COUPLE:{en:"For couples",zh:"適合情侶"},     PET:{en:"Pet friendly",zh:"寵物友善"}
};

/* 알약 배지는 두 개뿐 —— 신규 등록, 그리고 할인.
   「영문|繁體」 자유 문구는 설명 아래 이탤릭 한 줄로.
   FEATURED / POPULAR 는 정보가 아니라 자기 선언이라 표시하지 않는다. */
export const BADGES = { NEW:{en:"Newly added",zh:"新上架"} };

/* 평점을 화면에 내보내는 최소 후기 수.
   표본이 이보다 적으면 숫자 대신 「Newly listed」로 나간다 —
   후기 2~3건짜리 4.67 / 5.00 은 정보가 아니라 잡음이기 때문.
   시트에는 실제 값을 그대로 넣고, 판단은 여기서 한다. */
export const MIN_REVIEWS = 5;

import { useState, useEffect, useCallback, useRef } from "react";

const TMDB_KEY = "20dd09adbf02a4a795efed497b592817";
const BASE = "https://api.themoviedb.org/3";
const IMG  = "https://image.tmdb.org/t/p";

async function tmdb(path, params = {}) {
  const q = new URLSearchParams({ api_key: TMDB_KEY, language: "en-US", ...params });
  const r = await fetch(`${BASE}${path}?${q}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

async function fetchArabic(mediaType, id) {
  try {
    const type = mediaType === "tv" ? "tv" : "movie";
    const q = new URLSearchParams({ api_key: TMDB_KEY, language: "ar" });
    const r = await fetch(`${BASE}/${type}/${id}?${q}`);
    if (!r.ok) return null;
    const d = await r.json();
    const title = d.title || d.name || "";
    const overview = d.overview || "";
    if (!title && !overview) return null;
    return { title: title || null, overview: overview || null };
  } catch { return null; }
}

const fmt = (n) => (typeof n === "number" ? n.toFixed(1) : "N/A");
const yr  = (d) => d?.slice(0, 4) ?? "";
const rt  = (m) => m ? `${Math.floor(m / 60)}h ${m % 60}m` : "";

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    dir:"ltr", home:"Home", movies:"Movies", tv:"TV Shows", discover:"Discover",
    signIn:"Sign In", search:"Search", watchlist:"Watchlist",
    trending:"Trending This Week", classics:"All-Time Classics",
    popular_tv:"Popular TV Shows", coming:"Coming Soon", browse_genre:"Browse by Genre",
    explore:"Explore All", view_details:"▶ Details", watch_trailer:"▶ Trailer",
    add_wl:"+ Watchlist", in_wl:"✦ Saved", back:"← Back",
    cast:"Cast", reviews:"Reviews", write_review:"Write a Review",
    post_review:"Post Review", no_reviews:"No reviews yet — be the first!",
    similar:"You May Also Like", sign_in_review:"Sign in to write a review",
    share_thoughts:"Share your thoughts…", welcome_back:"Welcome back,",
    my_watchlist:"My Watchlist", send:"Send", empty_wl:"Watchlist is empty",
    browse_movies:"Browse Movies", sign_out:"Sign Out", register:"Register",
    create_acc:"Create Account", email:"Email address", password:"Password",
    your_name:"Your name", no_acc:"No account?", have_acc:"Have an account?",
    actor_films:"Known For", born:"Born", arabic:"ع", translating:"Translating…",
    genres:{28:"Action",35:"Comedy",18:"Drama",27:"Horror",878:"Sci-Fi",
      10749:"Romance",53:"Thriller",16:"Animation",12:"Adventure",99:"Documentary"},
    sort_pop:"Popular", sort_rated:"Top Rated", sort_new:"Newest", sort_box:"Box Office",
    sort_by:"Sort", min_rating:"Min Rating", year_lbl:"Year", filters:"Filters",
    member_since:"Member Since", reviews_written:"Reviews Written",
    powered:"Powered by TMDB · Claude AI",
    search_placeholder:"Search movies, shows, actors…", searching:"Searching…",
    failed_load:"Failed to load. Check your connection.",
  },
  ar: {
    dir:"rtl", home:"الرئيسية", movies:"أفلام", tv:"مسلسلات", discover:"اكتشاف",
    signIn:"دخول", search:"بحث", watchlist:"قائمتي",
    trending:"الأكثر رواجاً", classics:"روائع كل الأزمان",
    popular_tv:"المسلسلات الشعبية", coming:"قريباً", browse_genre:"تصفح الأنواع",
    explore:"استكشاف الكل", view_details:"▶ تفاصيل", watch_trailer:"▶ الإعلان",
    add_wl:"+ أضف", in_wl:"✦ محفوظ", back:"رجوع →",
    cast:"طاقم التمثيل", reviews:"المراجعات", write_review:"اكتب مراجعة",
    post_review:"نشر", no_reviews:"لا توجد مراجعات — كن الأول!",
    similar:"قد يعجبك أيضاً", sign_in_review:"سجّل دخولك للمراجعة",
    share_thoughts:"شاركنا رأيك…", welcome_back:"مرحباً،",
    my_watchlist:"قائمة مشاهدتي", send:"إرسال", empty_wl:"القائمة فارغة",
    browse_movies:"تصفح الأفلام", sign_out:"خروج", register:"إنشاء حساب",
    create_acc:"إنشاء حساب", email:"البريد الإلكتروني", password:"كلمة المرور",
    your_name:"اسمك", no_acc:"ليس لديك حساب؟", have_acc:"لديك حساب؟",
    actor_films:"أبرز الأعمال", born:"تاريخ الميلاد", arabic:"EN", translating:"جارٍ الترجمة…",
    genres:{28:"أكشن",35:"كوميديا",18:"دراما",27:"رعب",878:"خيال علمي",
      10749:"رومانسي",53:"إثارة",16:"رسوم متحركة",12:"مغامرة",99:"وثائقي"},
    sort_pop:"الأكثر شعبية", sort_rated:"الأعلى تقييماً", sort_new:"الأحدث", sort_box:"إيرادات",
    sort_by:"ترتيب", min_rating:"أقل تقييم", year_lbl:"السنة", filters:"الفلاتر",
    member_since:"عضو منذ", reviews_written:"مراجعاتي",
    powered:"مدعوم بواسطة TMDB · Claude AI",
    search_placeholder:"ابحث عن فيلم أو مسلسل…", searching:"جارٍ البحث…",
    failed_load:"فشل التحميل. تحقق من اتصالك.",
  }
};

// ── CSS — mobile-first ────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Outfit:wght@300;400;500;600&family=Tajawal:wght@300;400;500;700&display=swap');

/* ── Reset ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
html,body{width:100%;overflow-x:hidden}
body{
  background:#09090E;color:#E2E2F0;
  font-family:'Outfit',sans-serif;
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
body[dir=rtl]{font-family:'Tajawal',sans-serif}
#root{width:100%;overflow-x:hidden}
img{max-width:100%;display:block}

/* ── Variables ── */
:root{
  --bg:#09090E;--bg2:#0F0F18;--bg3:#181825;
  --card:#131320;--brd:#252535;--txt:#E2E2F0;--mut:#8888AA;
  --gold:#C9A84C;--gold2:#E8C96A;--red:#E53E3E;
  --nav:#0C0C14;
  --pad-x:16px;       /* mobile side padding */
  --pad-x-md:28px;    /* tablet */
  --pad-x-lg:5%;      /* desktop */
}
@media(min-width:768px){:root{--pad-x:var(--pad-x-md)}}
@media(min-width:1024px){:root{--pad-x:var(--pad-x-lg)}}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px}

/* ── Typography ── */
.cinzel{font-family:'Cinzel',serif}
body[dir=rtl] .cinzel{font-family:'Tajawal',sans-serif;font-weight:700}
.gold{color:var(--gold)} .mut{color:var(--mut)}

/* ── Buttons ── */
.btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:9px 18px;border-radius:8px;border:none;
  cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;
  transition:all .2s;white-space:nowrap;
}
.btn-gold{background:var(--gold);color:#09090E}
.btn-gold:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,168,76,.35)}
.btn-gold:disabled{opacity:.45;cursor:not-allowed;transform:none}
.btn-out{background:transparent;color:var(--gold);border:1.5px solid var(--gold)}
.btn-out:hover{background:rgba(201,168,76,.1)}
.btn-ghost{background:rgba(255,255,255,.05);color:var(--txt);border:1px solid var(--brd)}
.btn-ghost:hover{background:rgba(255,255,255,.1)}

/* ── Card ── */
.card{background:var(--card);border:1px solid var(--brd);border-radius:10px;overflow:hidden;transition:transform .3s,border-color .3s,box-shadow .3s;cursor:pointer}
@media(hover:hover){
  .card:hover{border-color:rgba(201,168,76,.5);transform:translateY(-4px);box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 0 1px rgba(201,168,76,.12)}
}

/* ── Tags / Badges ── */
.tag{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;background:rgba(201,168,76,.12);color:var(--gold);border:1px solid rgba(201,168,76,.28)}
.bdg{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}
.bdg-g{background:var(--gold);color:#09090E}
.bdg-d{background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.12)}

/* ── Form inputs ── */
.inp{width:100%;padding:11px 16px;background:var(--bg3);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:15px;outline:none;transition:border .2s;-webkit-appearance:none}
.inp:focus{border-color:var(--gold)}
.txta{width:100%;padding:12px 16px;background:var(--bg3);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:14px;outline:none;resize:vertical;min-height:96px;transition:border .2s}
.txta:focus{border-color:var(--gold)}
.sel{padding:10px 14px;background:var(--bg3);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:14px;outline:none;cursor:pointer;-webkit-appearance:none;width:100%}

/* ── Overlay / Modal ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:900;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)}
@media(min-width:600px){.overlay{align-items:center}}
.modal{background:var(--bg2);border:1px solid var(--brd);width:100%;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0}
@media(min-width:600px){.modal{border-radius:14px;max-width:520px}}

/* ── Skeleton ── */
.sk{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg2) 50%,var(--bg3) 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:6px}
@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.fi{animation:fi .35s ease}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── Navbar ── */
.nav{position:sticky;top:0;z-index:600;background:rgba(12,12,20,.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--brd);width:100%}
.nav-in{
  display:flex;align-items:center;
  height:56px;padding:0 var(--pad-x);
  max-width:1440px;margin:0 auto;
  gap:12px;
}
@media(min-width:768px){.nav-in{height:62px;gap:16px}}
.nav-logo{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:var(--gold);letter-spacing:2px;cursor:pointer;user-select:none;white-space:nowrap;flex-shrink:0}
@media(min-width:768px){.nav-logo{font-size:19px;letter-spacing:3px}}

/* desktop nav links */
.nav-links{display:none;gap:2px;flex:1}
@media(min-width:768px){.nav-links{display:flex}}
.nav-lnk{padding:5px 11px;border-radius:6px;color:var(--mut);font-size:13px;cursor:pointer;transition:all .2s;white-space:nowrap;border:none;background:none;font-family:inherit}
.nav-lnk:hover{color:var(--txt);background:rgba(255,255,255,.05)}
.nav-lnk.on{color:var(--gold);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.15)}

/* nav right actions */
.nav-actions{display:flex;align-items:center;gap:6px;margin-left:auto}
.nav-icon-btn{background:none;border:none;color:var(--mut);cursor:pointer;padding:6px;border-radius:6px;font-size:18px;line-height:1;transition:color .2s;display:flex;align-items:center}
.nav-icon-btn:hover{color:var(--gold)}

/* hamburger */
.hamburger{background:none;border:1px solid var(--brd);border-radius:7px;color:var(--txt);cursor:pointer;padding:6px 10px;font-size:16px;display:flex;align-items:center;transition:border-color .2s}
.hamburger:hover{border-color:var(--gold)}
@media(min-width:768px){.hamburger{display:none}}

/* mobile drawer */
.drawer{
  position:fixed;inset:0;z-index:700;
  display:flex;flex-direction:column;
  background:var(--bg2);
  padding:0;
  transform:translateX(-100%);
  transition:transform .28s ease;
}
body[dir=rtl] .drawer{transform:translateX(100%)}
.drawer.open{transform:translateX(0)}
body[dir=rtl] .drawer.open{transform:translateX(0)}
.drawer-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--brd)}
.drawer-body{flex:1;overflow-y:auto;padding:16px}
.drawer-lnk{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;color:var(--txt);font-size:16px;cursor:pointer;transition:background .15s;border:none;background:none;font-family:inherit;width:100%}
.drawer-lnk:hover,.drawer-lnk.on{background:rgba(201,168,76,.08);color:var(--gold)}
.drawer-lnk.on{font-weight:600}

/* ── Hero ── */
.hero{position:relative;height:70vh;min-height:440px;display:flex;align-items:flex-end;padding:0 var(--pad-x) 10%}
@media(min-width:768px){.hero{height:82vh;padding:0 var(--pad-x) 8%}}
@media(min-width:1024px){.hero{height:90vh;padding:0 var(--pad-x) 7%}}
.hbg{position:absolute;inset:0;background-size:cover;background-position:center top}
.hov1{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,9,14,.3) 0%,rgba(9,9,14,.7) 60%,rgba(9,9,14,.97) 100%)}
@media(min-width:768px){.hov1{background:linear-gradient(105deg,rgba(9,9,14,.97) 28%,rgba(9,9,14,.55) 65%,transparent)}}
.hov2{position:absolute;inset:0;background:linear-gradient(to top,rgba(9,9,14,1) 0%,transparent 55%)}
.htxt{position:relative;z-index:1;width:100%;max-width:660px}
.htitle{font-family:'Cinzel',serif;font-size:clamp(22px,6vw,52px);font-weight:700;line-height:1.1;margin-bottom:12px;text-shadow:0 2px 20px rgba(0,0,0,.8)}
body[dir=rtl] .htitle{font-family:'Tajawal',sans-serif}
.hero-desc{font-size:14px;line-height:1.7;color:var(--mut);max-width:480px;margin-bottom:20px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
@media(min-width:768px){.hero-desc{font-size:15px;-webkit-line-clamp:4}}

/* ── Section ── */
.sec{padding:32px var(--pad-x)}
@media(min-width:768px){.sec{padding:44px var(--pad-x)}}
.smx{max-width:1440px;margin:0 auto}
.stitle{font-family:'Cinzel',serif;font-size:17px;font-weight:600;margin-bottom:18px;display:flex;align-items:center;gap:10px}
@media(min-width:768px){.stitle{font-size:20px;margin-bottom:22px}}
body[dir=rtl] .stitle{font-family:'Tajawal',sans-serif}
.stitle::before{content:'';display:block;width:3px;height:18px;background:var(--gold);border-radius:2px;flex-shrink:0}

/* ── Movie Grid — 2 cols → 3 cols → 4-5 cols ── */
.mgrid{
  display:grid;
  gap:12px;
  grid-template-columns:repeat(2,1fr);
}
@media(min-width:480px){.mgrid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:768px){.mgrid{gap:14px;grid-template-columns:repeat(3,1fr)}}
@media(min-width:900px){.mgrid{grid-template-columns:repeat(4,1fr)}}
@media(min-width:1200px){.mgrid{grid-template-columns:repeat(5,1fr)}}

/* ── Horizontal scroll row ── */
.hrow{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.hrow::-webkit-scrollbar{height:2px}
.hrow-item{flex:0 0 140px}
@media(min-width:480px){.hrow-item{flex:0 0 160px}}
@media(min-width:768px){.hrow-item{flex:0 0 175px}}

/* ── Movie Card ── */
.poster{width:100%;aspect-ratio:2/3;object-fit:cover;background:var(--bg3)}
.minfo{padding:9px 10px}
.mtitle{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
@media(min-width:768px){.mtitle{font-size:13px}}

/* ── Detail hero ── */
.dh{position:relative;min-height:380px;display:flex;align-items:flex-end;padding:0 var(--pad-x) 24px}
@media(min-width:768px){.dh{min-height:500px;padding:0 var(--pad-x) 40px}}
.dbk{position:absolute;inset:0;background-size:cover;background-position:top center}
.dov1{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,9,14,.5) 0%,rgba(9,9,14,.95) 80%)}
@media(min-width:768px){.dov1{background:linear-gradient(105deg,rgba(9,9,14,.99) 35%,rgba(9,9,14,.65) 65%,rgba(9,9,14,.3))}}
.dov2{position:absolute;inset:0;background:linear-gradient(to top,var(--bg) 0%,transparent 60%)}
.dc{position:relative;z-index:1;display:flex;flex-direction:column;gap:16px;max-width:1440px;margin:0 auto;width:100%}
@media(min-width:768px){.dc{flex-direction:row;gap:28px;align-items:flex-end}}
.dposter{width:110px;border-radius:8px;overflow:hidden;border:2px solid var(--brd);box-shadow:0 0 30px rgba(201,168,76,.12);flex-shrink:0}
@media(min-width:480px){.dposter{width:140px}}
@media(min-width:768px){.dposter{width:185px;border-radius:10px}}
.dposter img{width:100%;display:block}
.dtitle{font-family:'Cinzel',serif;font-size:clamp(18px,4vw,40px);font-weight:700;margin-bottom:10px;line-height:1.15}
body[dir=rtl] .dtitle{font-family:'Tajawal',sans-serif}
.meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.mi2{display:flex;align-items:center;gap:4px;font-size:12.5px;color:var(--mut)}
@media(min-width:768px){.mi2{font-size:13.5px}}
.ov{font-size:13.5px;line-height:1.75;color:var(--mut);margin-bottom:16px;max-width:640px}
@media(min-width:768px){.ov{font-size:14.5px}}

/* ── Cast ── */
.cast-img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--brd);margin:0 auto 6px;display:block}
@media(min-width:768px){.cast-img{width:76px;height:76px}}

/* ── Review card ── */
.rcard{background:var(--card);border:1px solid var(--brd);border-radius:10px;padding:14px}
@media(min-width:768px){.rcard{padding:18px}}
.av{width:36px;height:36px;border-radius:50%;background:var(--gold);color:#09090E;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}

/* ── Genre chips ── */
.gc{padding:7px 14px;border-radius:24px;font-size:13px;font-weight:500;background:var(--bg3);border:1px solid var(--brd);cursor:pointer;transition:all .2s;color:var(--mut);font-family:inherit;white-space:nowrap}
.gc:hover,.gc.on{background:rgba(201,168,76,.1);border-color:var(--gold);color:var(--gold)}

/* ── Tabs ── */
.tab{padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s;color:var(--mut);border:none;background:transparent;font-family:inherit;white-space:nowrap}
@media(min-width:480px){.tab{padding:7px 18px;font-size:13.5px}}
.tab.on{background:rgba(201,168,76,.1);color:var(--gold);border:1px solid rgba(201,168,76,.22)}

/* ── Search dropdown ── */
.srch-wrap{width:min(620px,92vw);position:relative}
.srch-dd{position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;overflow:hidden;z-index:200;margin-top:4px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
.si{display:flex;gap:10px;align-items:center;padding:10px 14px;cursor:pointer;transition:background .15s}
.si:hover{background:var(--bg3)}

/* ── Toast ── */
.toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2000;background:var(--card);border:1px solid rgba(201,168,76,.4);border-radius:8px;padding:10px 18px;font-size:13.5px;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:fi .3s ease;pointer-events:none;white-space:nowrap}
@media(min-width:600px){.toast{left:auto;right:22px;transform:none}}
body[dir=rtl] .toast{left:22px;right:auto;transform:none}

/* ── Trailer overlay ── */
.trl-ov{position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:2000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:16px}

/* ── Actor hero ── */
.actor-hero{background:linear-gradient(135deg,var(--bg2),var(--bg3));padding:28px var(--pad-x);border-bottom:1px solid var(--brd)}
@media(min-width:768px){.actor-hero{padding:40px var(--pad-x)}}
.actor-hero-in{max-width:1440px;margin:0 auto;display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
@media(min-width:600px){.actor-hero-in{gap:28px;flex-wrap:nowrap}}

/* ── Pagination ── */
.pagination{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:32px;flex-wrap:wrap}
.pg-btn{min-width:36px;height:36px;border-radius:7px;border:1px solid var(--brd);background:var(--card);color:var(--txt);cursor:pointer;font-size:13px;font-family:inherit;transition:all .2s;display:flex;align-items:center;justify-content:center;padding:0 10px}
.pg-btn:hover{border-color:var(--gold);color:var(--gold)}
.pg-btn.on{background:var(--gold);color:#09090E;border-color:var(--gold);font-weight:700}
.pg-btn:disabled{opacity:.3;cursor:not-allowed}

/* ── Filters panel ── */
.filters-panel{background:var(--card);border:1px solid var(--brd);border-radius:12px;padding:16px;margin-bottom:24px}
@media(min-width:768px){.filters-panel{padding:20px}}
.filter-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}

/* ── Error box ── */
.err-box{background:rgba(229,62,62,.08);border:1px solid rgba(229,62,62,.25);border-radius:8px;padding:14px;color:#E08080;font-size:13.5px;margin-bottom:16px}
`;

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: ["The Godfather","Blade Runner 2049","Dune","Oppenheimer","Parasite","Interstellar",
    "The Dark Knight","Inception","1917","Arrival","Tenet","Mad Max","Her",
    "Ex Machina","Midsommar","Hereditary","The Lighthouse","Annihilation","A Ghost Story","Everything Everywhere"][i],
  vote_average: 7 + Math.random() * 2.5,
  release_date: `${2018+(i%6)}-0${(i%9)+1}-15`,
  poster_path:null, backdrop_path:null, overview:"A masterpiece of modern cinema.",
}));

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function SkCard() {
  return (
    <div className="card">
      <div className="sk" style={{width:"100%",paddingTop:"150%",position:"relative"}}/>
      <div style={{padding:"9px 10px"}}>
        <div className="sk" style={{height:12,width:"72%",marginBottom:6}}/>
        <div className="sk" style={{height:10,width:"44%"}}/>
      </div>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t); });
  return <div className="toast">✦ {msg}</div>;
}

function Pagination({ page, total, onChange }) {
  const pages = Math.min(total, 500);
  const nums = [];
  let start = Math.max(1, page-2), end = Math.min(pages, page+2);
  if (page <= 3) end = Math.min(5, pages);
  if (page >= pages-2) start = Math.max(1, pages-4);
  for (let i = start; i <= end; i++) nums.push(i);
  return (
    <div className="pagination">
      <button className="pg-btn" disabled={page===1} onClick={()=>onChange(page-1)}>‹</button>
      {start > 1 && <><button className="pg-btn" onClick={()=>onChange(1)}>1</button>{start>2 && <span className="mut" style={{padding:"0 2px"}}>…</span>}</>}
      {nums.map(n=><button key={n} className={`pg-btn${page===n?" on":""}`} onClick={()=>onChange(n)}>{n}</button>)}
      {end < pages && <><span className="mut" style={{padding:"0 2px"}}>…</span><button className="pg-btn" onClick={()=>onChange(pages)}>{pages}</button></>}
      <button className="pg-btn" disabled={page>=pages} onClick={()=>onChange(page+1)}>›</button>
    </div>
  );
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ movie, onClick, t }) {
  const [hov, setHov] = useState(false);
  if (!movie) return <SkCard />;
  const poster = movie.poster_path
    ? `${IMG}/w342${movie.poster_path}`
    : `https://placehold.co/200x300/131320/888888?text=${encodeURIComponent((movie.title||movie.name||"?").slice(0,8))}`;
  return (
    <div className="card fi" onClick={()=>onClick(movie)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{position:"relative",overflow:"hidden"}}>
        <img className="poster" src={poster} alt={movie.title||movie.name} loading="lazy"
          style={{transform:hov?"scale(1.05)":"scale(1)",transition:"transform .4s"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.9) 0%,transparent 55%)",opacity:hov?1:0,transition:"opacity .3s"}}>
          <div style={{position:"absolute",bottom:8,left:8}}><span className="tag" style={{fontSize:10}}>{t?.view_details||"▶"}</span></div>
        </div>
        <div style={{position:"absolute",top:6,right:6}}>
          <span className="bdg bdg-g" style={{fontSize:10}}>★ {fmt(movie.vote_average)}</span>
        </div>
      </div>
      <div className="minfo">
        <div className="mtitle">{movie.title||movie.name}</div>
        <div className="mut" style={{fontSize:11}}>{yr(movie.release_date||movie.first_air_date)}</div>
      </div>
    </div>
  );
}

// ── Navbar with hamburger ─────────────────────────────────────────────────────
function Nav({ page, go, user, openAuth, openSearch, wl, lang, toggleLang, t }) {
  const [drawer, setDrawer] = useState(false);
  const links = [["home",t.home],["movies",t.movies],["tv",t.tv],["discover",t.discover]];
  const icons = { home:"🏠", movies:"🎬", tv:"📺", discover:"🔭" };
  const close = (id) => { go(id); setDrawer(false); };

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          {/* Logo */}
          <div className="nav-logo" onClick={()=>go("home")}>⬡ ALSAD</div>

          {/* Desktop links */}
          <div className="nav-links">
            {links.map(([id,lbl])=>(
              <button key={id} className={`nav-lnk${page===id||page.startsWith(id)?" on":""}`} onClick={()=>go(id)}>{lbl}</button>
            ))}
          </div>

          {/* Right actions */}
          <div className="nav-actions">
            {/* Search — icon only on mobile */}
            <button className="nav-icon-btn" onClick={openSearch} title="Search">🔍</button>

            {/* Lang toggle */}
            <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:13,fontWeight:700,minWidth:36}} onClick={toggleLang}>{t.arabic}</button>

            {/* User / Sign In — hidden on tiny mobile, shown on sm+ */}
            <div style={{display:"none"}} className="nav-user-desktop">
              {user
                ? <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:12.5}} onClick={()=>go("dash")}>
                    <span style={{width:20,height:20,borderRadius:"50%",background:"var(--gold)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#09090E",fontWeight:700}}>{user.name[0].toUpperCase()}</span>
                    <span style={{maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</span>
                    {wl.length>0 && <span className="bdg bdg-g" style={{fontSize:10,padding:"1px 5px"}}>{wl.length}</span>}
                  </button>
                : <button className="btn btn-gold" style={{padding:"7px 14px",fontSize:12.5}} onClick={()=>openAuth("login")}>{t.signIn}</button>
              }
            </div>

            {/* Hamburger */}
            <button className="hamburger" onClick={()=>setDrawer(true)} aria-label="Menu">☰</button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {drawer && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:699}} onClick={()=>setDrawer(false)}/>}
      <div className={`drawer${drawer?" open":""}`}>
        <div className="drawer-head">
          <span className="nav-logo" style={{letterSpacing:2}}>⬡ ALSAD</span>
          <button onClick={()=>setDrawer(false)} style={{background:"none",border:"none",color:"var(--mut)",fontSize:22,cursor:"pointer",padding:4}}>✕</button>
        </div>
        <div className="drawer-body">
          {links.map(([id,lbl])=>(
            <button key={id} className={`drawer-lnk${page===id||page.startsWith(id)?" on":""}`} onClick={()=>close(id)}>
              <span style={{fontSize:18}}>{icons[id]}</span>{lbl}
            </button>
          ))}
          <div style={{height:1,background:"var(--brd)",margin:"12px 0"}}/>
          {user
            ? <>
                <button className="drawer-lnk" onClick={()=>close("dash")}>👤 {user.name} {wl.length>0&&<span className="bdg bdg-g" style={{fontSize:11,padding:"1px 6px",marginLeft:6}}>{wl.length}</span>}</button>
                <button className="drawer-lnk" onClick={()=>{go("home");setDrawer(false);}} style={{color:"var(--red)"}}>🚪 {t.sign_out}</button>
              </>
            : <button className="drawer-lnk on" onClick={()=>{openAuth("login");setDrawer(false);}}>✨ {t.signIn}</button>
          }
        </div>
      </div>

      {/* Inline style for desktop user button visibility */}
      <style>{`
        @media(min-width:500px){.nav-user-desktop{display:flex!important}}
      `}</style>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ movies, onOpen, go, t }) {
  const [idx, setIdx] = useState(0);
  const cur = movies[idx];
  useEffect(()=>{
    if(!movies.length)return;
    const ti=setInterval(()=>setIdx(i=>(i+1)%Math.min(movies.length,6)),6000);
    return()=>clearInterval(ti);
  },[movies.length]);
  if(!cur) return <div style={{height:"70vh",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span className="cinzel gold" style={{fontSize:22,letterSpacing:4}}>⬡ ALSAD</span></div>;
  const bg = cur.backdrop_path?`${IMG}/original${cur.backdrop_path}`:"";
  return (
    <section className="hero">
      {bg && <div className="hbg" style={{backgroundImage:`url(${bg})`}}/>}
      <div className="hov1"/><div className="hov2"/>
      <div className="htxt fi" key={idx}>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          <span className="bdg bdg-g">★ {fmt(cur.vote_average)}</span>
          <span className="bdg bdg-d">{yr(cur.release_date)}</span>
          <span className="bdg bdg-d">Trending</span>
        </div>
        <h1 className="htitle">{cur.title}</h1>
        <p className="hero-desc">{cur.overview}</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-gold" onClick={()=>onOpen(cur)}>{t.view_details}</button>
          <button className="btn btn-out" onClick={()=>go("movies")}>{t.explore}</button>
        </div>
        <div style={{display:"flex",gap:6,marginTop:20}}>
          {movies.slice(0,6).map((_,i)=>(
            <div key={i} onClick={()=>setIdx(i)}
              style={{width:i===idx?24:6,height:3,borderRadius:2,background:i===idx?"var(--gold)":"rgba(255,255,255,.2)",cursor:"pointer",transition:"all .4s"}}/>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Search Modal ──────────────────────────────────────────────────────────────
function SearchModal({ onClose, onOpen, onActorOpen, t }) {
  const [q,setQ]=useState(""); const [res,setRes]=useState([]); const [loading,setLoading]=useState(false);
  const ref=useRef();
  useEffect(()=>{
    if(!q.trim()){setRes([]);return;}
    const ti=setTimeout(async()=>{
      setLoading(true);
      try{const d=await tmdb("/search/multi",{query:q});setRes((d.results||[]).slice(0,10));}catch{}
      setLoading(false);
    },380);
    return()=>clearTimeout(ti);
  },[q]);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="srch-wrap" style={{marginBottom:"auto",marginTop:20}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"relative"}}>
          <input ref={ref} className="inp" value={q} onChange={e=>setQ(e.target.value)}
            placeholder={t.search_placeholder} style={{fontSize:16,padding:"13px 44px 13px 16px",borderRadius:10}}/>
          <button onClick={onClose} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--mut)",cursor:"pointer",fontSize:20,padding:4}}>✕</button>
        </div>
        {res.length>0 && (
          <div className="srch-dd">
            {res.map(m=>(
              <div key={m.id} className="si" onClick={()=>{m.media_type==="person"?onActorOpen(m.id):onOpen(m);onClose();}}>
                <img src={(m.poster_path||m.profile_path)?`${IMG}/w92${m.poster_path||m.profile_path}`:`https://placehold.co/34x50/131320/888?text=?`}
                  style={{width:32,height:48,objectFit:"cover",borderRadius:4,flexShrink:0}} alt=""/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title||m.name}</div>
                  <div className="mut" style={{fontSize:11.5}}>
                    {m.media_type==="person"?"👤":m.media_type==="tv"?"📺":"🎬"}
                    {m.vote_average?` ★ ${fmt(m.vote_average)}`:""} {yr(m.release_date||m.first_air_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && <div style={{textAlign:"center",padding:18,color:"var(--mut)",fontSize:13.5}}>{t.searching}</div>}
      </div>
    </div>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onLogin, t }) {
  const [m,setM]=useState(mode); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState("");
  const submit=()=>{
    if(!email||!pass)return setErr("Please fill all fields.");
    if(m==="register"&&!name)return setErr("Name is required.");
    onLogin({name:name||email.split("@")[0],email}); onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h2 className="cinzel" style={{fontSize:19}}>{m==="login"?t.welcome_back:"Join Alsad"}</h2>
            <button onClick={onClose} style={{background:"none",border:"none",color:"var(--mut)",cursor:"pointer",fontSize:22,padding:4}}>✕</button>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:20}}>
            <button className={`tab${m==="login"?" on":""}`} onClick={()=>setM("login")}>{t.signIn}</button>
            <button className={`tab${m==="register"?" on":""}`} onClick={()=>setM("register")}>{t.register}</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {m==="register"&&<input className="inp" placeholder={t.your_name} value={name} onChange={e=>setName(e.target.value)}/>}
            <input className="inp" placeholder={t.email} type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input className="inp" placeholder={t.password} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {err&&<div style={{color:"var(--red)",fontSize:12.5}}>{err}</div>}
            <button className="btn btn-gold" style={{width:"100%",justifyContent:"center",padding:12,marginTop:4}} onClick={submit}>
              {m==="login"?t.signIn:t.create_acc}
            </button>
            <div style={{textAlign:"center",color:"var(--mut)",fontSize:12.5,paddingBottom:8}}>
              {m==="login"?t.no_acc:t.have_acc}{" "}
              <span className="gold" style={{cursor:"pointer"}} onClick={()=>setM(m==="login"?"register":"login")}>
                {m==="login"?t.register:t.signIn}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Actor Page ────────────────────────────────────────────────────────────────
function ActorPage({ actorId, onOpen, onBack, t }) {
  const [actor,setActor]=useState(null); const [credits,setCredits]=useState([]); const [loading,setLoading]=useState(true); const [tab,setTab]=useState("movies");
  useEffect(()=>{
    setLoading(true); window.scrollTo(0,0);
    tmdb(`/person/${actorId}`,{append_to_response:"combined_credits"})
      .then(d=>{setActor(d);setCredits((d.combined_credits?.cast||[]).sort((a,b)=>(b.popularity||0)-(a.popularity||0)));setLoading(false);})
      .catch(()=>setLoading(false));
  },[actorId]);
  if(loading)return<div className="sec"><div className="smx"><div className="sk" style={{height:280,borderRadius:12}}/></div></div>;
  if(!actor)return null;
  const movies=credits.filter(c=>c.media_type==="movie").slice(0,40);
  const tv=credits.filter(c=>c.media_type==="tv").slice(0,40);
  const shown=tab==="movies"?movies:tv;
  const profileImg=actor.profile_path?`${IMG}/w342${actor.profile_path}`:`https://placehold.co/140x210/131320/888?text=${actor.name[0]}`;
  return (
    <div className="fi">
      <div className="actor-hero">
        <div className="actor-hero-in">
          <img src={profileImg} alt={actor.name} style={{width:120,borderRadius:10,border:"2px solid var(--brd)",flexShrink:0,display:"block"}}/>
          <div style={{flex:1,minWidth:0}}>
            <button className="btn btn-ghost" style={{marginBottom:12,fontSize:12.5,padding:"6px 12px"}} onClick={onBack}>{t.back}</button>
            <h1 className="cinzel" style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:700,marginBottom:8}}>{actor.name}</h1>
            {actor.birthday&&<div className="mut" style={{marginBottom:8,fontSize:13}}>📅 {t.born}: {actor.birthday}{actor.place_of_birth?` · ${actor.place_of_birth}`:""}</div>}
            {actor.biography&&<p style={{fontSize:13.5,lineHeight:1.75,color:"var(--mut)",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{actor.biography}</p>}
            <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
              <span className="bdg bdg-g">🎬 {movies.length}</span>
              <span className="bdg" style={{background:"var(--bg3)",color:"var(--txt)",border:"1px solid var(--brd)"}}>📺 {tv.length}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="sec"><div className="smx">
        <div style={{display:"flex",gap:7,marginBottom:20,flexWrap:"wrap"}}>
          <button className={`tab${tab==="movies"?" on":""}`} onClick={()=>setTab("movies")}>🎬 {t.movies} ({movies.length})</button>
          <button className={`tab${tab==="tv"?" on":""}`} onClick={()=>setTab("tv")}>📺 {t.tv} ({tv.length})</button>
        </div>
        <h2 className="stitle">{t.actor_films}</h2>
        <div className="mgrid">{shown.map(m=><MovieCard key={`${m.id}-${m.media_type}`} movie={m} onClick={()=>onOpen({...m,media_type:m.media_type})} t={t}/>)}</div>
      </div></div>
    </div>
  );
}

// ── Movie Detail ──────────────────────────────────────────────────────────────
function MovieDetail({ id, mediaType, onBack, user, wl, setWl, setToast, onActorOpen, t, lang }) {
  const [data,setData]=useState(null); const [trailer,setTrailer]=useState(null);
  const [cast,setCast]=useState([]); const [similar,setSimilar]=useState([]);
  const [reviews,setReviews]=useState([]); const [rtxt,setRtxt]=useState(""); const [uRating,setURating]=useState(0);
  const [showTrl,setShowTrl]=useState(false); const [loading,setLoading]=useState(true); const [err,setErr]=useState("");
  const [translation,setTranslation]=useState(null); const [trState,setTrState]=useState("idle");

  useEffect(()=>{
    setLoading(true); setErr(""); setData(null); setCast([]); setSimilar([]); setTrailer(null);
    setTranslation(null); setTrState("idle"); window.scrollTo(0,0);
    const type=mediaType==="tv"?"tv":"movie";
    Promise.all([
      tmdb(`/${type}/${id}`,{append_to_response:"videos,credits"}),
      tmdb(`/${type}/${id}/similar`),
    ]).then(([d,sim])=>{
      setData(d);
      const v=(d.videos?.results||[]).find(x=>x.type==="Trailer"&&x.site==="YouTube")||(d.videos?.results||[]).find(x=>x.site==="YouTube");
      setTrailer(v); setCast(d.credits?.cast?.slice(0,16)||[]); setSimilar((sim.results||[]).slice(0,8));
      setLoading(false);
    }).catch(()=>{setErr(t.failed_load);setLoading(false);});
    setReviews(JSON.parse(localStorage.getItem(`r_${id}`)||"[]"));
  },[id,mediaType]);

  const doTranslate=useCallback(async()=>{
    setTrState("loading");
    const result=await fetchArabic(mediaType,id);
    if(result){setTranslation(result);setTrState("done");}else{setTrState("idle");}
  },[mediaType,id]);

  useEffect(()=>{
    if(lang==="ar"&&data&&trState==="idle"){doTranslate();}
    if(lang==="en"){setTranslation(null);setTrState("idle");}
  },[lang,data]);

  const inWl=wl.some(x=>x.id===id);
  const toggleWl=()=>{
    if(!user)return setToast(t.sign_in_review);
    if(inWl){setWl(w=>w.filter(x=>x.id!==id));setToast("Removed ✓");}
    else{setWl(w=>[...w,{id,title:data.title||data.name,poster:data.poster_path,rating:data.vote_average,mediaType}]);setToast(t.in_wl);}
  };
  const postReview=()=>{
    if(!user)return setToast(t.sign_in_review);
    if(!rtxt.trim())return;
    const r={id:Date.now(),user:user.name,text:rtxt,rating:uRating,date:new Date().toLocaleDateString()};
    const up=[r,...reviews];
    setReviews(up);localStorage.setItem(`r_${id}`,JSON.stringify(up));
    setRtxt("");setURating(0);setToast(t.post_review+" ✓");
  };

  if(loading)return<div style={{padding:"60px var(--pad-x)"}}><div className="sk" style={{height:340,borderRadius:10}}/></div>;
  if(err)return<div style={{padding:"40px var(--pad-x)",maxWidth:700,margin:"0 auto"}}><div className="err-box">{err}</div><button className="btn btn-ghost" onClick={onBack}>{t.back}</button></div>;
  if(!data)return null;

  const genres=data.genres||[];
  const directors=(data.credits?.crew||[]).filter(c=>c.job==="Director");
  const bg=data.backdrop_path?`${IMG}/original${data.backdrop_path}`:"";
  const poster=data.poster_path?`${IMG}/w342${data.poster_path}`:`https://placehold.co/185x278/131320/888?text=?`;
  const displayTitle=data.title||data.name;
  const arabicTitle=translation?.title;
  const displayOverview=(lang==="ar"&&translation?.overview)?translation.overview:data.overview;

  return (
    <div className="fi">
      <div className="dh">
        {bg&&<div className="dbk" style={{backgroundImage:`url(${bg})`}}/>}
        <div className="dov1"/><div className="dov2"/>
        <div className="dc">
          <div className="dposter"><img src={poster} alt={displayTitle}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              {genres.map(g=><span key={g.id} className="tag" style={{fontSize:10}}>{g.name}</span>)}
              <span className="tag" style={{fontSize:10}}>{mediaType==="tv"?"📺":"🎬"}</span>
            </div>
            <h1 className="dtitle">
              {displayTitle}
              {arabicTitle&&(
                <span style={{fontFamily:"'Tajawal',sans-serif",fontSize:"0.55em",color:"var(--gold)",fontWeight:400,marginLeft:10}}>
                  ({arabicTitle})
                </span>
              )}
            </h1>
            <div className="meta">
              <span className="bdg bdg-g">★ {fmt(data.vote_average)}</span>
              <span className="mi2">📅 {yr(data.release_date||data.first_air_date)}</span>
              {data.runtime&&<span className="mi2">⏱ {rt(data.runtime)}</span>}
              {data.number_of_seasons&&<span className="mi2">📺 {data.number_of_seasons}S</span>}
              {directors[0]&&<span className="mi2" style={{display:"none"}}>🎬 {directors[0].name}</span>}
            </div>
            <p className="ov" dir={lang==="ar"&&translation?"rtl":"ltr"}
              style={{fontFamily:lang==="ar"&&translation?"'Tajawal',sans-serif":"inherit"}}>
              {trState==="loading"?<span className="mut">{t.translating}</span>:displayOverview}
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {trailer&&<button className="btn btn-gold" style={{fontSize:13,padding:"8px 14px"}} onClick={()=>setShowTrl(true)}>{t.watch_trailer}</button>}
              <button className={`btn ${inWl?"btn-gold":"btn-out"}`} style={{fontSize:13,padding:"8px 14px"}} onClick={toggleWl}>{inWl?t.in_wl:t.add_wl}</button>
              <button className="btn btn-ghost" style={{fontSize:13,padding:"8px 12px"}} onClick={onBack}>{t.back}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sec"><div className="smx">
        {/* Cast */}
        {cast.length>0&&(
          <div style={{marginBottom:32}}>
            <h2 className="stitle">{t.cast}</h2>
            <div className="hrow">
              {cast.map(p=>(
                <div key={p.id} style={{flex:"0 0 80px",textAlign:"center",cursor:"pointer"}} onClick={()=>onActorOpen(p.id)}>
                  <img className="cast-img"
                    src={p.profile_path?`${IMG}/w185${p.profile_path}`:`https://placehold.co/64x64/131320/888?text=${p.name[0]}`}
                    alt={p.name}/>
                  <div style={{fontSize:11,fontWeight:500,lineHeight:1.3,marginTop:4}}>{p.name}</div>
                  <div className="mut" style={{fontSize:10}}>{p.character?.slice(0,14)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div style={{marginBottom:32}}>
          <h2 className="stitle">{t.reviews}</h2>
          <div className="rcard" style={{marginBottom:14}}>
            <div className="cinzel" style={{fontSize:13,marginBottom:10,color:"var(--gold)"}}>{t.write_review}</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[1,2,3,4,5].map(s=><span key={s} style={{cursor:"pointer",fontSize:22,color:s<=uRating?"var(--gold)":"var(--brd)",transition:"color .15s"}} onClick={()=>setURating(s)}>★</span>)}
            </div>
            <textarea className="txta" placeholder={user?t.share_thoughts:t.sign_in_review} disabled={!user} value={rtxt} onChange={e=>setRtxt(e.target.value)}/>
            <button className="btn btn-gold" style={{marginTop:10,fontSize:13}} onClick={postReview}>{t.post_review}</button>
          </div>
          {reviews.length===0
            ?<div style={{textAlign:"center",padding:28,color:"var(--mut)",fontSize:13.5}}>{t.no_reviews}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
               {reviews.map(r=>(
                 <div key={r.id} className="rcard">
                   <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                     <div className="av">{r.user[0].toUpperCase()}</div>
                     <div style={{flex:1,minWidth:0}}>
                       <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4}}>
                         <span style={{fontWeight:600,fontSize:13}}>{r.user}</span>
                         <span className="mut" style={{fontSize:11}}>{r.date}</span>
                       </div>
                       {r.rating>0&&<div style={{marginBottom:6,color:"var(--gold)",fontSize:12}}>{"★".repeat(r.rating)}</div>}
                       <p style={{fontSize:13,lineHeight:1.65,color:"var(--mut)"}}>{r.text}</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          }
        </div>

        {/* Similar */}
        {similar.length>0&&(
          <div>
            <h2 className="stitle">{t.similar}</h2>
            <div className="mgrid">{similar.map(m=><MovieCard key={m.id} movie={m} onClick={sm=>window.dispatchEvent(new CustomEvent("alsad_open",{detail:{...sm,media_type:mediaType}}))} t={t}/>)}</div>
          </div>
        )}
      </div></div>

      {showTrl&&trailer&&(
        <div className="trl-ov" onClick={()=>setShowTrl(false)}>
          <div style={{width:"min(900px,94vw)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
              <button onClick={()=>setShowTrl(false)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:24,padding:4}}>✕</button>
            </div>
            <div style={{aspectRatio:"16/9",borderRadius:8,overflow:"hidden",border:"1px solid var(--brd)"}}>
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                allow="autoplay;encrypted-media" allowFullScreen style={{border:"none"}}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function HomePage({ onOpen, go, t }) {
  const [trending,setTrending]=useState([]); const [topRated,setTopRated]=useState([]);
  const [upcoming,setUpcoming]=useState([]); const [tv,setTv]=useState([]);
  const [loadErr,setLoadErr]=useState(""); const [ready,setReady]=useState(false);

  useEffect(()=>{
    Promise.all([tmdb("/trending/movie/week"),tmdb("/movie/top_rated"),tmdb("/movie/upcoming"),tmdb("/tv/popular")])
      .then(([tr,top,up,tv2])=>{setTrending(tr.results||MOCK);setTopRated(top.results||[]);setUpcoming(up.results||[]);setTv(tv2.results||[]);setReady(true);})
      .catch(()=>{setTrending(MOCK);setReady(true);setLoadErr(t.failed_load);});
  },[]);

  const genres=Object.entries(t.genres).map(([id,n])=>({id:parseInt(id),n}));

  return (
    <div>
      <Hero movies={trending.slice(0,6)} onOpen={onOpen} go={go} t={t}/>
      {loadErr&&<div style={{padding:"10px var(--pad-x)"}}><div className="smx"><div className="err-box">{loadErr}</div></div></div>}

      {/* Genres */}
      <div className="sec" style={{paddingBottom:16}}><div className="smx">
        <h2 className="stitle">{t.browse_genre}</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {genres.map(g=><span key={g.id} className="gc" onClick={()=>go(`genre_${g.id}_${g.n}`)}>{g.n}</span>)}
        </div>
      </div></div>

      {/* Trending */}
      <div className="sec"><div className="smx">
        <h2 className="stitle">{t.trending}</h2>
        <div className="mgrid">{(ready?trending.slice(0,10):Array(10).fill(null)).map((m,i)=><MovieCard key={i} movie={m} onClick={onOpen} t={t}/>)}</div>
      </div></div>

      {/* Classics — horizontal scroll */}
      <div className="sec" style={{paddingTop:0}}><div className="smx">
        <h2 className="stitle">{t.classics}</h2>
        <div className="hrow">{(ready?topRated.slice(0,14):Array(10).fill(null)).map((m,i)=><div key={i} className="hrow-item"><MovieCard movie={m} onClick={onOpen} t={t}/></div>)}</div>
      </div></div>

      {/* TV */}
      <div className="sec" style={{paddingTop:0}}><div className="smx">
        <h2 className="stitle">{t.popular_tv}</h2>
        <div className="mgrid">{(ready?tv.slice(0,10):Array(10).fill(null)).map((m,i)=><MovieCard key={i} movie={m} onClick={m=>onOpen({...m,media_type:"tv"})} t={t}/>)}</div>
      </div></div>

      {/* Upcoming */}
      <div className="sec" style={{paddingTop:0}}><div className="smx">
        <h2 className="stitle">{t.coming}</h2>
        <div className="mgrid">{(ready?upcoming.slice(0,10):Array(10).fill(null)).map((m,i)=><MovieCard key={i} movie={m} onClick={onOpen} t={t}/>)}</div>
      </div></div>

      <footer style={{padding:"28px var(--pad-x)",borderTop:"1px solid var(--brd)",textAlign:"center"}}>
        <div className="cinzel gold" style={{fontSize:18,letterSpacing:3,marginBottom:6}}>⬡ ALSAD THEATER</div>
        <div className="mut" style={{fontSize:12}}>{t.powered}</div>
      </footer>
    </div>
  );
}

// ── Browse ────────────────────────────────────────────────────────────────────
function BrowsePage({ mediaType, title, onOpen, t }) {
  const [items,setItems]=useState([]); const [pg,setPg]=useState(1); const [flt,setFlt]=useState("popular");
  const [total,setTotal]=useState(1); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const movFlt=[["popular",t.sort_pop],["top_rated",t.sort_rated],["now_playing","Now Playing"],["upcoming",t.coming]];
  const tvFlt=[["popular",t.sort_pop],["top_rated",t.sort_rated],["on_the_air","On Air"],["airing_today","Today"]];
  const filters=mediaType==="movie"?movFlt:tvFlt;
  useEffect(()=>{
    setLoading(true);setErr("");
    tmdb(`/${mediaType}/${flt}`,{page:pg})
      .then(d=>{setItems(d.results||[]);setTotal(d.total_pages||1);setLoading(false);window.scrollTo({top:200,behavior:"smooth"});})
      .catch(()=>{setErr(t.failed_load);setLoading(false);});
  },[flt,pg,mediaType]);
  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{fontSize:"clamp(22px,5vw,30px)",marginBottom:18}}>{title}</h1>
      {err&&<div className="err-box">{err}</div>}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {filters.map(([id,lbl])=><button key={id} className={`tab${flt===id?" on":""}`} onClick={()=>{setFlt(id);setPg(1);}}>{lbl}</button>)}
      </div>
      {loading?<div className="mgrid">{Array(20).fill(null).map((_,i)=><SkCard key={i}/>)}</div>
        :<div className="mgrid fi">{items.map(m=><MovieCard key={m.id} movie={m} onClick={m=>onOpen({...m,media_type:mediaType})} t={t}/>)}</div>}
      <Pagination page={pg} total={total} onChange={p=>setPg(p)}/>
    </div></div>
  );
}

// ── Discover ──────────────────────────────────────────────────────────────────
function DiscoverPage({ onOpen, t }) {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(false);
  const [allGenres,setAllGenres]=useState([]); const [selG,setSelG]=useState([]);
  const [sort,setSort]=useState("popularity.desc"); const [year2,setYear2]=useState(""); const [minR,setMinR]=useState(0);
  const [pg,setPg]=useState(1); const [total,setTotal]=useState(1);
  useEffect(()=>{tmdb("/genre/movie/list").then(d=>setAllGenres(d.genres||[]));},[]);
  const doSearch=useCallback((page=1)=>{
    setLoading(true);
    const p={sort_by:sort,page};
    if(selG.length)p.with_genres=selG.join(",");
    if(year2&&year2.length===4)p.primary_release_year=year2;
    if(minR>0)p["vote_average.gte"]=minR;
    tmdb("/discover/movie",p).then(d=>{setItems(d.results||[]);setTotal(d.total_pages||1);setLoading(false);window.scrollTo({top:200,behavior:"smooth"});});
  },[selG,sort,year2,minR]);
  useEffect(()=>{setPg(1);doSearch(1);},[selG,sort,year2,minR]);
  const tog=id=>setSelG(g=>g.includes(id)?g.filter(x=>x!==id):[...g,id]);
  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{fontSize:"clamp(22px,5vw,30px)",marginBottom:18}}>{t.discover}</h1>
      <div className="filters-panel">
        <div className="mut" style={{fontSize:11,marginBottom:10,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>{t.filters}</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
          {allGenres.map(g=><span key={g.id} className={`gc${selG.includes(g.id)?" on":""}`} onClick={()=>tog(g.id)}>{g.name}</span>)}
        </div>
        <div className="filter-row">
          <div style={{flex:"1 1 140px"}}>
            <div className="mut" style={{fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{t.sort_by}</div>
            <select className="sel" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="popularity.desc">{t.sort_pop}</option>
              <option value="vote_average.desc">{t.sort_rated}</option>
              <option value="release_date.desc">{t.sort_new}</option>
              <option value="revenue.desc">{t.sort_box}</option>
            </select>
          </div>
          <div style={{flex:"0 0 90px"}}>
            <div className="mut" style={{fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{t.year_lbl}</div>
            <input className="inp" placeholder="2024" value={year2} onChange={e=>setYear2(e.target.value)} maxLength={4} style={{width:"100%"}}/>
          </div>
          <div style={{flex:"1 1 140px"}}>
            <div className="mut" style={{fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{t.min_rating}: {minR}+</div>
            <input type="range" min={0} max={9} step={1} value={minR} onChange={e=>setMinR(+e.target.value)} style={{width:"100%",accentColor:"var(--gold)",marginTop:8,display:"block"}}/>
          </div>
        </div>
      </div>
      {loading?<div className="mgrid">{Array(20).fill(null).map((_,i)=><SkCard key={i}/>)}</div>
        :<div className="mgrid fi">{items.map(m=><MovieCard key={m.id} movie={m} onClick={onOpen} t={t}/>)}</div>}
      <Pagination page={pg} total={total} onChange={p=>{setPg(p);doSearch(p);}}/>
    </div></div>
  );
}

// ── Genre ─────────────────────────────────────────────────────────────────────
function GenrePage({ gid, gname, onOpen, t }) {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [pg,setPg]=useState(1); const [total,setTotal]=useState(1);
  useEffect(()=>{
    setLoading(true);
    tmdb("/discover/movie",{with_genres:gid,sort_by:"popularity.desc",page:pg})
      .then(d=>{setItems(d.results||[]);setTotal(d.total_pages||1);setLoading(false);window.scrollTo({top:180,behavior:"smooth"});});
  },[gid,pg]);
  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{fontSize:"clamp(22px,5vw,30px)",marginBottom:18}}>{gname}</h1>
      {loading?<div className="mgrid">{Array(20).fill(null).map((_,i)=><SkCard key={i}/>)}</div>
        :<div className="mgrid fi">{items.map(m=><MovieCard key={m.id} movie={m} onClick={onOpen} t={t}/>)}</div>}
      <Pagination page={pg} total={total} onChange={setPg}/>
    </div></div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ user, wl, setWl, onOpen, go, setUser, t }) {
  return (
    <div className="sec"><div className="smx">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="cinzel" style={{fontSize:14,color:"var(--mut)",marginBottom:3}}>{t.welcome_back}</div>
          <div className="cinzel gold" style={{fontSize:"clamp(24px,6vw,34px)",fontWeight:700}}>{user.name}</div>
        </div>
        <button className="btn btn-ghost" style={{fontSize:13,padding:"8px 14px"}} onClick={()=>{setUser(null);localStorage.removeItem("alsad_user");go("home");}}>{t.sign_out}</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:28}}>
        {[["📽",t.watchlist,wl.length],["✍",t.reviews_written,Object.keys(localStorage).filter(k=>k.startsWith("r_")).length],["🎬",t.member_since,"2025"]].map(([ic,lb,vl])=>(
          <div key={lb} style={{background:"var(--card)",border:"1px solid var(--brd)",borderRadius:10,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
            <div className="gold" style={{fontSize:22,fontWeight:700}}>{vl}</div>
            <div className="mut" style={{fontSize:11,marginTop:2}}>{lb}</div>
          </div>
        ))}
      </div>

      <h2 className="stitle">{t.my_watchlist}</h2>
      {wl.length===0
        ?<div style={{textAlign:"center",padding:48}}>
           <div style={{fontSize:40,marginBottom:12}}>🎞</div>
           <div className="cinzel" style={{fontSize:16,marginBottom:8}}>{t.empty_wl}</div>
           <button className="btn btn-gold" style={{marginTop:8}} onClick={()=>go("movies")}>{t.browse_movies}</button>
         </div>
        :<div className="mgrid">
           {wl.map(m=>(
             <div key={m.id} style={{position:"relative"}}>
               <MovieCard movie={{id:m.id,title:m.title,poster_path:m.poster,vote_average:m.rating,release_date:""}}
                 onClick={()=>onOpen({id:m.id,title:m.title,poster_path:m.poster,media_type:m.mediaType||"movie"})} t={t}/>
               <button onClick={()=>setWl(w=>w.filter(x=>x.id!==m.id))}
                 style={{position:"absolute",top:6,left:6,background:"rgba(0,0,0,.8)",border:"none",borderRadius:4,color:"var(--red)",cursor:"pointer",padding:"2px 7px",fontSize:13,lineHeight:1.5}}>✕</button>
             </div>
           ))}
         </div>
      }
    </div></div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("home");
  const [movie,setMovie]=useState(null); const [mType,setMType]=useState("movie");
  const [actor,setActor]=useState(null);
  const [user,setUser]=useState(null); const [authMode,setAuthMode]=useState(null);
  const [showSearch,setShowSearch]=useState(false);
  const [wl,setWl]=useState([]);
  const [toast,setToast]=useState(null);
  const [lang,setLang]=useState("en");
  const t=T[lang];

  useEffect(()=>{
    try{
      const wu=localStorage.getItem("alsad_user");if(wu)setUser(JSON.parse(wu));
      const ww=localStorage.getItem("alsad_wl");if(ww)setWl(JSON.parse(ww));
      const lg=localStorage.getItem("alsad_lang");if(lg)setLang(lg);
    }catch{}
  },[]);

  useEffect(()=>{
    document.body.dir=t.dir;
    try{localStorage.setItem("alsad_wl",JSON.stringify(wl));}catch{}
  },[lang,wl,t.dir]);

  const toggleLang=()=>{const n=lang==="en"?"ar":"en";setLang(n);localStorage.setItem("alsad_lang",n);};

  const openMovie=useCallback((m)=>{
    const mt=m.media_type==="tv"?"tv":"movie";
    setMovie(m.id||m);setMType(mt);setActor(null);setPage("detail");window.scrollTo(0,0);
  },[]);

  const openActor=useCallback((id)=>{setActor(id);setPage("actor");window.scrollTo(0,0);},[]);

  useEffect(()=>{
    const h=e=>openMovie(e.detail);
    window.addEventListener("alsad_open",h);
    return()=>window.removeEventListener("alsad_open",h);
  },[openMovie]);

  const doLogin=(u)=>{setUser(u);localStorage.setItem("alsad_user",JSON.stringify(u));setToast(lang==="ar"?`أهلاً، ${u.name}!`:`Welcome, ${u.name}!`);};

  let gid=null,gname=null;
  if(page.startsWith("genre_")){const p=page.split("_");gid=p[1];gname=p.slice(2).join(" ");}

  return (
    <>
      <style>{CSS}</style>
      <Nav page={page} go={setPage} user={user} openAuth={setAuthMode} openSearch={()=>setShowSearch(true)} wl={wl} lang={lang} toggleLang={toggleLang} t={t}/>
      <main style={{width:"100%",overflowX:"hidden"}}>
        {page==="home"&&<HomePage onOpen={openMovie} go={setPage} t={t}/>}
        {page==="movies"&&<BrowsePage mediaType="movie" title={t.movies} onOpen={openMovie} t={t}/>}
        {page==="tv"&&<BrowsePage mediaType="tv" title={t.tv} onOpen={openMovie} t={t}/>}
        {page==="discover"&&<DiscoverPage onOpen={openMovie} t={t}/>}
        {page==="detail"&&movie&&<MovieDetail id={movie} mediaType={mType} onBack={()=>setPage("home")} user={user} wl={wl} setWl={setWl} setToast={setToast} onActorOpen={openActor} t={t} lang={lang}/>}
        {page==="actor"&&actor&&<ActorPage actorId={actor} onOpen={openMovie} onBack={()=>setPage("home")} t={t}/>}
        {page==="dash"&&user&&<Dashboard user={user} wl={wl} setWl={setWl} onOpen={openMovie} go={setPage} setUser={setUser} t={t}/>}
        {gid&&<GenrePage gid={gid} gname={gname} onOpen={openMovie} t={t}/>}
      </main>
      {authMode&&<AuthModal mode={authMode} onClose={()=>setAuthMode(null)} onLogin={doLogin} t={t}/>}
      {showSearch&&<SearchModal onClose={()=>setShowSearch(false)} onOpen={openMovie} onActorOpen={(id)=>{openActor(id);setShowSearch(false);}} t={t}/>}
      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
    </>
  );
}
import { useState, useEffect, useCallback, useRef } from "react";

const TMDB_KEY = "20dd09adbf02a4a795efed497b592817";
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

async function tmdb(path, params = {}) {
  const q = new URLSearchParams({ api_key: TMDB_KEY, language: "en-US", ...params });
  const r = await fetch(`${BASE}${path}?${q}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

// Fetch Arabic title + overview directly from TMDB (language=ar)
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
  } catch {
    return null;
  }
}


const fmt = (n) => (typeof n === "number" ? n.toFixed(1) : "N/A");
const yr = (d) => d?.slice(0, 4) ?? "";
const rt = (m) => m ? `${Math.floor(m / 60)}h ${m % 60}m` : "";

// ── UI Strings (EN / AR for chrome, not for film content) ────────────────────
const T = {
  en: {
    dir: "ltr", home: "Home", movies: "Movies", tv: "TV Shows", discover: "Discover",
    signIn: "Sign In", search: "Search", watchlist: "Watchlist",
    trending: "Trending This Week", classics: "All-Time Classics", popular_tv: "Popular TV Shows",
    coming: "Coming Soon", browse_genre: "Browse by Genre",
    explore: "Explore All", view_details: "▶ View Details",
    watch_trailer: "▶ Watch Trailer", add_wl: "+ Watchlist", in_wl: "✦ In Watchlist",
    back: "← Back", cast: "Cast", reviews: "Reviews", write_review: "Write a Review",
    post_review: "Post Review", no_reviews: "No reviews yet — be the first!",
    similar: "You May Also Like",
    sign_in_review: "Sign in to write a review", share_thoughts: "Share your thoughts…",
    welcome_back: "Welcome back,", my_watchlist: "My Watchlist", ai_assistant: "AI Assistant",
    send: "Send", empty_wl: "Watchlist is empty", browse_movies: "Browse Movies",
    sign_out: "Sign Out", register: "Register", create_acc: "Create Account",
    email: "Email address", password: "Password", your_name: "Your name",
    no_acc: "No account?", have_acc: "Have an account?", actor_films: "Known For",
    born: "Born", arabic: "ع", translate_btn: "ع Translate", translating: "Translating…", translated: "Translated ✓",
    genres: { 28:"Action",35:"Comedy",18:"Drama",27:"Horror",878:"Sci-Fi",10749:"Romance",53:"Thriller",16:"Animation",12:"Adventure",99:"Documentary" },
    sort_pop: "Most Popular", sort_rated: "Highest Rated", sort_new: "Newest", sort_box: "Box Office",
    sort_by: "Sort", min_rating: "Min Rating", year_lbl: "Year", filters: "Filters",
    member_since: "Member Since", reviews_written: "Reviews Written",
    powered: "Powered by TMDB · Claude AI · Built for cinema lovers",
    search_placeholder: "Search movies, TV shows, actors…", searching: "Searching…",
    failed_load: "Failed to load. Check your connection.",
  },
  ar: {
    dir: "rtl", home: "الرئيسية", movies: "أفلام", tv: "مسلسلات", discover: "اكتشاف",
    signIn: "تسجيل الدخول", search: "بحث", watchlist: "قائمة المشاهدة",
    trending: "الأكثر رواجاً هذا الأسبوع", classics: "روائع كل الأزمان", popular_tv: "المسلسلات الأكثر شعبية",
    coming: "قريباً", browse_genre: "تصفح حسب النوع",
    explore: "استكشاف الكل", view_details: "▶ عرض التفاصيل",
    watch_trailer: "▶ مشاهدة الإعلان", add_wl: "+ أضف للقائمة", in_wl: "✦ في القائمة",
    back: "رجوع ←", cast: "طاقم التمثيل", reviews: "المراجعات", write_review: "اكتب مراجعة",
    post_review: "نشر المراجعة", no_reviews: "لا توجد مراجعات بعد — كن الأول!",
    similar: "قد يعجبك أيضاً",
    sign_in_review: "سجّل دخولك لكتابة مراجعة", share_thoughts: "شاركنا رأيك…",
    welcome_back: "مرحباً،", my_watchlist: "قائمة مشاهدتي", ai_assistant: "المساعد الذكي",
    send: "إرسال", empty_wl: "قائمة المشاهدة فارغة", browse_movies: "تصفح الأفلام",
    sign_out: "تسجيل الخروج", register: "إنشاء حساب", create_acc: "إنشاء حساب",
    email: "البريد الإلكتروني", password: "كلمة المرور", your_name: "اسمك",
    no_acc: "ليس لديك حساب؟", have_acc: "لديك حساب؟", actor_films: "أبرز الأعمال",
    born: "تاريخ الميلاد", arabic: "EN", translate_btn: "ترجمة", translating: "جارٍ الترجمة…", translated: "تمت الترجمة ✓",
    genres: { 28:"أكشن",35:"كوميديا",18:"دراما",27:"رعب",878:"خيال علمي",10749:"رومانسي",53:"إثارة",16:"رسوم متحركة",12:"مغامرة",99:"وثائقي" },
    sort_pop: "الأكثر شعبية", sort_rated: "الأعلى تقييماً", sort_new: "الأحدث", sort_box: "شباك التذاكر",
    sort_by: "ترتيب", min_rating: "أقل تقييم", year_lbl: "السنة", filters: "الفلاتر",
    member_since: "عضو منذ", reviews_written: "المراجعات المكتوبة",
    powered: "مدعوم بواسطة TMDB · Claude AI · لمحبّي السينما",
    search_placeholder: "ابحث عن فيلم أو مسلسل أو ممثل…", searching: "جارٍ البحث…",
    failed_load: "فشل التحميل. تحقق من اتصالك.",
  }
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Outfit:wght@300;400;500;600&family=Tajawal:wght@300;400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#09090E;--bg2:#0F0F18;--bg3:#181825;
  --card:#131320;--brd:#252535;--txt:#E2E2F0;--mut:#8888AA;
  --nav-bg:rgba(9,9,14,.93);--input-bg:#181825;
  --hero-ov1:rgba(9,9,14,.96);--hero-ov2:rgba(9,9,14,1);
  --detail-ov:rgba(9,9,14,.98);--sk1:#181825;--sk2:#0F0F18;
  --gold:#C9A84C;--gold2:#E8C96A;--red:#E53E3E;
}
html,body{width:100%;min-width:100%;margin:0;padding:0;overflow-x:hidden}
html{scroll-behavior:smooth;box-sizing:border-box}
body{background:var(--bg);color:var(--txt);font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden;width:100vw}
#root,main{width:100%;max-width:100%;min-height:100vh;margin:0;padding:0;box-sizing:border-box;overflow-x:hidden}
body[dir=rtl]{font-family:'Tajawal',sans-serif}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px}
.cinzel{font-family:'Cinzel',serif}
body[dir=rtl] .cinzel{font-family:'Tajawal',sans-serif;font-weight:700}
.gold{color:var(--gold)} .mut{color:var(--mut)}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:7px;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;transition:all .2s}
.btn-gold{background:var(--gold);color:#09090E}
.btn-gold:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,168,76,.35)}
.btn-gold:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-out{background:transparent;color:var(--gold);border:1px solid var(--gold)}
.btn-out:hover{background:rgba(201,168,76,.1)}
.btn-ghost{background:rgba(255,255,255,.05);color:var(--txt);border:1px solid var(--brd)}
.btn-ghost:hover{background:rgba(255,255,255,.1)}
.card{background:var(--card);border:1px solid var(--brd);border-radius:10px;overflow:hidden;transition:all .3s;cursor:pointer}
.card:hover{border-color:rgba(201,168,76,.5);transform:translateY(-5px);box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 0 1px rgba(201,168,76,.15)}
.tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;background:rgba(201,168,76,.12);color:var(--gold);border:1px solid rgba(201,168,76,.28)}
.inp{width:100%;padding:10px 16px;background:var(--input-bg);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:14px;outline:none;transition:border .2s}
.inp:focus{border-color:var(--gold)}
.txta{width:100%;padding:12px 16px;background:var(--input-bg);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:14px;outline:none;resize:vertical;min-height:96px;transition:border .2s}
.txta:focus{border-color:var(--gold)}
.sel{padding:10px 14px;background:var(--input-bg);border:1px solid var(--brd);border-radius:8px;color:var(--txt);font-family:inherit;font-size:13.5px;outline:none;cursor:pointer}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:900;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
.modal{background:var(--bg2);border:1px solid var(--brd);border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
.sk{background:linear-gradient(90deg,var(--sk1) 25%,var(--sk2) 50%,var(--sk1) 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:6px}
@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.fi{animation:fi .4s ease}
@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.nav{position:sticky;top:0;z-index:500;background:var(--nav-bg);backdrop-filter:blur(18px);border-bottom:1px solid var(--brd)}
.nav-in{display:flex;align-items:center;gap:14px;height:62px;padding:0 4%;max-width:1440px;margin:0 auto}
.nav-logo{font-family:'Cinzel',serif;font-size:19px;font-weight:700;color:var(--gold);letter-spacing:3px;cursor:pointer;user-select:none;white-space:nowrap}
.nav-lnk{padding:5px 12px;border-radius:6px;color:var(--mut);font-size:13px;cursor:pointer;transition:all .2s;white-space:nowrap;border:none;background:none;font-family:inherit}
.nav-lnk:hover{color:var(--txt);background:rgba(255,255,255,.05)}
.nav-lnk.on{color:var(--gold);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.15)}
.hero{position:relative;height:90vh;min-height:540px;display:flex;align-items:flex-end;padding:0 5% 7%}
.hbg{position:absolute;inset:0;background-size:cover;background-position:center top}
.hov1{position:absolute;inset:0;background:linear-gradient(105deg,var(--hero-ov1) 28%,rgba(9,9,14,.55) 65%,transparent)}
.hov2{position:absolute;inset:0;background:linear-gradient(to top,var(--hero-ov2) 0%,transparent 55%)}
.htxt{position:relative;z-index:1;max-width:660px}
.htitle{font-family:'Cinzel',serif;font-size:clamp(24px,4vw,52px);font-weight:700;line-height:1.1;margin-bottom:14px;text-shadow:0 2px 24px rgba(0,0,0,.7)}
body[dir=rtl] .htitle{font-family:'Tajawal',sans-serif}
.sec{padding:44px 5%}
.smx{max-width:1440px;margin:0 auto}
.stitle{font-family:'Cinzel',serif;font-size:20px;font-weight:600;margin-bottom:22px;display:flex;align-items:center;gap:10px}
body[dir=rtl] .stitle{font-family:'Tajawal',sans-serif}
.stitle::before{content:'';display:block;width:3px;height:20px;background:var(--gold);border-radius:2px;flex-shrink:0}
.g5{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:14px}
.row{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px}
.row::-webkit-scrollbar{height:3px}
.ri{flex:0 0 172px}
.poster{width:100%;aspect-ratio:2/3;object-fit:cover;background:var(--bg3);display:block}
.minfo{padding:11px}
.mtitle{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
.bdg{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:4px;font-size:11px;font-weight:600}
.bdg-g{background:var(--gold);color:#09090E}
.bdg-d{background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.12)}
.dh{position:relative;min-height:500px;display:flex;align-items:flex-end;padding:0 5% 5%}
.dbk{position:absolute;inset:0;background-size:cover;background-position:top center}
.dov1{position:absolute;inset:0;background:linear-gradient(105deg,var(--detail-ov) 34%,rgba(9,9,14,.6) 65%,rgba(9,9,14,.25))}
.dov2{position:absolute;inset:0;background:linear-gradient(to top,var(--bg) 0%,transparent 60%)}
.dc{position:relative;z-index:1;display:flex;gap:30px;align-items:flex-start;max-width:1440px;margin:0 auto;width:100%}
.dposter{width:185px;flex-shrink:0;border-radius:10px;overflow:hidden;border:2px solid var(--brd);box-shadow:0 0 40px rgba(201,168,76,.15)}
.dposter img{width:100%;display:block}
.dtitle{font-family:'Cinzel',serif;font-size:clamp(20px,3.5vw,42px);font-weight:700;margin-bottom:12px}
body[dir=rtl] .dtitle{font-family:'Tajawal',sans-serif}
.meta{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:12px}
.mi2{display:flex;align-items:center;gap:5px;font-size:13.5px;color:var(--mut)}
.ov{font-size:14.5px;line-height:1.75;color:var(--mut);max-width:640px;margin-bottom:18px}
.rcard{background:var(--card);border:1px solid var(--brd);border-radius:10px;padding:18px}
.av{width:38px;height:38px;border-radius:50%;background:var(--gold);color:#09090E;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.gc{padding:7px 16px;border-radius:24px;font-size:13px;font-weight:500;background:var(--bg3);border:1px solid var(--brd);cursor:pointer;transition:all .2s;color:var(--mut);font-family:inherit}
.gc:hover,.gc.on{background:rgba(201,168,76,.1);border-color:var(--gold);color:var(--gold)}
.tab{padding:7px 18px;border-radius:6px;cursor:pointer;font-size:13.5px;font-weight:500;transition:all .2s;color:var(--mut);border:none;background:transparent;font-family:inherit}
.tab.on{background:rgba(201,168,76,.1);color:var(--gold);border:1px solid rgba(201,168,76,.22)}
.srch-dd{position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;overflow:hidden;z-index:200;margin-top:4px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.si{display:flex;gap:11px;align-items:center;padding:10px 14px;cursor:pointer;transition:background .15s}
.si:hover{background:var(--bg3)}
.toast{position:fixed;bottom:22px;right:22px;z-index:2000;background:var(--card);border:1px solid rgba(201,168,76,.4);border-radius:8px;padding:11px 20px;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:fi .3s ease;pointer-events:none}
body[dir=rtl] .toast{right:auto;left:22px}
.trl-ov{position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:2000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px}
.cast-img{width:76px;height:76px;border-radius:50%;object-fit:cover;border:2px solid var(--brd);margin:0 auto 7px;display:block}
.err-box{background:rgba(229,62,62,.08);border:1px solid rgba(229,62,62,.25);border-radius:8px;padding:16px;color:#E08080;font-size:13.5px;margin-bottom:16px}
.actor-hero{background:linear-gradient(135deg,var(--bg2),var(--bg3));padding:40px 5%;border-bottom:1px solid var(--brd)}
.pagination{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:36px;flex-wrap:wrap}
.pg-btn{min-width:36px;height:36px;border-radius:7px;border:1px solid var(--brd);background:var(--card);color:var(--txt);cursor:pointer;font-size:13px;font-family:inherit;transition:all .2s;display:flex;align-items:center;justify-content:center;padding:0 10px}
.pg-btn:hover{border-color:var(--gold);color:var(--gold)}
.pg-btn.on{background:var(--gold);color:#09090E;border-color:var(--gold);font-weight:700}
.pg-btn:disabled{opacity:.3;cursor:not-allowed}
.tr-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-family:'Tajawal',sans-serif;background:rgba(201,168,76,.1);color:var(--gold);border:1px solid rgba(201,168,76,.3);margin-right:8px}
.tr-box{background:linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.01));border:1px solid rgba(201,168,76,.18);border-radius:10px;padding:16px 20px;margin-top:14px}
@media(max-width:760px){
  .hero{height:72vh;padding:0 4% 10%}
  .dc{flex-direction:column}
  .dposter{width:130px}
  .g5{grid-template-columns:repeat(auto-fill,minmax(138px,1fr))}
  .nav-lnks{display:none}
}
`;

const MOCK = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: ["The Godfather","Blade Runner 2049","Dune","Oppenheimer","Parasite","Interstellar","The Dark Knight","Inception","1917","Arrival","Tenet","Mad Max","Her","Ex Machina","Midsommar","Hereditary","The Lighthouse","Annihilation","A Ghost Story","Everything Everywhere"][i],
  vote_average: 7 + Math.random() * 2.5,
  release_date: `${2018 + (i % 6)}-0${(i % 9) + 1}-15`,
  poster_path: null, backdrop_path: null, overview: "A masterpiece of modern cinema.",
}));

// ── Small components ──────────────────────────────────────────────────────────
function SkCard() {
  return (
    <div className="card">
      <div className="sk" style={{ width: "100%", paddingTop: "150%", position: "relative" }} />
      <div style={{ padding: 11 }}>
        <div className="sk" style={{ height: 13, width: "72%", marginBottom: 7 }} />
        <div className="sk" style={{ height: 10, width: "44%" }} />
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
  let start = Math.max(1, page - 2), end = Math.min(pages, page + 2);
  if (page <= 3) end = Math.min(5, pages);
  if (page >= pages - 2) start = Math.max(1, pages - 4);
  for (let i = start; i <= end; i++) nums.push(i);
  return (
    <div className="pagination">
      <button className="pg-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {start > 1 && <><button className="pg-btn" onClick={() => onChange(1)}>1</button>{start > 2 && <span className="mut" style={{ padding: "0 4px" }}>…</span>}</>}
      {nums.map(n => <button key={n} className={`pg-btn${page === n ? " on" : ""}`} onClick={() => onChange(n)}>{n}</button>)}
      {end < pages && <><span className="mut" style={{ padding: "0 4px" }}>…</span><button className="pg-btn" onClick={() => onChange(pages)}>{pages}</button></>}
      <button className="pg-btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ movie, onClick, t }) {
  const [hov, setHov] = useState(false);
  if (!movie) return <SkCard />;
  const poster = movie.poster_path
    ? `${IMG}/w342${movie.poster_path}`
    : `https://placehold.co/200x300/131320/888888?text=${encodeURIComponent((movie.title || movie.name || "?").slice(0, 10))}`;
  return (
    <div className="card fi" onClick={() => onClick(movie)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img className="poster" src={poster} alt={movie.title || movie.name} loading="lazy"
          style={{ transform: hov ? "scale(1.05)" : "scale(1)", transition: "transform .45s" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.88) 0%,transparent 55%)", opacity: hov ? 1 : 0, transition: "opacity .3s" }}>
          <div style={{ position: "absolute", bottom: 9, left: 9 }}><span className="tag">{t?.view_details || "▶ Details"}</span></div>
        </div>
        <div style={{ position: "absolute", top: 7, right: 7 }}>
          <span className="bdg bdg-g" style={{ fontSize: 10 }}>★ {fmt(movie.vote_average)}</span>
        </div>
      </div>
      <div className="minfo">
        <div className="mtitle">{movie.title || movie.name}</div>
        <div className="mut" style={{ fontSize: 11 }}>{yr(movie.release_date || movie.first_air_date)}</div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ page, go, user, openAuth, openSearch, wl, lang, toggleLang, t }) {
  return (
    <nav className="nav">
      <div className="nav-in">
        <div className="nav-logo" onClick={() => go("home")}>⬡ ALSAD</div>
        <div className="nav-lnks" style={{ display: "flex", gap: 2, flex: 1 }}>
          {[["home", t.home], ["movies", t.movies], ["tv", t.tv], ["discover", t.discover]].map(([id, lbl]) => (
            <button key={id} className={`nav-lnk${page === id || page.startsWith(id) ? " on" : ""}`} onClick={() => go(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", marginLeft: "auto", flexWrap: "nowrap" }}>
          <button className="btn btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={openSearch}>🔍 {t.search}</button>
          <button className="btn btn-ghost" style={{ padding: "6px 11px", fontSize: 13, fontWeight: 700 }} onClick={toggleLang} title="Toggle Arabic/English">{t.arabic}</button>
          {user
            ? <button className="btn btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => go("dash")}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--gold)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#09090E", fontWeight: 700 }}>{user.name[0].toUpperCase()}</span>
                {user.name}{wl.length > 0 && <span className="bdg bdg-g" style={{ fontSize: 10, padding: "1px 5px" }}>{wl.length}</span>}
              </button>
            : <button className="btn btn-gold" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => openAuth("login")}>{t.signIn}</button>
          }
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ movies, onOpen, go, t }) {
  const [idx, setIdx] = useState(0);
  const cur = movies[idx];
  useEffect(() => {
    if (!movies.length) return;
    const ti = setInterval(() => setIdx(i => (i + 1) % Math.min(movies.length, 6)), 6000);
    return () => clearInterval(ti);
  }, [movies.length]);
  if (!cur) return <div style={{ height: "90vh", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="cinzel gold" style={{ fontSize: 22, letterSpacing: 4 }}>⬡ ALSAD</span></div>;
  const bg = cur.backdrop_path ? `${IMG}/original${cur.backdrop_path}` : "";
  return (
    <section className="hero">
      {bg && <div className="hbg" style={{ backgroundImage: `url(${bg})` }} />}
      <div className="hov1" /><div className="hov2" />
      <div className="htxt fi" key={idx}>
        <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
          <span className="bdg bdg-g">★ {fmt(cur.vote_average)}</span>
          <span className="bdg bdg-d">{yr(cur.release_date)}</span>
          <span className="bdg bdg-d">Trending</span>
        </div>
        <h1 className="htitle">{cur.title}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--mut)", maxWidth: 520, marginBottom: 26 }}>{cur.overview?.slice(0, 180)}…</p>
        <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={() => onOpen(cur)}>{t.view_details}</button>
          <button className="btn btn-out" onClick={() => go("movies")}>{t.explore}</button>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 28 }}>
          {movies.slice(0, 6).map((_, i) => (
            <div key={i} onClick={() => setIdx(i)}
              style={{ width: i === idx ? 26 : 7, height: 4, borderRadius: 2, background: i === idx ? "var(--gold)" : "rgba(255,255,255,.2)", cursor: "pointer", transition: "all .4s" }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function SearchModal({ onClose, onOpen, onActorOpen, t }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState([]); const [loading, setLoading] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const ti = setTimeout(async () => {
      setLoading(true);
      try { const d = await tmdb("/search/multi", { query: q }); setRes((d.results || []).slice(0, 10)); } catch {}
      setLoading(false);
    }, 380);
    return () => clearTimeout(ti);
  }, [q]);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <div style={{ width: "min(620px,92vw)", position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <input ref={ref} className="inp" value={q} onChange={e => setQ(e.target.value)}
            placeholder={t.search_placeholder} style={{ fontSize: 16, padding: "14px 48px 14px 20px", borderRadius: 10 }} />
          <button onClick={onClose} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--mut)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {res.length > 0 && (
          <div className="srch-dd">
            {res.map(m => (
              <div key={m.id} className="si" onClick={() => { m.media_type === "person" ? onActorOpen(m.id) : onOpen(m); onClose(); }}>
                <img src={(m.poster_path || m.profile_path) ? `${IMG}/w92${m.poster_path || m.profile_path}` : `https://placehold.co/36x52/131320/888888?text=?`}
                  style={{ width: 34, height: 50, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} alt="" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.title || m.name}</div>
                  <div className="mut" style={{ fontSize: 11.5 }}>
                    {m.media_type === "person" ? "👤 Actor" : m.media_type === "tv" ? "📺 TV Show" : "🎬 Movie"}
                    {m.vote_average ? ` · ★ ${fmt(m.vote_average)}` : ""} {yr(m.release_date || m.first_air_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--mut)", fontSize: 13.5 }}>{t.searching}</div>}
      </div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onLogin, t }) {
  const [m, setM] = useState(mode); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState("");
  const submit = () => {
    if (!email || !pass) return setErr("Please fill all fields.");
    if (m === "register" && !name) return setErr("Name is required.");
    onLogin({ name: name || email.split("@")[0], email }); onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 className="cinzel" style={{ fontSize: 20 }}>{m === "login" ? t.welcome_back : "Join Alsad"}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--mut)", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 24 }}>
            <button className={`tab${m === "login" ? " on" : ""}`} onClick={() => setM("login")}>{t.signIn}</button>
            <button className={`tab${m === "register" ? " on" : ""}`} onClick={() => setM("register")}>{t.register}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {m === "register" && <input className="inp" placeholder={t.your_name} value={name} onChange={e => setName(e.target.value)} />}
            <input className="inp" placeholder={t.email} type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="inp" placeholder={t.password} type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            {err && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{err}</div>}
            <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 11 }} onClick={submit}>
              {m === "login" ? t.signIn : t.create_acc}
            </button>
            <div style={{ textAlign: "center", color: "var(--mut)", fontSize: 12.5 }}>
              {m === "login" ? t.no_acc : t.have_acc}{" "}
              <span className="gold" style={{ cursor: "pointer" }} onClick={() => setM(m === "login" ? "register" : "login")}>
                {m === "login" ? t.register : t.signIn}
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
  const [actor, setActor] = useState(null); const [credits, setCredits] = useState([]); const [loading, setLoading] = useState(true); const [tab, setTab] = useState("movies");
  useEffect(() => {
    setLoading(true); window.scrollTo(0, 0);
    tmdb(`/person/${actorId}`, { append_to_response: "combined_credits" })
      .then(d => { setActor(d); setCredits((d.combined_credits?.cast || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))); setLoading(false); })
      .catch(() => setLoading(false));
  }, [actorId]);
  if (loading) return <div className="sec"><div className="smx"><div className="sk" style={{ height: 300, borderRadius: 12 }} /></div></div>;
  if (!actor) return null;
  const movies = credits.filter(c => c.media_type === "movie").slice(0, 40);
  const tv = credits.filter(c => c.media_type === "tv").slice(0, 40);
  const shown = tab === "movies" ? movies : tv;
  const profileImg = actor.profile_path ? `${IMG}/w342${actor.profile_path}` : `https://placehold.co/200x300/131320/888888?text=${actor.name[0]}`;
  return (
    <div className="fi">
      <div className="actor-hero">
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img src={profileImg} alt={actor.name} style={{ width: 200, borderRadius: 12, border: "2px solid var(--brd)", flexShrink: 0, display: "block" }} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <button className="btn btn-ghost" style={{ marginBottom: 16, fontSize: 12.5 }} onClick={onBack}>{t.back}</button>
            <h1 className="cinzel" style={{ fontSize: 34, fontWeight: 700, marginBottom: 10 }}>{actor.name}</h1>
            {actor.birthday && <div className="mut" style={{ marginBottom: 10, fontSize: 14 }}>📅 {t.born}: {actor.birthday}{actor.place_of_birth ? ` · ${actor.place_of_birth}` : ""}</div>}
            {actor.biography && <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--mut)", maxWidth: 680 }}>{actor.biography.slice(0, 500)}{actor.biography.length > 500 ? "…" : ""}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <span className="bdg bdg-g">🎬 {movies.length} Movies</span>
              <span className="bdg" style={{ background: "var(--bg3)", color: "var(--txt)", border: "1px solid var(--brd)" }}>📺 {tv.length} TV Shows</span>
            </div>
          </div>
        </div>
      </div>
      <div className="sec">
        <div className="smx">
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button className={`tab${tab === "movies" ? " on" : ""}`} onClick={() => setTab("movies")}>🎬 {t.movies} ({movies.length})</button>
            <button className={`tab${tab === "tv" ? " on" : ""}`} onClick={() => setTab("tv")}>📺 {t.tv} ({tv.length})</button>
          </div>
          <h2 className="stitle">{t.actor_films}</h2>
          <div className="g5">{shown.map(m => <MovieCard key={`${m.id}-${m.media_type}`} movie={m} onClick={() => onOpen({ ...m, media_type: m.media_type })} t={t} />)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Movie Detail ──────────────────────────────────────────────────────────────
function MovieDetail({ id, mediaType, onBack, user, wl, setWl, setToast, onActorOpen, t, lang }) {
  const [data, setData] = useState(null); const [trailer, setTrailer] = useState(null);
  const [cast, setCast] = useState([]); const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState([]); const [rtxt, setRtxt] = useState(""); const [uRating, setURating] = useState(0);
  const [showTrl, setShowTrl] = useState(false); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  // Translation state – only for the *currently open* film
  const [translation, setTranslation] = useState(null); // { title, overview }
  const [trState, setTrState] = useState("idle"); // idle | loading | done

  useEffect(() => {
    setLoading(true); setErr(""); setData(null); setCast([]); setSimilar([]); setTrailer(null);
    setTranslation(null); setTrState("idle");
    window.scrollTo(0, 0);
    const type = mediaType === "tv" ? "tv" : "movie";
    Promise.all([
      tmdb(`/${type}/${id}`, { append_to_response: "videos,credits" }),
      tmdb(`/${type}/${id}/similar`),
    ]).then(([d, sim]) => {
      setData(d);
      const v = (d.videos?.results || []).find(x => x.type === "Trailer" && x.site === "YouTube")
             || (d.videos?.results || []).find(x => x.site === "YouTube");
      setTrailer(v);
      setCast(d.credits?.cast?.slice(0, 16) || []);
      setSimilar((sim.results || []).slice(0, 8));
      setLoading(false);
    }).catch(e => { setErr(t.failed_load); setLoading(false); });
    setReviews(JSON.parse(localStorage.getItem(`r_${id}`) || "[]"));
  }, [id, mediaType]);

  const doTranslate = useCallback(async () => {
    setTrState("loading");
    const result = await fetchArabic(mediaType, id);
    if (result) { setTranslation(result); setTrState("done"); }
    else { setTrState("idle"); }
  }, [mediaType, id]);

  // Auto-translate when lang switches to AR and data is loaded
  useEffect(() => {
    if (lang === "ar" && data && trState === "idle") { doTranslate(); }
    if (lang === "en") { setTranslation(null); setTrState("idle"); }
  }, [lang, data]);

  const inWl = wl.some(x => x.id === id);
  const toggleWl = () => {
    if (!user) return setToast(t.sign_in_review);
    if (inWl) { setWl(w => w.filter(x => x.id !== id)); setToast("Removed ✓"); }
    else { setWl(w => [...w, { id, title: data.title || data.name, poster: data.poster_path, rating: data.vote_average, mediaType }]); setToast(t.in_wl); }
  };

  const postReview = () => {
    if (!user) return setToast(t.sign_in_review);
    if (!rtxt.trim()) return;
    const r = { id: Date.now(), user: user.name, text: rtxt, rating: uRating, date: new Date().toLocaleDateString() };
    const up = [r, ...reviews];
    setReviews(up); localStorage.setItem(`r_${id}`, JSON.stringify(up));
    setRtxt(""); setURating(0); setToast(t.post_review + " ✓");
  };

  if (loading) return <div style={{ padding: "80px 5%" }}><div className="sk" style={{ height: 420, borderRadius: 10 }} /></div>;
  if (err) return <div style={{ padding: "60px 5%", maxWidth: 700, margin: "0 auto" }}><div className="err-box">{err}</div><button className="btn btn-ghost" onClick={onBack}>{t.back}</button></div>;
  if (!data) return null;

  const genres = data.genres || [];
  const directors = (data.credits?.crew || []).filter(c => c.job === "Director");
  const bg = data.backdrop_path ? `${IMG}/original${data.backdrop_path}` : "";
  const poster = data.poster_path ? `${IMG}/w342${data.poster_path}` : `https://placehold.co/185x278/131320/888888?text=No+Poster`;

  // Which title/overview to display
  const displayTitle = data.title || data.name;
  const arabicTitle = translation?.title;
  const displayOverview = (lang === "ar" && translation?.overview) ? translation.overview : data.overview;

  return (
    <div className="fi">
      <div className="dh">
        {bg && <div className="dbk" style={{ backgroundImage: `url(${bg})` }} />}
        <div className="dov1" /><div className="dov2" />
        <div className="dc">
          <div className="dposter"><img src={poster} alt={displayTitle} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
              {genres.map(g => <span key={g.id} className="tag">{g.name}</span>)}
              <span className="tag">{mediaType === "tv" ? "📺 TV" : "🎬 Movie"}</span>
            </div>

            {/* Title — English always shown, Arabic in () if translated */}
            <h1 className="dtitle">
              {displayTitle}
              {arabicTitle && (
                <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: "0.6em", color: "var(--gold)", fontWeight: 400, marginRight: lang === "ar" ? 0 : 12, marginLeft: lang === "ar" ? 12 : 0 }}>
                  ({arabicTitle})
                </span>
              )}
            </h1>

            <div className="meta">
              <span className="bdg bdg-g" style={{ fontSize: 13 }}>★ {fmt(data.vote_average)}</span>
              <span className="mi2">📅 {yr(data.release_date || data.first_air_date)}</span>
              {data.runtime && <span className="mi2">⏱ {rt(data.runtime)}</span>}
              {data.number_of_seasons && <span className="mi2">📺 {data.number_of_seasons} Seasons</span>}
              {directors[0] && <span className="mi2">🎬 {directors[0].name}</span>}
              {data.vote_count && <span className="mi2">👥 {data.vote_count.toLocaleString()}</span>}
            </div>

            {/* Overview – translated if AR */}
            <p className="ov" dir={lang === "ar" && translation ? "rtl" : "ltr"}
              style={{ fontFamily: lang === "ar" && translation ? "'Tajawal',sans-serif" : "inherit" }}>
              {trState === "loading"
                ? <span className="mut">{t.translating}</span>
                : displayOverview}
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {trailer && <button className="btn btn-gold" onClick={() => setShowTrl(true)}>{t.watch_trailer}</button>}
              <button className={`btn ${inWl ? "btn-gold" : "btn-out"}`} onClick={toggleWl}>{inWl ? t.in_wl : t.add_wl}</button>
              <button className="btn btn-ghost" onClick={onBack}>{t.back}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="smx">
          {/* Cast – names NOT translated */}
          {cast.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <h2 className="stitle">{t.cast}</h2>
              <div className="row">
                {cast.map(p => (
                  <div key={p.id} style={{ flex: "0 0 90px", textAlign: "center", cursor: "pointer" }} onClick={() => onActorOpen(p.id)}>
                    <img className="cast-img"
                      src={p.profile_path ? `${IMG}/w185${p.profile_path}` : `https://placehold.co/76x76/131320/888888?text=${p.name[0]}`}
                      alt={p.name} />
                    <div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.3 }}>{p.name}</div>
                    <div className="mut" style={{ fontSize: 10.5 }}>{p.character?.slice(0, 16)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div style={{ marginBottom: 36 }}>
            <h2 className="stitle">{t.reviews}</h2>
            <div className="rcard" style={{ marginBottom: 16 }}>
              <div className="cinzel" style={{ fontSize: 13.5, marginBottom: 12, color: "var(--gold)" }}>{t.write_review}</div>
              <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
                {[1, 2, 3, 4, 5].map(s => <span key={s} style={{ cursor: "pointer", fontSize: 20, color: s <= uRating ? "var(--gold)" : "var(--brd)", transition: "color .15s" }} onClick={() => setURating(s)}>★</span>)}
              </div>
              <textarea className="txta" placeholder={user ? t.share_thoughts : t.sign_in_review} disabled={!user} value={rtxt} onChange={e => setRtxt(e.target.value)} />
              <button className="btn btn-gold" style={{ marginTop: 11 }} onClick={postReview}>{t.post_review}</button>
            </div>
            {reviews.length === 0
              ? <div style={{ textAlign: "center", padding: 36, color: "var(--mut)", fontSize: 14 }}>{t.no_reviews}</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reviews.map(r => (
                    <div key={r.id} className="rcard">
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div className="av">{r.user[0].toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.user}</span>
                            <span className="mut" style={{ fontSize: 11.5 }}>{r.date}</span>
                          </div>
                          {r.rating > 0 && <div style={{ marginBottom: 7, color: "var(--gold)", fontSize: 13 }}>{"★".repeat(r.rating)}</div>}
                          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--mut)" }}>{r.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Similar */}
          {similar.length > 0 && (
            <div>
              <h2 className="stitle">{t.similar}</h2>
              <div className="g5">{similar.map(m => <MovieCard key={m.id} movie={m} onClick={sm => window.dispatchEvent(new CustomEvent("alsad_open", { detail: { ...sm, media_type: mediaType } }))} t={t} />)}</div>
            </div>
          )}
        </div>
      </div>

      {showTrl && trailer && (
        <div className="trl-ov" onClick={() => setShowTrl(false)}>
          <div style={{ width: "min(900px,90vw)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => setShowTrl(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 22 }}>✕</button>
            </div>
            <div style={{ aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", border: "1px solid var(--brd)" }}>
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                allow="autoplay;encrypted-media" allowFullScreen style={{ border: "none" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function HomePage({ onOpen, go, t }) {
  const [trending, setTrending] = useState([]); const [topRated, setTopRated] = useState([]);
  const [upcoming, setUpcoming] = useState([]); const [tv, setTv] = useState([]);
  const [loadErr, setLoadErr] = useState(""); const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([tmdb("/trending/movie/week"), tmdb("/movie/top_rated"), tmdb("/movie/upcoming"), tmdb("/tv/popular")])
      .then(([tr, top, up, tv2]) => { setTrending(tr.results || MOCK); setTopRated(top.results || []); setUpcoming(up.results || []); setTv(tv2.results || []); setReady(true); })
      .catch(() => { setTrending(MOCK); setReady(true); setLoadErr(t.failed_load); });
  }, []);

  const genres = Object.entries(t.genres).map(([id, n]) => ({ id: parseInt(id), n }));

  return (
    <div>
      <Hero movies={trending.slice(0, 6)} onOpen={onOpen} go={go} t={t} />
      {loadErr && <div style={{ padding: "12px 5%" }}><div style={{ maxWidth: 1440, margin: "0 auto" }}><div className="err-box">{loadErr}</div></div></div>}

      <div className="sec" style={{ paddingBottom: 16 }}><div className="smx">
        <h2 className="stitle">{t.browse_genre}</h2>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {genres.map(g => <span key={g.id} className="gc" onClick={() => go(`genre_${g.id}_${g.n}`)}>{g.n}</span>)}
        </div>
      </div></div>

      <div className="sec"><div className="smx">
        <h2 className="stitle">{t.trending}</h2>
        <div className="g5">{(ready ? trending.slice(0, 10) : Array(10).fill(null)).map((m, i) => <MovieCard key={i} movie={m} onClick={onOpen} t={t} />)}</div>
      </div></div>

      <div className="sec" style={{ paddingTop: 0 }}><div className="smx">
        <h2 className="stitle">{t.classics}</h2>
        <div className="row">{(ready ? topRated.slice(0, 14) : Array(10).fill(null)).map((m, i) => <div key={i} className="ri"><MovieCard movie={m} onClick={onOpen} t={t} /></div>)}</div>
      </div></div>

      <div className="sec" style={{ paddingTop: 0 }}><div className="smx">
        <h2 className="stitle">{t.popular_tv}</h2>
        <div className="g5">{(ready ? tv.slice(0, 10) : Array(10).fill(null)).map((m, i) => <MovieCard key={i} movie={m} onClick={m => onOpen({ ...m, media_type: "tv" })} t={t} />)}</div>
      </div></div>

      <div className="sec" style={{ paddingTop: 0 }}><div className="smx">
        <h2 className="stitle">{t.coming}</h2>
        <div className="g5">{(ready ? upcoming.slice(0, 10) : Array(10).fill(null)).map((m, i) => <MovieCard key={i} movie={m} onClick={onOpen} t={t} />)}</div>
      </div></div>

      <footer style={{ padding: "36px 5%", borderTop: "1px solid var(--brd)", textAlign: "center" }}>
        <div className="cinzel gold" style={{ fontSize: 22, letterSpacing: 4, marginBottom: 7 }}>⬡ ALSAD THEATER</div>
        <div className="mut" style={{ fontSize: 12.5 }}>{t.powered}</div>
      </footer>
    </div>
  );
}

// ── Browse Page ───────────────────────────────────────────────────────────────
function BrowsePage({ mediaType, title, onOpen, t }) {
  const [items, setItems] = useState([]); const [pg, setPg] = useState(1); const [flt, setFlt] = useState("popular");
  const [total, setTotal] = useState(1); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const movFlt = [["popular", t.sort_pop], ["top_rated", t.sort_rated], ["now_playing", "Now Playing"], ["upcoming", t.coming]];
  const tvFlt = [["popular", t.sort_pop], ["top_rated", t.sort_rated], ["on_the_air", "On Air"], ["airing_today", "Today"]];
  const filters = mediaType === "movie" ? movFlt : tvFlt;
  useEffect(() => {
    setLoading(true); setErr("");
    tmdb(`/${mediaType}/${flt}`, { page: pg })
      .then(d => { setItems(d.results || []); setTotal(d.total_pages || 1); setLoading(false); window.scrollTo({ top: 280, behavior: "smooth" }); })
      .catch(() => { setErr(t.failed_load); setLoading(false); });
  }, [flt, pg, mediaType]);
  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{ fontSize: 30, marginBottom: 22 }}>{title}</h1>
      {err && <div className="err-box">{err}</div>}
      <div style={{ display: "flex", gap: 7, marginBottom: 24, flexWrap: "wrap" }}>
        {filters.map(([id, lbl]) => <button key={id} className={`tab${flt === id ? " on" : ""}`} onClick={() => { setFlt(id); setPg(1); }}>{lbl}</button>)}
      </div>
      {loading ? <div className="g5">{Array(20).fill(null).map((_, i) => <SkCard key={i} />)}</div>
        : <div className="g5 fi">{items.map(m => <MovieCard key={m.id} movie={m} onClick={m => onOpen({ ...m, media_type: mediaType })} t={t} />)}</div>}
      <Pagination page={pg} total={total} onChange={p => setPg(p)} />
    </div></div>
  );
}

// ── Discover ──────────────────────────────────────────────────────────────────
function DiscoverPage({ onOpen, t }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(false);
  const [allGenres, setAllGenres] = useState([]); const [selG, setSelG] = useState([]);
  const [sort, setSort] = useState("popularity.desc"); const [year2, setYear2] = useState(""); const [minR, setMinR] = useState(0);
  const [pg, setPg] = useState(1); const [total, setTotal] = useState(1);

  useEffect(() => { tmdb("/genre/movie/list").then(d => setAllGenres(d.genres || [])); }, []);

  const doSearch = useCallback((page = 1) => {
    setLoading(true);
    const p = { sort_by: sort, page };
    if (selG.length) p.with_genres = selG.join(",");
    if (year2 && year2.length === 4) p.primary_release_year = year2;
    if (minR > 0) p["vote_average.gte"] = minR;
    tmdb("/discover/movie", p).then(d => { setItems(d.results || []); setTotal(d.total_pages || 1); setLoading(false); window.scrollTo({ top: 300, behavior: "smooth" }); });
  }, [selG, sort, year2, minR]);

  useEffect(() => { setPg(1); doSearch(1); }, [selG, sort, year2, minR]);
  const tog = id => setSelG(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);

  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{ fontSize: 30, marginBottom: 22 }}>{t.discover}</h1>
      <div style={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div className="mut" style={{ fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{t.filters}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {allGenres.map(g => <span key={g.id} className={`gc${selG.includes(g.id) ? " on" : ""}`} onClick={() => tog(g.id)}>{g.name}</span>)}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div className="mut" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.sort_by}</div>
            <select className="sel" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="popularity.desc">{t.sort_pop}</option>
              <option value="vote_average.desc">{t.sort_rated}</option>
              <option value="release_date.desc">{t.sort_new}</option>
              <option value="revenue.desc">{t.sort_box}</option>
            </select>
          </div>
          <div>
            <div className="mut" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.year_lbl}</div>
            <input className="inp" style={{ width: 90 }} placeholder="2024" value={year2} onChange={e => setYear2(e.target.value)} maxLength={4} />
          </div>
          <div>
            <div className="mut" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.min_rating}: {minR}+</div>
            <input type="range" min={0} max={9} step={1} value={minR} onChange={e => setMinR(+e.target.value)} style={{ width: 110, accentColor: "var(--gold)", display: "block", marginTop: 8 }} />
          </div>
        </div>
      </div>
      {loading ? <div className="g5">{Array(20).fill(null).map((_, i) => <SkCard key={i} />)}</div>
        : <div className="g5 fi">{items.map(m => <MovieCard key={m.id} movie={m} onClick={onOpen} t={t} />)}</div>}
      <Pagination page={pg} total={total} onChange={p => { setPg(p); doSearch(p); }} />
    </div></div>
  );
}

// ── Genre ─────────────────────────────────────────────────────────────────────
function GenrePage({ gid, gname, onOpen, t }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [pg, setPg] = useState(1); const [total, setTotal] = useState(1);
  useEffect(() => {
    setLoading(true);
    tmdb("/discover/movie", { with_genres: gid, sort_by: "popularity.desc", page: pg })
      .then(d => { setItems(d.results || []); setTotal(d.total_pages || 1); setLoading(false); window.scrollTo({ top: 200, behavior: "smooth" }); });
  }, [gid, pg]);
  return (
    <div className="sec"><div className="smx">
      <h1 className="cinzel" style={{ fontSize: 30, marginBottom: 22 }}>{gname}</h1>
      {loading ? <div className="g5">{Array(20).fill(null).map((_, i) => <SkCard key={i} />)}</div>
        : <div className="g5 fi">{items.map(m => <MovieCard key={m.id} movie={m} onClick={onOpen} t={t} />)}</div>}
      <Pagination page={pg} total={total} onChange={setPg} />
    </div></div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ user, wl, setWl, onOpen, go, setUser, t }) {
  const [tab, setTab] = useState("wl");
  return (
    <div className="sec"><div className="smx">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div className="cinzel" style={{ fontSize: 15, color: "var(--mut)", marginBottom: 4 }}>{t.welcome_back}</div>
          <div className="cinzel gold" style={{ fontSize: 34, fontWeight: 700 }}>{user.name}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => { setUser(null); localStorage.removeItem("alsad_user"); go("home"); }}>{t.sign_out}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 28 }}>
        {[["📽", t.watchlist, wl.length], ["✍", t.reviews_written, Object.keys(localStorage).filter(k => k.startsWith("r_")).length], ["🎬", t.member_since, "2025"]].map(([ic, lb, vl]) => (
          <div key={lb} style={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>{ic}</div>
            <div className="gold" style={{ fontSize: 26, fontWeight: 700 }}>{vl}</div>
            <div className="mut" style={{ fontSize: 12.5 }}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <button className={`tab${tab === "wl" ? " on" : ""}`} onClick={() => setTab("wl")}>{t.my_watchlist}</button>
      </div>
      {wl.length === 0
        ? <div style={{ textAlign: "center", padding: 56 }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🎞</div>
            <div className="cinzel" style={{ fontSize: 17, marginBottom: 8 }}>{t.empty_wl}</div>
            <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={() => go("movies")}>{t.browse_movies}</button>
          </div>
        : <div className="g5">
            {wl.map(m => (
              <div key={m.id} style={{ position: "relative" }}>
                <MovieCard movie={{ id: m.id, title: m.title, poster_path: m.poster, vote_average: m.rating, release_date: "" }}
                  onClick={() => onOpen({ id: m.id, title: m.title, poster_path: m.poster, media_type: m.mediaType || "movie" })} t={t} />
                <button onClick={() => setWl(w => w.filter(x => x.id !== m.id))}
                  style={{ position: "absolute", top: 7, left: 7, background: "rgba(0,0,0,.75)", border: "none", borderRadius: 4, color: "var(--red)", cursor: "pointer", padding: "2px 7px", fontSize: 13 }}>✕</button>
              </div>
            ))}
          </div>
      }
    </div></div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [movie, setMovie] = useState(null); const [mType, setMType] = useState("movie");
  const [actor, setActor] = useState(null);
  const [user, setUser] = useState(null); const [authMode, setAuthMode] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [wl, setWl] = useState([]);
  const [toast, setToast] = useState(null);
  const [lang, setLang] = useState("en");
  const t = T[lang];

  useEffect(() => {
    try {
      const wu = localStorage.getItem("alsad_user"); if (wu) setUser(JSON.parse(wu));
      const ww = localStorage.getItem("alsad_wl"); if (ww) setWl(JSON.parse(ww));
      const lg = localStorage.getItem("alsad_lang"); if (lg) setLang(lg);
    } catch {}
  }, []);

  useEffect(() => {
    document.body.dir = t.dir;
    try { localStorage.setItem("alsad_wl", JSON.stringify(wl)); } catch {}
  }, [lang, wl, t.dir]);

  const toggleLang = () => {
    const n = lang === "en" ? "ar" : "en";
    setLang(n); localStorage.setItem("alsad_lang", n);
  };

  const openMovie = useCallback((m) => {
    const mt = m.media_type === "tv" ? "tv" : "movie";
    setMovie(m.id || m); setMType(mt); setActor(null); setPage("detail");
    window.scrollTo(0, 0);
  }, []);

  const openActor = useCallback((id) => {
    setActor(id); setPage("actor"); window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const h = e => openMovie(e.detail);
    window.addEventListener("alsad_open", h);
    return () => window.removeEventListener("alsad_open", h);
  }, [openMovie]);

  const doLogin = (u) => {
    setUser(u); localStorage.setItem("alsad_user", JSON.stringify(u));
    setToast(lang === "ar" ? `أهلاً، ${u.name}!` : `Welcome, ${u.name}!`);
  };

  let gid = null, gname = null;
  if (page.startsWith("genre_")) { const parts = page.split("_"); gid = parts[1]; gname = parts.slice(2).join(" "); }

  return (
    <>
      <style>{CSS}</style>
      <Nav page={page} go={setPage} user={user} openAuth={setAuthMode} openSearch={() => setShowSearch(true)}
        wl={wl} lang={lang} toggleLang={toggleLang} t={t} />
      <main>
        {page === "home" && <HomePage onOpen={openMovie} go={setPage} t={t} />}
        {page === "movies" && <BrowsePage mediaType="movie" title={t.movies} onOpen={openMovie} t={t} />}
        {page === "tv" && <BrowsePage mediaType="tv" title={t.tv} onOpen={openMovie} t={t} />}
        {page === "discover" && <DiscoverPage onOpen={openMovie} t={t} />}
        {page === "detail" && movie && (
          <MovieDetail id={movie} mediaType={mType} onBack={() => setPage("home")}
            user={user} wl={wl} setWl={setWl} setToast={setToast}
            onActorOpen={openActor} t={t} lang={lang} />
        )}
        {page === "actor" && actor && <ActorPage actorId={actor} onOpen={openMovie} onBack={() => setPage("home")} t={t} />}
        {page === "dash" && user && <Dashboard user={user} wl={wl} setWl={setWl} onOpen={openMovie} go={setPage} setUser={setUser} t={t} />}
        {gid && <GenrePage gid={gid} gname={gname} onOpen={openMovie} t={t} />}
      </main>
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onLogin={doLogin} t={t} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onOpen={openMovie} onActorOpen={(id) => { openActor(id); setShowSearch(false); }} t={t} />}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}
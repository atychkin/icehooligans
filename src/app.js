/* ================= ГЛАВНАЯ СТРАНИЦА ================= */
function ufmt(v){ const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})$/); return m ? dfmt(m[1]+"-"+m[2]+"-"+m[3]) + ", " + m[4] : v; }
function toi(sec){ const m = Math.round(sec/60); return Math.floor(m/60) + " ч " + String(m%60).padStart(2,"0") + " мин"; }

/* --- games --- */
const games = GAMES.map(r => {
  const p = r.split("|");
  const [a,b] = p[4].split(":").map(Number);
  return { s:p[0], date:p[1], ha:p[2], opp:p[3], gf:a, ga:b, arena:p[5], id:p[6], stage:p[7]||"",
           res: a>b ? "W" : (a<b ? "L" : "D") };
}).sort((x,y) => y.date.localeCompare(x.date));
const gameById = {}; games.forEach(g => gameById[g.id] = g);
const seasonsList = SEASONS.map(s => s.s);

/* --- hero --- */
$("#heroBadges").innerHTML = [
  "Город: <b>" + TEAM.city + "</b>", "Основан: <b>сентябрь 2008</b>",
  "Лига: <b>ХЛ «Трудовые Резервы»</b>",
  TEAM.division ? "Дивизион: <b>" + TEAM.division.replace(/^Дивизион\s*/i, "") + "</b>" : "",
  "Капитан: <b>" + TEAM.captain + "</b>", "Тренер: <b>" + TEAM.coach + "</b>"
].filter(Boolean).map(t => '<span class="badge">' + t + '</span>').join("");

const winPct = Math.round(TOTAL.w / TOTAL.g * 100);
$("#heroTiles").innerHTML = [
  ["Матчей сыграно", TOTAL.g, 0], ["Побед", TOTAL.w, 1], ["Ничьих", TOTAL.d, 0], ["Поражений", TOTAL.l, 0],
  ["Шайб заброшено", TOTAL.gf, 1], ["Шайб пропущено", TOTAL.ga, 0], ["Процент побед", winPct + "%", 0],
  ["Штрафных минут", TOTAL.pim, 0]
].map(t => '<div class="tile' + (t[2] ? " acc" : "") + '"><div class="v mono">' + t[1] + '</div><div class="k">' + t[0] + '</div></div>').join("");

/* --- season cards --- */
const MEDAL = { "Золото": "🥇", "Серебро": "🥈", "Бронза": "🥉" };
$("#seasonCards").innerHTML = SEASONS.map(s => {
  const pl = s.medal
    ? '<span class="badge" style="border-color:var(--acc);color:var(--acc2)">' + MEDAL[s.medal] + " " + s.medal + '</span>'
    : (s.po ? '<span class="badge">' + s.po + '</span>' : '<span class="badge">идёт</span>');
  const si = (v, k) => '<div class="si"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>';
  return '<div class="card">' +
    '<div class="shead"><h3>' + s.s + '</h3>' + pl + '</div>' +
    (s.div ? '<div class="sdiv">' + s.div + '</div>' : "") +
    '<div class="sstats">' + si(s.g, "игр") + si(s.w + "-" + s.d + "-" + s.l, "в-н-п") + si(s.gf + ":" + s.ga, "шайбы") + '</div>' +
    '<p class="snote">' + s.note + '</p></div>';
}).join("");

/* --- games list --- */
let curSeason = seasonsList[0];
function renderGames(){
  const list = games.filter(g => g.s === curSeason);
  $("#gameList").innerHTML = list.map(g => {
    const scr = g.gf + ":" + g.ga;
    const stage = g.stage ? '<span class="pill po">' + g.stage + '</span>' : "";
    return '<div class="game"><div class="d">' + dfmt(g.date) + '</div>' +
      '<div><div class="opp">' + (g.ha === "H" ? "" : "@ ") + g.opp + stage + '</div>' +
      '<div class="meta">' + (g.ha === "H" ? "дома" : "в гостях") + (g.arena ? " · " + g.arena : "") +
      ' · <a href="https://hltr.ru/games/' + g.id + '/statistic" target="_blank" rel="noopener" style="color:var(--dim)">протокол</a></div></div>' +
      '<div class="score ' + g.res + ' mono">' + scr + '</div></div>';
  }).join("");
  const wins = list.filter(g => g.res === "W").length, dr = list.filter(g => g.res === "D").length;
  $("#upcoming").innerHTML = curSeason === seasonsList[0]
    ? '<h3 style="margin:26px 0 10px;font-size:18px">Ближайшие матчи</h3><div class="card" style="padding:0">' +
      UPCOMING.map(u => '<div class="game"><div class="d">' + ufmt(u[0]) + '</div><div><div class="opp">' +
        (u[1] === "H" ? "" : "@ ") + u[2] + '</div><div class="meta">' + (u[1] === "H" ? "дома" : "в гостях") +
        (u[3] ? " · " + u[3] : "") + '</div></div><div class="score mono" style="color:var(--dim)">—</div></div>').join("") + '</div>'
    : '<p class="sub" style="margin-top:14px">Сезон ' + curSeason + ": " + list.length + " матчей, " + wins + " побед, " + dr + " ничьих.</p>";
}
$("#gameTabs").innerHTML = seasonsList.map((s,i) => '<button class="tab' + (i===0?" on":"") + '" data-s="' + s + '">' + s + '</button>').join("");
$("#gameTabs").addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  $("#gameTabs").querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t === b));
  curSeason = b.dataset.s; renderGames();
});
renderGames();

/* --- достижения --- */
const ACH_BASE = "https://hltr.ru/assets/achievements/hltr_";
function achBadges(name, cls){
  const list = ACH[name];
  if (!list) return "";
  return '<span class="ach ' + (cls || "") + '">' + list.map(a =>
    '<img src="' + ACH_BASE + a[0] + "/" + a[1] + '.png" alt="' + (ACH_NAMES[a[0]] || a[0]) + " " + a[1] +
    '" title="' + (ACH_NAMES[a[0]] || a[0]) + ": " + a[1] + "+ (сейчас " + a[2] + ')">').join("") + '</span>';
}

/* --- roster --- */
$("#rosterTitle").textContent = "Состав " + (SEASONS[0] ? SEASONS[0].s.replace("-", "/") : "");
$("#staffLine").textContent = [
  TEAM.coach && "Главный тренер — " + TEAM.coach,
  TEAM.captain && "Капитан — " + TEAM.captain,
  TEAM.assistants && TEAM.assistants.length && "Ассистенты — " + TEAM.assistants.join(", "),
  "В заявке " + ROSTER.length + " игроков"
].filter(Boolean).join(". ") + ".";
$("#rosterGrid").innerHTML = ROSTER.map(p => {
  const ph = PHOTO[p[0]] || ["",0];
  const img = ph[0] ? "background-image:url('" + FS + ph[0] + "')" : "";
  const link = ph[1] ? "https://hltr.ru/player/" + ph[1] : TEAM.leagueUrl;
  return '<a class="pcard" href="' + link + '" target="_blank" rel="noopener">' +
    '<div class="ph" style="' + img + '">' + (p[1] !== "" ? '<span class="no">' + p[1] + '</span>' : "") +
    (p[3] ? '<span class="c">' + p[3] + '</span>' : "") + '</div>' +
    '<div class="nm">' + p[0] + '</div><div class="ps">' + p[2] + '</div>' +
    achBadges(p[0], "big") + '</a>';
}).join("");

/* --- player stats --- */
const SK_COLS = [["l","Игрок"],["","№"],["","И"],["","В"],["","Г"],["","П"],["","О"],["","Штр"],["","БрСтв"],["","Бр"],["","Блок"],["","ВВ%"]];
const GK_COLS = [["l","Вратарь"],["","№"],["","И"],["","В"],["","+/-"],["","ПШ"],["","Сейвы"],["","Отр%"],["","Сухие"],["","Время"]];
let statKey = "Карьера", sortIdx = 6, sortDir = -1, gSortIdx = 2, gSortDir = -1;

function parsePlayers(key){
  return PLAYERS[key].trim().split("\n").map(r => r.split("|"));
}
function skRow(p){ return [p[0], p[1], +p[3], +p[4], +p[5], +p[6], +p[7], +p[8], +p[9], +p[10], +p[11], p[12] + "%"]; }
function gkRow(p){ return [p[0], p[1], +p[3], +p[4], +p[13], +p[14], +p[15], p[16] + "%", +p[17], toi(+p[18])]; }

function buildTable(tblId, cols, rows, si, sd, onSort){
  const t = $("#" + tblId);
  const key = r => { const v = r[si]; return typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")) || String(v); };
  const sorted = rows.slice().sort((a,b) => {
    const x = key(a), y = key(b);
    if (typeof x === "number" && typeof y === "number") return (x - y) * sd;
    return String(x).localeCompare(String(y)) * sd;
  });
  t.innerHTML = "<thead><tr>" + cols.map((c,i) => '<th class="' + c[0] + '" data-i="' + i + '">' + c[1] + (i === si ? (sd > 0 ? " ↑" : " ↓") : "") + "</th>").join("") + "</tr></thead><tbody>" +
    sorted.map(r => "<tr>" + r.map((v,i) => '<td class="' + (cols[i][0] || "mono") + '">' +
      (i === 0 ? photoName(v) : v) + "</td>").join("") + "</tr>").join("") + "</tbody>";
  t.querySelectorAll("th").forEach(th => th.onclick = () => onSort(+th.dataset.i));
}
function photoName(n){
  const ph = PHOTO[n];
  const img = ph && ph[0] ? '<img src="' + FS + ph[0] + '" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;vertical-align:-8px;margin-right:8px">' : "";
  const nameHtml = ph && ph[1]
    ? '<a href="https://hltr.ru/player/' + ph[1] + '" target="_blank" rel="noopener" style="text-decoration:none">' + n + "</a>"
    : n;
  return img + nameHtml + achBadges(n);
}
function renderStats(){
  const all = parsePlayers(statKey);
  buildTable("skaters", SK_COLS, all.filter(p => p[2] !== "goaltender").map(skRow), sortIdx, sortDir,
    i => { if (i === sortIdx) sortDir = -sortDir; else { sortIdx = i; sortDir = -1; } renderStats(); });
  buildTable("goalies", GK_COLS, all.filter(p => p[2] === "goaltender").map(gkRow), gSortIdx, gSortDir,
    i => { if (i === gSortIdx) gSortDir = -gSortDir; else { gSortIdx = i; gSortDir = -1; } renderStats(); });
}
$("#statTabs").innerHTML = Object.keys(PLAYERS).map((k,i) => '<button class="tab' + (i===0?" on":"") + '" data-k="' + k + '">' + k + "</button>").join("");
$("#statTabs").addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  $("#statTabs").querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t === b));
  statKey = b.dataset.k; renderStats();
});
renderStats();

/* --- standings --- */
let tabSeason = TABLES[0][0];
function renderTables(){
  $("#tableBox").innerHTML = TABLES.filter(t => t[0] === tabSeason).map(t =>
    '<div><h3 style="font-size:17px;margin:10px 0 4px">' + t[1] + '</h3>' +
    (t[2] ? '<div class="sub" style="margin-bottom:10px">' + t[2] + '</div>' : "") +
    '<div class="tblwrap"><table>' +
    '<thead><tr><th class="l">#</th><th class="l">Команда</th><th>И</th><th>В</th><th>ВО</th><th>ПО</th><th>Н</th><th>П</th><th>О</th><th>Шайбы</th></tr></thead><tbody>' +
    t[3].map((r,i) => { const c = r.split("~");
      return '<tr' + (c[0].indexOf("ICE HOOLIGANS") >= 0 ? ' class="me"' : "") + '><td class="l">' + (i+1) + '</td><td class="l">' + c[0] + '</td>' +
        c.slice(1).map(v => '<td class="mono">' + v + "</td>").join("") + "</tr>"; }).join("") +
    "</tbody></table></div></div>").join("");
}
const tSeasons = [...new Set(TABLES.map(t => t[0]))];
$("#tableTabs").innerHTML = tSeasons.map((s,i) => '<button class="tab' + (i===0?" on":"") + '" data-s="' + s + '">' + s + "</button>").join("");
$("#tableTabs").addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  $("#tableTabs").querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t === b));
  tabSeason = b.dataset.s; renderTables();
});
renderTables();

/* --- превью фотоархива (полная версия — на photos.html) --- */
const preview = (typeof PHOTOS_PREVIEW !== "undefined" ? PHOTOS_PREVIEW : []);
$("#photoSub").textContent = "Свежие кадры с матчей. Весь архив разложен по годам, месяцам и матчам — " +
  (typeof PHOTOS_TOTAL !== "undefined" ? PHOTOS_TOTAL.toLocaleString("ru") + " фотографий." : "на отдельной странице.");
$("#gal").innerHTML = preview.map((p, i) => {
  const g = gameById[p.split("|")[1]];
  return '<button data-i="' + i + '" title="' + (g ? dfmt(g.date) + " · " + g.opp : "") + '">' +
    '<img loading="lazy" src="' + thumbUrl(p.split("|")[0]) + '" alt=""></button>';
}).join("");
$("#gal").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const i = +b.dataset.i, g = gameById[preview[i].split("|")[1]];
  LB.open(preview.map(p => p.split("|")[0]), i, g ? dfmt(g.date) + " · " + g.opp + " · " + g.gf + ":" + g.ga : "");
});

const built = new Date(typeof BUILT_AT === "string" ? BUILT_AT : Date.now());
$("#upd").textContent = "Данные обновлены " + built.getDate() + " " + RU_M[built.getMonth()] + " " + built.getFullYear() +
  ". В базе: " + games.length + " сыгранных матчей, " + parsePlayers("Карьера").length +
  " игроков, " + (typeof PHOTOS_TOTAL !== "undefined" ? PHOTOS_TOTAL.toLocaleString("ru") : preview.length) +
  " фотографий. Страница пересобирается автоматически каждую ночь.";

/* ================= СТРАНИЦА ФОТОАРХИВА ================= */
/* PHOTO_GAMES: [{id, date:"YYYY-MM-DD", files:["file.jpg", ...]}] — от свежих к старым */

const gameInfo = {};
GAMES.forEach((r) => {
  const p = r.split("|");
  const [a, b] = p[4].split(":").map(Number);
  gameInfo[p[6]] = { s: p[0], date: p[1], ha: p[2], opp: p[3], gf: a, ga: b, arena: p[5],
                     res: a > b ? "W" : (a < b ? "L" : "D"), stage: p[7] || "" };
});

const arch = PHOTO_GAMES.map((g) => {
  const info = gameInfo[g.id] || null;
  const date = (info && info.date) || g.date;
  return { ...g, info, date, year: +date.slice(0, 4), month: +date.slice(5, 7) };
}).sort((a, b) => b.date.localeCompare(a.date));

const years = [...new Set(arch.map((g) => g.year))].sort((a, b) => b - a);
let curYear = "all", curMonth = "all";

function visible(){
  return arch.filter((g) => (curYear === "all" || g.year === curYear) &&
                            (curMonth === "all" || g.month === curMonth));
}

function renderYears(){
  $("#yearMenu").innerHTML =
    '<button class="tab' + (curYear === "all" ? " on" : "") + '" data-y="all">Все годы</button>' +
    years.map((y) => '<button class="tab' + (curYear === y ? " on" : "") + '" data-y="' + y + '">' + y + "</button>").join("");
}

function renderMonths(){
  const pool = arch.filter((g) => curYear === "all" || g.year === curYear);
  const months = [...new Set(pool.map((g) => g.month))].sort((a, b) => a - b);
  $("#monthMenu").innerHTML = months.length < 2 ? "" :
    '<button class="mtab' + (curMonth === "all" ? " on" : "") + '" data-m="all">Все месяцы</button>' +
    months.map((m) => {
      const n = pool.filter((g) => g.month === m).reduce((s, g) => s + g.files.length, 0);
      return '<button class="mtab' + (curMonth === m ? " on" : "") + '" data-m="' + m + '">' +
        RU_MONTH[m - 1] + " <span style='opacity:.6'>" + n + "</span></button>";
    }).join("");
}

function renderArch(){
  const list = visible();
  const shots = list.reduce((s, g) => s + g.files.length, 0);
  $("#pcount").textContent = list.length
    ? "Матчей: " + list.length + " · фотографий: " + shots.toLocaleString("ru")
    : "За этот период фотографий нет.";

  $("#arch").innerHTML = list.map((g, gi) => {
    const i = g.info;
    const title = i ? (i.ha === "H" ? "" : "@ ") + i.opp : "Матч " + g.id;
    const score = i ? '<span class="' + i.res + '" style="font-family:Oswald,Impact,sans-serif;margin-left:8px">' + i.gf + ":" + i.ga + "</span>" : "";
    const meta = i ? [i.s, i.ha === "H" ? "дома" : "в гостях", i.arena, i.stage].filter(Boolean).join(" · ") : "";
    const strip = g.files.slice(0, 4).map((f) =>
      '<img loading="lazy" src="' + thumbUrl(f) + '" alt="">').join("");
    return '<details class="pgame" data-g="' + gi + '">' +
      '<summary><div class="pd">' + dfmt(g.date) + "</div>" +
      '<div><div class="pt">' + title + score + '</div><div class="pm">' + meta + "</div></div>" +
      '<div style="display:flex;align-items:center;gap:12px"><div class="pstrip">' + strip + "</div>" +
      '<div class="pn">' + g.files.length + " фото</div></div></summary>" +
      '<div class="pbody"><div class="gal"></div></div></details>';
  }).join("");
}

/* фотографии матча рисуются только когда его развернули */
function fillGame(det){
  const g = visible()[+det.dataset.g];
  const box = $(".gal", det);
  if (!g || box.dataset.done) return;
  box.dataset.done = "1";
  box.innerHTML = g.files.map((f, i) =>
    '<button data-i="' + i + '"><img loading="lazy" src="' + thumbUrl(f) + '" alt=""></button>').join("");
  const i = g.info;
  const cap = dfmt(g.date) + (i ? " · " + (i.ha === "H" ? "" : "@ ") + i.opp + " · " + i.gf + ":" + i.ga : "");
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    LB.open(g.files, +b.dataset.i, cap);
  });
}

$("#arch").addEventListener("toggle", (e) => {
  const d = e.target.closest("details");
  if (d && d.open) fillGame(d);
}, true);

$("#yearMenu").addEventListener("click", (e) => {
  const b = e.target.closest(".tab"); if (!b) return;
  curYear = b.dataset.y === "all" ? "all" : +b.dataset.y;
  curMonth = "all";
  renderYears(); renderMonths(); renderArch();
});
$("#monthMenu").addEventListener("click", (e) => {
  const b = e.target.closest(".mtab"); if (!b) return;
  curMonth = b.dataset.m === "all" ? "all" : +b.dataset.m;
  renderMonths(); renderArch();
});

renderYears(); renderMonths(); renderArch();

const builtP = new Date(typeof BUILT_AT === "string" ? BUILT_AT : Date.now());
$("#upd").textContent = "Всего в архиве " + arch.reduce((s, g) => s + g.files.length, 0).toLocaleString("ru") +
  " фотографий с " + arch.length + " матчей. Обновлено " + builtP.getDate() + " " +
  RU_M[builtP.getMonth()] + " " + builtP.getFullYear() + ".";

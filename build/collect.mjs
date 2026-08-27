/**
 * Сбор всей статистики HC ICE HOOLIGANS из открытого API лиги «Трудовые Резервы».
 * Работает на любом сервере (CORS ограничивает только браузер).
 * Node 20+ — используется встроенный fetch, зависимостей нет.
 */

export const CFG = {
  api: "https://mtgame.ru/api/v1",
  leagueId: 12,
  teamId: 2750,
  teamPage: "https://hltr.ru/teams/2750",
  photoMaxPages: 200,    // предохранитель: страниц медиаархива по 100 фото
  photoPreview: 12,      // сколько свежих кадров показать на главной
  // подписи к сезонам, которые нельзя вычислить из цифр
  notes: {
    "2025-26": "1-е место на отборе, 2-е в регулярном чемпионате, финал Золотого плей-офф. 139 шайб — рекорд клуба",
    "2024-25": "Тяжёлая регулярка, но победа в финале Серебряного плей-офф",
    "2023-24": "Победа в матче за 3-е место — 5:2 над HC I ONE SPORT",
    "2022-23": "Дебютный сезон в «Трудовых Резервах»"
  }
};

const ACH_NAMES = {
  games: "Игры", goals: "Голы", assists: "Передачи", points: "Очки",
  shots_on_goal: "Броски в створ", block_shots: "Блокированные броски",
  penalty_minutes: "Штрафные минуты", saves: "Сейвы"
};

const get = async (path) => {
  const r = await fetch(CFG.api + path);
  if (!r.ok) throw new Error("GET " + path + " -> " + r.status);
  return r.json();
};
const post = async (body) => {
  const r = await fetch(CFG.api + "/hockey_statistic/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("POST hockey_statistic -> " + r.status + " " + JSON.stringify(body));
  return r.json();
};

/** «Сезон 2025-2026» / «Сезон 2020/2021» -> «2025-26» */
const label = (name) => {
  const m = name.match(/(\d{4})\s*[-/]\s*(\d{4})/);
  return m ? m[1] + "-" + m[2].slice(2) : name;
};
/** МСК = UTC+3 круглый год, поэтому переводим сдвигом — без зависимости от ICU */
const msk = (iso) => iso ? new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString() : "";
const fullName = (lp) => [lp?.last_name, lp?.first_name].filter(Boolean).join(" ");
const fileOf = (url) => String(url || "").replace("https://fs.mtgame.ru/", "");

/** строка игрока: имя|номер|амплуа|И|В|Г|П|О|Штр|БрСтв|Бр|Блок|ВВ%|+-|ПШ|Сейвы|Отр%|СО|Время */
const playerRow = (r) => {
  const lp = r.league_player || {};
  const hp = lp.user?.hockey_profile || {};
  const tu = r.tournament_team_user?.team_user || {};
  return [
    fullName(lp), tu.number ?? "", hp.position || "",
    r.games_count, r.won_games_count, r.goals, r.assists, r.points, r.penalty_minutes,
    r.shots_on_goal, r.shots, r.block_shots, r.face_off_percent, r.plus_minus,
    r.goals_against, r.saves, r.saves_percent, r.shutout, r.game_time_total
  ].join("|");
};

export async function collect() {
  const { leagueId: L, teamId: T } = CFG;

  /* ---------- 1. сезоны, в которых команда играла ---------- */
  const tournaments = await get(`/league/${L}/tournaments/`);
  const seasons = [];
  for (const t of tournaments) {
    if (!/сезон/i.test(t.name)) continue;
    const games = await get(`/tournament/${t.id}/games/?team_id=${T}&size=500`);
    if (!games.length) continue;
    const info = await get(`/tournament/${t.id}/`);
    const rounds = await get(`/tournament/${t.id}/rounds/`);
    const teams = await get(`/tournament/${t.id}/teams/`);
    const me = teams.find((x) => x.team_id === T);
    seasons.push({
      id: t.id,
      seasonId: info.season?.id ?? info.tournament_season_id ?? info.season_id,
      name: t.name,
      s: label(t.name),
      games, rounds,
      place: me?.final_standing ?? null,
      division: me?.division?.name || "",
      tournamentTeamId: me?.id
    });
  }
  seasons.sort((a, b) => b.s.localeCompare(a.s));

  /* ---------- 2. матчи ---------- */
  const gameRows = [], upcoming = [];
  for (const se of seasons) {
    for (const g of se.games) {
      const home = g.team_id === T;
      const opp = home ? (g.competitor_team_name || g.competitor_team?.name) : g.team?.name;
      if (g.status !== "closed") {
        if (se.s === seasons[0].s) {
          upcoming.push([
            g.datetime ? msk(g.datetime).slice(0, 16).replace("T", " ") : "дата уточняется",
            home ? "H" : "A", opp, g.tournament_court?.name || ""
          ]);
        }
        continue;
      }
      const us = home ? g.team_score : g.competitor_team_score;
      const them = home ? g.competitor_team_score : g.team_score;
      const stage = g.playoff_round ? (+g.playoff_round === 1 ? "ФИНАЛ" : "ПО") : "";
      gameRows.push([
        se.s, msk(g.datetime).slice(0, 10), home ? "H" : "A", opp,
        us + ":" + them, g.tournament_court?.name || "", g.id, stage
      ].join("|"));
    }
  }
  gameRows.sort();
  upcoming.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  /* ---------- 3. статистика игроков и команды ---------- */
  const players = {}, teamTotals = {};
  const careerRows = await post({ league_id: L, team_id: T, group_by: "league_player", per_game: "0" });
  players["Карьера"] = careerRows.map(playerRow).join("\n");

  for (const se of seasons) {
    const base = { league_id: L, tournament_season_id: se.seasonId, tournament_id: se.id, team_id: T, per_game: "0" };
    players[se.s] = (await post({ ...base, group_by: "league_player" })).map(playerRow).join("\n");
    teamTotals[se.s] = (await post({ ...base, group_by: "team" }))[0] || null;
  }

  /* карьера = сумма сезонов (иначе в неё попадают матчи за другие клубы лиги) */
  const bySeason = {};
  for (const se of seasons) {
    for (const row of players[se.s].split("\n").filter(Boolean)) {
      const c = row.split("|");
      const v = (bySeason[c[0]] ||= { g: 0, w: 0 });
      v.g += +c[3]; v.w += +c[4];
    }
  }
  players["Карьера"] = players["Карьера"].split("\n").filter(Boolean).map((row) => {
    const c = row.split("|"), s = bySeason[c[0]];
    if (s && (+c[3] !== s.g || +c[4] !== s.w)) { c[3] = s.g; c[4] = s.w; }
    return c.join("|");
  }).join("\n");

  /* ---------- 4. итоги по сезонам (из результатов матчей) ---------- */
  const agg = {};
  for (const row of gameRows) {
    const c = row.split("|"), [a, b] = c[4].split(":").map(Number);
    const v = (agg[c[0]] ||= { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    v.g++; v.gf += a; v.ga += b;
    if (a > b) v.w++; else if (a < b) v.l++; else v.d++;
  }
  /** чем закончился плей-офф: смотрим последний сыгранный матч стадии */
  const playoffResult = (se) => {
    const po = se.games
      .filter((g) => g.status === "closed" && g.playoff_stage)
      .sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
    const last = po[po.length - 1];
    if (!last) return null;
    const home = last.team_id === T;
    const us = home ? last.team_score : last.competitor_team_score;
    const them = home ? last.competitor_team_score : last.team_score;
    const won = us > them;
    const cup = last.tournament_playoff?.name || "";
    const gold = /золот/i.test(cup);
    const stage = last.playoff_stage;
    if (/3/.test(stage)) return { medal: won ? "Бронза" : null, place: won ? 3 : 4, text: won ? "Матч за 3-е место выигран" : "Матч за 3-е место проигран" };
    if (/финал/i.test(stage)) {
      if (gold) return won ? { medal: "Золото", place: 1, text: "Победа в Золотом плей-офф" }
                           : { medal: "Серебро", place: 2, text: "Финал Золотого плей-офф" };
      return won ? { medal: null, place: null, text: "Победа в Серебряном плей-офф" }
                 : { medal: null, place: null, text: "Финал Серебряного плей-офф" };
    }
    return { medal: null, place: null, text: stage + " плей-офф" };
  };

  const SEASONS = seasons.map((se) => {
    const a = agg[se.s] || { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    const t = teamTotals[se.s] || {};
    const po = playoffResult(se);
    return {
      s: se.s, place: po ? po.place : null, medal: po ? po.medal : null, po: po ? po.text : "",
      div: se.division || "", ...a,
      pim: t.penalty_minutes ?? 0, sog: t.shots_on_goal ?? 0, sh: t.shots ?? 0,
      fo: t.face_off_percent ?? 0, blk: t.block_shots ?? 0,
      note: CFG.notes[se.s] || (se.place ? `${se.place}-е место в дивизионе` : "Сезон идёт")
    };
  });
  const TOTAL = SEASONS.reduce((m, s) => ({
    g: m.g + s.g, w: m.w + s.w, d: m.d + s.d, l: m.l + s.l,
    gf: m.gf + s.gf, ga: m.ga + s.ga, pim: m.pim + s.pim,
    sog: m.sog + s.sog, sh: m.sh + s.sh, blk: m.blk + s.blk, fo: 0
  }), { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pim: 0, sog: 0, sh: 0, blk: 0, fo: 0 });

  /* ---------- 5. турнирные таблицы ---------- */
  const TABLES = [];
  for (const se of seasons) {
    for (const rd of se.rounds) {
      let raw;
      try { raw = await get(`/tournament_round/${rd.id}/teams/`); } catch { continue; }
      const rows = raw.map((x) => ({
        tid: x.tournament_team?.team_id ?? x.tournament_team?.team?.id,
        nm: x.tournament_team?.name || x.tournament_team?.team?.name || "?",
        div: x.division_id, g: x.games_count, w: x.won_games_count,
        wot: x.win_overtime_games_count, lot: x.lose_overtime_games_count,
        d: x.draw_games_count, l: x.lose_games_count, pts: x.points,
        gf: x.score_sum, ga: x.missed_sum
      }));
      const me = rows.find((x) => x.tid === T);
      if (!me) continue;
      const peers = rows.filter((x) => x.div === me.div)
        .sort((a, b) => (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)));
      if (!peers.some((x) => x.pts > 0)) continue; // плей-офф: очков нет, таблица бессмысленна
      const divName = (rd.divisions || []).find((d) => d.id === me.div)?.name || se.division;
      TABLES.push([se.s, rd.name, divName,
        peers.map((x) => [x.nm, x.g, x.w, x.wot, x.lot, x.d, x.l, x.pts, x.gf + ":" + x.ga].join("~"))]);
    }
  }

  /* ---------- 6. заявка текущего сезона ---------- */
  const POS = { forward: "Нападающий", defensemen: "Защитник", goaltender: "Вратарь" };
  const ROLE = { captain: "К", assistant: "А" };
  let ROSTER = [], coach = "", captain = "", assistants = [];
  if (seasons[0]?.tournamentTeamId) {
    const users = await get(`/tournament_team/${seasons[0].tournamentTeamId}/users/`);
    for (const u of users) {
      const nm = fullName(u.league_player);
      const tu = u.team_user || {};
      if (tu.role === "head_coach" || !u.league_player) { if (nm) coach = nm; continue; }
      const pos = tu.user?.hockey_profile?.position || "";
      ROSTER.push([nm, tu.number ?? "", POS[pos] || "Игрок", ROLE[tu.role] || ""]);
      if (tu.role === "captain") captain = nm + (tu.number ? " #" + tu.number : "");
      if (tu.role === "assistant") assistants.push(nm + (tu.number ? " #" + tu.number : ""));
    }
    const order = { Нападающий: 0, Защитник: 1, Вратарь: 2 };
    ROSTER.sort((a, b) => (a[3] ? 0 : 1) - (b[3] ? 0 : 1) || order[a[2]] - order[b[2]] || a[0].localeCompare(b[0]));
  }

  /* ---------- 7. фото игроков, id профилей, достижения ---------- */
  const PHOTO = {}, ACH = {};
  for (const r of careerRows) {
    const lp = r.league_player || {};
    const nm = fullName(lp);
    PHOTO[nm] = [fileOf(lp.photo?.path), lp.id];
    const earned = (lp.achievements || []).filter((a) => a.level > 0).map((a) => [
      a.achievement.alias.replace("hltr_", ""),
      a.achievement.thresholds[a.level - 1],
      a.current_value
    ]);
    if (earned.length) ACH[nm] = earned;
  }

  /* ---------- 8. фотоархив: все снимки, сгруппированные по матчам ---------- */
  const byGame = new Map();
  const seenFiles = new Set();
  let total = 0;
  for (let p = 1; p <= CFG.photoMaxPages; p++) {
    let batch;
    try {
      batch = await get(`/league/${L}/media/?page=${p}&size=100&media_type=photo&team_id=${T}`);
    } catch { break; }
    if (!batch.length) break;
    for (const m of batch) {
      const f = fileOf(m.original_photo?.path);
      if (!f || seenFiles.has(f)) continue;
      seenFiles.add(f);
      total++;
      const id = String(m.game_id || "0");
      if (!byGame.has(id)) byGame.set(id, { id, date: msk(m.created_at).slice(0, 10), files: [] });
      byGame.get(id).files.push(f);
    }
    if (batch.length < 100) break;
  }
  const PHOTO_GAMES = [...byGame.values()];

  /* дата матча точнее даты загрузки — подставим её там, где матч известен */
  const gameDate = {};
  for (const row of gameRows) { const c = row.split("|"); gameDate[c[6]] = c[1]; }
  for (const g of PHOTO_GAMES) if (gameDate[g.id]) g.date = gameDate[g.id];
  PHOTO_GAMES.sort((a, b) => b.date.localeCompare(a.date));

  /* для главной — только свежие кадры, в формате «файл|id матча» */
  const PHOTOS_PREVIEW = [];
  outer: for (const g of PHOTO_GAMES) {
    for (const f of g.files) {
      if (PHOTOS_PREVIEW.length >= CFG.photoPreview) break outer;
      PHOTOS_PREVIEW.push(f + "|" + g.id);
    }
  }

  return {
    TEAM: {
      name: "HC ICE HOOLIGANS", city: "Москва",
      logo: "https://fs.mtgame.ru/1200x1200HCHooligans.png",
      league: "Хоккейная Лига «Трудовые Резервы»", leagueUrl: CFG.teamPage,
      division: seasons[0]?.division || "", coach, captain, assistants
    },
    GAMES: gameRows, UPCOMING: upcoming, SEASONS, TOTAL, TABLES,
    PLAYERS: players, PHOTO, ACH, ACH_NAMES, ROSTER,
    PHOTOS_PREVIEW, PHOTOS_TOTAL: total, PHOTO_GAMES,
    BUILT_AT: new Date().toISOString()
  };
}

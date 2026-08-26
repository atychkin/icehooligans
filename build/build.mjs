/**
 * Собирает index.html: тянет данные из API лиги и склеивает
 * src/head.html + сгенерированный data.js + src/app.js
 *
 *   node build/build.mjs            — собрать со свежими данными
 *   node build/build.mjs --offline  — пересобрать из сохранённого src/data.js
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { collect } from "./collect.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => join(ROOT, ...x);
const offline = process.argv.includes("--offline");

const KEYS = ["TEAM", "GAMES", "UPCOMING", "SEASONS", "TOTAL", "TABLES",
  "PLAYERS", "PHOTO", "ACH", "ACH_NAMES", "ROSTER", "PHOTOS", "BUILT_AT"];

function toDataJs(d) {
  const head = "/* Данные собраны автоматически из API ХЛ «Трудовые Резервы». Не редактировать вручную. */\n" +
    "/* Обновлено: " + d.BUILT_AT + " */\n\n";
  return head + KEYS.map((k) => "const " + k + " = " + JSON.stringify(d[k], null, k === "TEAM" ? 2 : 0) + ";").join("\n\n") + "\n";
}

function sanity(d) {
  const errs = [];
  if (d.GAMES.length < 50) errs.push("матчей всего " + d.GAMES.length);
  if (!d.SEASONS.length) errs.push("не найдено ни одного сезона");
  if (!d.ROSTER.length) errs.push("пустая заявка");
  if (!Object.keys(d.PLAYERS).length) errs.push("нет статистики игроков");
  const agg = {};
  for (const row of d.GAMES) {
    const c = row.split("|"), [a, b] = c[4].split(":").map(Number);
    const v = (agg[c[0]] ||= { g: 0, gf: 0, ga: 0 });
    v.g++; v.gf += a; v.ga += b;
  }
  for (const s of d.SEASONS) {
    const a = agg[s.s];
    if (!a || a.g !== s.g || a.gf !== s.gf || a.ga !== s.ga)
      errs.push(`сезон ${s.s}: матчи и итоги не сходятся`);
  }
  if (errs.length) throw new Error("Проверка данных не пройдена:\n - " + errs.join("\n - "));
}

const data = offline ? null : await collect();
if (data) {
  sanity(data);
  await writeFile(p("src", "data.js"), toDataJs(data), "utf8");
}

const [head, dataJs, app] = await Promise.all([
  readFile(p("src", "head.html"), "utf8"),
  readFile(p("src", "data.js"), "utf8"),
  readFile(p("src", "app.js"), "utf8")
]);
await writeFile(p("index.html"), head + dataJs + app + "\n</script>\n</body>\n</html>\n", "utf8");

const n = (s) => (s.match(/\n/g) || []).length;
console.log(offline
  ? "index.html пересобран из сохранённых данных"
  : `Готово: ${data.GAMES.length} матчей, ${data.SEASONS.length} сезонов, ` +
    `${data.ROSTER.length} игроков в заявке, ${data.PHOTOS.length} фото, ${n(dataJs)} строк данных`);

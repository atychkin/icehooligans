/**
 * Собирает две страницы сайта: index.html (статистика) и photos.html (фотоархив).
 * Данные тянутся из API лиги и складываются в src/data.js + src/photos-data.js
 *
 *   node build/build.mjs            — собрать со свежими данными
 *   node build/build.mjs --offline  — пересобрать из сохранённых данных
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { collect } from "./collect.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => join(ROOT, ...x);
const offline = process.argv.includes("--offline");

/* данные для обеих страниц */
const KEYS = ["TEAM", "GAMES", "UPCOMING", "SEASONS", "TOTAL", "TABLES",
  "PLAYERS", "PHOTO", "ACH", "ACH_NAMES", "ROSTER",
  "PHOTOS_PREVIEW", "PHOTOS_TOTAL", "BUILT_AT"];

const HEADER = (d) => "/* Данные собраны автоматически из API ХЛ «Трудовые Резервы». Не редактировать вручную. */\n" +
  "/* Обновлено: " + d.BUILT_AT + " */\n\n";

const decl = (k, v, pretty) => "const " + k + " = " + JSON.stringify(v, null, pretty ? 2 : 0) + ";";

function sanity(d) {
  const errs = [];
  if (d.GAMES.length < 50) errs.push("матчей всего " + d.GAMES.length);
  if (!d.SEASONS.length) errs.push("не найдено ни одного сезона");
  if (!d.ROSTER.length) errs.push("пустая заявка");
  if (!Object.keys(d.PLAYERS).length) errs.push("нет статистики игроков");
  if (!d.PHOTO_GAMES.length) errs.push("пустой фотоархив");
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
  await writeFile(p("src", "data.js"),
    HEADER(data) + KEYS.map((k) => decl(k, data[k], k === "TEAM")).join("\n\n") + "\n", "utf8");
  await writeFile(p("src", "photos-data.js"),
    "/* Фотоархив по матчам. Генерируется автоматически. */\n" +
    decl("PHOTO_GAMES", data.PHOTO_GAMES) + "\n", "utf8");
}

const read = (...x) => readFile(p(...x), "utf8");
const [base, indexBody, photosBody, foot, dataJs, photosData, lightbox, app, photosJs] = await Promise.all([
  read("src", "base-head.html"), read("src", "index-body.html"), read("src", "photos-body.html"),
  read("src", "foot.html"), read("src", "data.js"), read("src", "photos-data.js"),
  read("src", "lightbox.js"), read("src", "app.js"), read("src", "photos.js")
]);

const page = (title, desc, body, scripts) =>
  base.replace("{{TITLE}}", title).replace("{{DESC}}", desc) +
  body + foot + scripts.join("\n") + "\n</script>\n</body>\n</html>\n";

await writeFile(p("index.html"), page(
  "HC ICE HOOLIGANS — любительский хоккейный клуб, Москва",
  "Официальная статистика хоккейного клуба ICE HOOLIGANS: составы, календарь, результаты всех матчей, статистика игроков и фотоархив.",
  indexBody, [dataJs, lightbox, app]), "utf8");

await writeFile(p("photos.html"), page(
  "Фотоархив HC ICE HOOLIGANS — по матчам, годам и месяцам",
  "Фотографии с матчей хоккейного клуба ICE HOOLIGANS, разложенные по годам, месяцам и играм.",
  photosBody, [dataJs, photosData, lightbox, photosJs]), "utf8");

const shots = (photosData.match(/\.(jpe?g|png)/gi) || []).length;
console.log(offline
  ? `Страницы пересобраны из сохранённых данных (в архиве ~${shots} фото)`
  : `Готово: ${data.GAMES.length} матчей, ${data.SEASONS.length} сезонов, ` +
    `${data.ROSTER.length} игроков в заявке, ${data.PHOTOS_TOTAL} фото с ${data.PHOTO_GAMES.length} матчей`);

/* ================= ОБЩЕЕ: адреса файлов и просмотрщик ================= */
const FS = "https://fs.mtgame.ru/";
const RU_M = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const RU_MONTH = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const $ = (s, r) => (r || document).querySelector(s);

/* лига хранит рядом с оригиналом уменьшенные копии */
const thumbUrl = (f) => FS + f.replace(/(\.[^.]+)$/, "_500x500$1");
const bigUrl = (f) => FS + f.replace(/(\.[^.]+)$/, "_1920x1080$1");
const origUrl = (f) => FS + f;

function dfmt(iso){
  const d = new Date(iso + "T12:00:00");
  return d.getDate() + " " + RU_M[d.getMonth()] + " " + d.getFullYear();
}

/* просмотрщик: LB.open(["файл.jpg", ...], индекс, "подпись") */
const LB = (() => {
  const box = $("#lb"), img = $("#lb img"), cap = $("#lb .cap");
  let list = [], i = 0, caption = "";
  function show(n){
    if (!list.length) return;
    i = (n + list.length) % list.length;
    img.src = bigUrl(list[i]);
    cap.innerHTML = (caption ? caption + " · " : "") + (i + 1) + " из " + list.length +
      ' · <a href="' + origUrl(list[i]) + '" target="_blank" rel="noopener" style="color:var(--acc2)">оригинал</a>';
    box.classList.add("on");
  }
  if (box) {
    $("#lb .x").onclick = () => box.classList.remove("on");
    $("#lb .p").onclick = (e) => { e.stopPropagation(); show(i - 1); };
    $("#lb .n").onclick = (e) => { e.stopPropagation(); show(i + 1); };
    box.addEventListener("click", (e) => { if (e.target === box) box.classList.remove("on"); });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("on")) return;
      if (e.key === "Escape") box.classList.remove("on");
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
  }
  return { open(files, index, text){ list = files; caption = text || ""; show(index || 0); } };
})();

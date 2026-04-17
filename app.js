/* ═══════════════════════════════════════
   مخطط رحلتي — app.js
═══════════════════════════════════════ */

/* ─────────────────────────────────────
   Data Layer
───────────────────────────────────── */
const DAY_NAMES = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
];

let data = { days: [] };

function getDayLabel(di) {
  return DAY_NAMES[di] || `${di + 1}`;
}

function initData() {
  // Try v4 first, then migrate from v3
  let saved = localStorage.getItem("travel-plan-v4") || localStorage.getItem("travel-plan-v3");
  if (saved) {
    try {
      data = JSON.parse(saved);
      // Migrate old fields from previous versions
      data.days.forEach((d) =>
        d.places.forEach((p) => {
          if (p.status !== undefined && p.visited === undefined) {
            p.visited = p.status === "تم الزيارة";
          }
          delete p.status;
          delete p.timeFrom;
          delete p.timeTo;
          delete p.cost;
        })
      );
      return;
    } catch (e) {
      /* corrupted — fall through to default */
    }
  }
  data.days = [{ id: Date.now(), date: "", places: [] }];
}

function save() {
  localStorage.setItem("travel-plan-v4", JSON.stringify(data));
  updateSummary();
}

function updateSummary() {
  let places = 0,
    visited = 0;
  data.days.forEach((d) => {
    places += d.places.length;
    d.places.forEach((p) => {
      if (p.visited) visited++;
    });
  });
  document.getElementById("total-places").textContent = places;
  document.getElementById("total-days").textContent = data.days.length;
  document.getElementById("total-visited").textContent = visited;
}

/* ─────────────────────────────────────
   Custom Modal  (replaces browser confirm —
   browser confirm is blocked on many mobile browsers)
───────────────────────────────────── */
let _cb = null;

function showConfirm(title, msg, onConfirm) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-msg").textContent = msg;
  _cb = onConfirm;
  document.getElementById("confirm-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("confirm-modal").classList.add("hidden");
  _cb = null;
}

function initModal() {
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      closeModal();
    },
    { passive: false }
  );

  document.getElementById("modal-confirm").addEventListener("click", () => {
    const fn = _cb;
    closeModal();
    if (fn) fn(); // save ref BEFORE closeModal clears _cb
  });
  document.getElementById("modal-confirm").addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const fn = _cb;
      closeModal();
      if (fn) fn();
    },
    { passive: false }
  );

  document.getElementById("confirm-modal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });
}

/* ─────────────────────────────────────
   Days
───────────────────────────────────── */
function addDay() {
  data.days.push({ id: Date.now(), date: "", places: [] });
  save();
  renderAll();
  setTimeout(() => {
    document
      .querySelectorAll(".day-card")
      [data.days.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function deleteDay(di) {
  if (data.days.length === 1) {
    showConfirm("تنبيه", "لا يمكن حذف اليوم الأخير — يجب أن يكون هناك يوم واحد على الأقل.", null);
    return;
  }
  showConfirm(`حذف اليوم ${getDayLabel(di)}`, "سيتم حذف اليوم وجميع أماكنه. هل أنت متأكد؟", () => {
    data.days.splice(di, 1);
    save();
    renderAll();
  });
}

function updateDate(di, val) {
  data.days[di].date = val;
  save();
}

function toggleDay(di) {
  document.getElementById(`day-body-${di}`)?.classList.toggle("open");
  document.getElementById(`day-toggle-${di}`)?.classList.toggle("open");
}

/* ─────────────────────────────────────
   Places
───────────────────────────────────── */
function addPlace(di) {
  data.days[di].places.push({ id: Date.now(), name: "", mapUrl: "", visited: false, notes: "" });
  save();
  renderDay(di);
  const ni = data.days[di].places.length - 1;
  document.getElementById(`pb-${di}-${ni}`)?.classList.add("open");
  document.getElementById(`pi-${di}-${ni}`)?.classList.add("open");
}

function deletePlace(di, pi) {
  const name = data.days[di].places[pi].name || "هذا المكان";
  showConfirm("حذف المكان", `هل أنت متأكد من حذف "${name}"؟`, () => {
    data.days[di].places.splice(pi, 1);
    save();
    renderDay(di);
  });
}

function updatePlace(di, pi, field, value) {
  data.days[di].places[pi][field] = value;
  save();
  if (field === "visited") {
    const lbl = document.getElementById(`vl-${di}-${pi}`);
    if (lbl) lbl.textContent = value ? "تمت الزيارة ✅" : "لم تتم الزيارة";
    refreshMeta(di, pi);
  }
  if (field === "name") refreshMeta(di, pi);
}

function refreshMeta(di, pi) {
  const p = data.days[di].places[pi];
  const nameEl = document.getElementById(`pn-${di}-${pi}`);
  const metaEl = document.getElementById(`pm-${di}-${pi}`);
  if (nameEl) {
    nameEl.textContent = p.name || "مكان جديد";
    nameEl.className = "place-header-name" + (p.name ? "" : " empty");
  }
  if (metaEl) {
    metaEl.innerHTML = `<span class="status-dot" style="background:${p.visited ? "#3DA89A" : "#aaa"}"></span>
      ${p.visited ? "تمت الزيارة ✅" : "لم تتم الزيارة"}`;
  }
}

function togglePlace(di, pi) {
  document.getElementById(`pb-${di}-${pi}`)?.classList.toggle("open");
  document.getElementById(`pi-${di}-${pi}`)?.classList.toggle("open");
}

function openMapUrl(di, pi) {
  const p = data.days[di].places[pi];
  const q = p.mapUrl || p.name;
  if (!q) return;
  const url = q.startsWith("http")
    ? q
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  window.open(url, "_blank");
}

/* ─────────────────────────────────────
   Render — Places
───────────────────────────────────── */
function buildPlaceHTML(p, di, pi) {
  return `
    <div class="place-card">
      <div class="place-card-header">
        <div class="place-num place-tap" data-di="${di}" data-pi="${pi}">${pi + 1}</div>
        <div class="place-header-info place-tap" data-di="${di}" data-pi="${pi}">
          <div class="place-header-name${p.name ? "" : " empty"}" id="pn-${di}-${pi}">
            ${esc(p.name) || "مكان جديد"}
          </div>
          <div class="place-header-meta" id="pm-${di}-${pi}">
            <span class="status-dot" style="background:${p.visited ? "#3DA89A" : "#aaa"}"></span>
            ${p.visited ? "تمت الزيارة ✅" : "لم تتم الزيارة"}
          </div>
        </div>
        <span class="place-toggle-icon place-tap" id="pi-${di}-${pi}" data-di="${di}" data-pi="${pi}">▾</span>
        <button class="delete-place place-del" data-di="${di}" data-pi="${pi}" aria-label="حذف المكان">✕</button>
      </div>

      <div class="place-card-body" id="pb-${di}-${pi}">
        <div class="place-fields">

          <div class="field-group">
            <div class="field-label">📍 اسم المكان</div>
            <input class="field-input" type="text"
              placeholder="مثال: برج إيفل، متحف اللوفر..."
              value="${esc(p.name)}"
              oninput="updatePlace(${di},${pi},'name',this.value)">
          </div>

          <div class="field-group">
            <div class="field-label">🔗 رابط خرائط جوجل</div>
            <input class="field-input" type="url"
              placeholder="الصق الرابط هنا أو اتركه لبحث تلقائي"
              value="${esc(p.mapUrl)}"
              onchange="updatePlace(${di},${pi},'mapUrl',this.value)">
          </div>

          <div class="field-group">
            <label class="visited-toggle">
              <input type="checkbox" ${p.visited ? "checked" : ""}
                onchange="updatePlace(${di},${pi},'visited',this.checked)">
              <span class="visited-track"><span class="visited-thumb"></span></span>
              <span class="visited-label" id="vl-${di}-${pi}">
                ${p.visited ? "تمت الزيارة ✅" : "لم تتم الزيارة"}
              </span>
            </label>
          </div>

          <div class="field-group">
            <div class="field-label">📝 ملاحظات</div>
            <textarea class="field-input notes-input"
              placeholder="أي ملاحظات إضافية..."
              onchange="updatePlace(${di},${pi},'notes',this.value)">${esc(p.notes)}</textarea>
          </div>

          <button class="map-btn" onclick="openMapUrl(${di},${pi})">🗺️ فتح في خرائط جوجل</button>

        </div>
      </div>
    </div>`;
}

function renderDay(di) {
  const wrap = document.getElementById(`day-inner-${di}`);
  if (!wrap) return;
  const day = data.days[di];

  wrap.innerHTML =
    day.places.length === 0
      ? `<div class="empty-state"><div class="icon">📍</div><div>لا يوجد أماكن بعد<br>اضغط + لإضافة مكان</div></div>`
      : day.places.map((p, pi) => buildPlaceHTML(p, di, pi)).join("");

  // Event delegation — tap to toggle, separate delete button
  wrap.querySelectorAll(".place-tap").forEach((el) => {
    el.addEventListener("click", () => togglePlace(+el.dataset.di, +el.dataset.pi));
  });
  wrap.querySelectorAll(".place-del").forEach((btn) => {
    const go = (e) => {
      e.stopPropagation();
      e.preventDefault();
      deletePlace(+btn.dataset.di, +btn.dataset.pi);
    };
    btn.addEventListener("click", go);
    btn.addEventListener("touchend", go, { passive: false });
  });

  updateSummary();
}

/* ─────────────────────────────────────
   Render — Days
───────────────────────────────────── */
function buildDayHTML(day, di) {
  return `
    <div class="day-card">
      <div class="day-header" id="dh-${di}">
        <div class="day-header-right">
          <span class="day-badge">اليوم ${getDayLabel(di)}</span>
          <input class="day-date-input" type="date"
            value="${esc(day.date)}"
            onchange="updateDate(${di},this.value)"
            onclick="event.stopPropagation()"
            ontouchstart="event.stopPropagation()">
        </div>
        <div class="day-header-left">
          <button class="delete-day-btn day-del-btn" data-di="${di}" aria-label="حذف اليوم">🗑️</button>
          <button class="day-toggle-btn open" id="day-toggle-${di}" data-di="${di}" aria-label="توسيع/طي">▾</button>
        </div>
      </div>
      <div class="day-body open" id="day-body-${di}">
        <div id="day-inner-${di}"></div>
        <button class="add-place-btn" onclick="addPlace(${di})">＋ إضافة مكان</button>
      </div>
    </div>`;
}

function renderAll() {
  const container = document.getElementById("days-container");
  container.innerHTML =
    data.days.map((day, di) => buildDayHTML(day, di)).join("") +
    `<button class="add-day-btn" onclick="addDay()">＋ إضافة يوم جديد</button>`;

  data.days.forEach((_, di) => {
    // Whole header click (excluding buttons & input)
    const hdr = document.getElementById(`dh-${di}`);
    hdr?.addEventListener("click", (e) => {
      if (e.target.closest("button,input")) return;
      toggleDay(di);
    });

    // Toggle button
    const tBtn = document.getElementById(`day-toggle-${di}`);
    const tGo = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleDay(di);
    };
    tBtn?.addEventListener("click", tGo);
    tBtn?.addEventListener("touchend", tGo, { passive: false });

    // Delete day button
    const dBtn = hdr?.querySelector(".day-del-btn");
    const dGo = (e) => {
      e.stopPropagation();
      e.preventDefault();
      deleteDay(di);
    };
    dBtn?.addEventListener("click", dGo);
    dBtn?.addEventListener("touchend", dGo, { passive: false });

    renderDay(di);
  });
}

/* ─────────────────────────────────────
   Utilities
───────────────────────────────────── */
function esc(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* تصدير البيانات كملف JSON قابل للاسترداد */
function exportPlan() {
  const backup = {
    version: 4,
    exportedAt: new Date().toISOString(),
    data: data,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `رحلتي-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

/* استرداد البيانات من ملف JSON */
function importPlan() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // قبول ملف backup جديد أو data مباشرة
        const imported = parsed.data || parsed;
        if (!imported.days || !Array.isArray(imported.days)) {
          showConfirm(
            "خطأ في الملف",
            "الملف غير صالح أو تالف. تأكد أنه ملف تصدير من مخطط رحلتي.",
            null
          );
          return;
        }
        showConfirm(
          "استرداد البيانات",
          `سيتم استبدال البيانات الحالية بـ ${imported.days.length} يوم من الملف. هل أنت متأكد؟`,
          () => {
            data = imported;
            // تنظيف الحقول القديمة عند الاستيراد
            data.days.forEach((d) =>
              d.places.forEach((p) => {
                if (p.status !== undefined && p.visited === undefined)
                  p.visited = p.status === "تم الزيارة";
                delete p.status;
                delete p.timeFrom;
                delete p.timeTo;
                delete p.cost;
              })
            );
            save();
            renderAll();
          }
        );
      } catch {
        showConfirm("خطأ", "تعذّر قراءة الملف. تأكد أنه ملف JSON صحيح.", null);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ─────────────────────────────────────
   Boot
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initModal();
  initData();
  renderAll();
});

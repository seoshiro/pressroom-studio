import "./style.css";
import {
  defaults,
  clone,
  validate,
  parseProject,
  History,
  palettes,
  templates,
  size,
  type Doc,
  type Lang,
} from "./model";
import { loadFonts, render, pngBlob, missingGlyphs } from "./render";
import { copy } from "./i18n";
interface Work {
  id: string;
  doc: Doc;
}
const key = "pressroom.v1";
let doc = clone(defaults),
  lang: Lang = "ru",
  works: Work[] = [],
  storageOk = true,
  notice = "";
try {
  const raw = localStorage.getItem(key);
  if (raw) {
    const data = JSON.parse(raw);
    const restoredDoc = validate(data.doc);
    const restoredWorks = Array.isArray(data.works)
      ? data.works.slice(0, 12).map((w: Work) => ({
          id: String(w.id).slice(0, 64),
          doc: validate(w.doc),
        }))
      : [];
    doc = restoredDoc;
    works = restoredWorks;
    lang = data.lang === "en" ? "en" : "ru";
  }
} catch (error) {
  storageOk = false;
  notice =
    error instanceof DOMException && error.name === "SecurityError"
      ? ""
      : "corrupt";
}
const history = new History();
const app = document.querySelector<HTMLDivElement>("#app")!;
let activeTab = "text",
  svg = "",
  printing = false,
  exporting = false;
const t = () => copy[lang];
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icon = (name: string) =>
  `<span aria-hidden="true">${({ undo: "↶", redo: "↷", help: "?", works: "▦", save: "＋", reset: "↺", print: "↳", shuffle: "⤨", download: "↓" } as Record<string, string>)[name] || name}</span>`;
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify({ doc, lang, works }));
    storageOk = true;
  } catch {
    storageOk = false;
  }
  updateStatus();
}
function updateStatus() {
  const el = document.getElementById("status");
  if (el) {
    el.textContent = storageOk ? t().saved : t().memory;
    el.classList.toggle("warning", !storageOk);
  }
}
function toast(message: string) {
  const el = document.getElementById("toast")!;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 5000);
}
let toastTimer = 0;
function range(
  k: keyof Doc,
  label: string,
  min: number,
  max: number,
  step = 1,
  suffix = "",
) {
  return `<label class="range-label" for="${k}"><span>${label}</span><output id="value-${k}">${doc[k]}${suffix}</output></label><input data-prop="${k}" id="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${doc[k]}"/>`;
}
function shell() {
  const focused = document.activeElement as HTMLElement | null;
  const focusedId = focused?.id;
  const focusedPalette = focused?.dataset.palette;
  const scroll = document.querySelector(".control-scroll")?.scrollTop || 0;
  document.documentElement.lang = lang;
  app.innerHTML = `<header class="topbar"><a class="brand" href="./" aria-label="PRESSROOM"><span class="registration" aria-hidden="true">⊕</span>PRESSROOM<span class="brand-dot">®</span></a><span class="top-tag">${t().tag}</span><nav aria-label="${t().studio}"><button id="works-button" aria-label="${t().works}">${icon("works")}<span>${t().works}</span></button><button id="help-button" class="icon-btn" aria-label="${t().help}">${icon("help")}</button><button id="language" aria-label="${lang === "ru" ? "Switch to English" : "Переключить на русский"}">${lang === "ru" ? "EN" : "RU"}<span aria-hidden="true"> ↗</span></button></nav></header>
 <main><section class="intro"><div><p class="eyebrow">EST. 2026 / DIGITAL PRINT LAB</p><h1>${t().heading}</h1></div><p class="intro-copy">${t().intro}<br><span>${t().local}</span></p></section>
 <section class="studio" aria-label="${t().studio}"><aside class="templates"><div class="section-heading"><h2>${t().templates}</h2><span>01—05</span></div><div class="template-list">${templates.map((id, i) => `<button class="template" data-template="${id}" aria-pressed="${doc.template === id}"><span class="thumb" data-thumb="${id}" aria-hidden="true"></span><span class="template-caption"><span class="template-name"><b>${String(i + 1).padStart(2, "0")}</b> ${t().templateNames[i]}</span><small>${t().templateKinds[i]}</small></span></button>`).join("")}</div></aside>
 <div class="workbench"><div class="paper-toolbar"><div class="history"><button id="undo" class="icon-btn" aria-label="${t().undo}" title="${t().undo} (Ctrl Z)">${icon("undo")}</button><button id="redo" class="icon-btn" aria-label="${t().redo}" title="${t().redo} (Ctrl Shift Z)">${icon("redo")}</button><span class="toolbar-rule"></span><button id="reset" class="icon-btn" aria-label="${t().reset}" title="${t().reset}">${icon("reset")}</button></div><span id="dimensions"></span><button id="save" class="save-button">${icon("save")} ${t().save}</button></div><div class="paper-area"><div class="ruler ruler-top" aria-hidden="true"></div><div class="ruler ruler-side" aria-hidden="true"></div><div class="paper" id="poster" aria-label="${t().finished}"></div><span class="desk-stamp" aria-hidden="true">PRESSROOM<br>ORIGINAL / ${String(doc.seed).padStart(5, "0")}</span><div id="press-pass" aria-hidden="true"></div></div><div class="desk-footer"><span id="status" role="status"></span><span class="rgb">RGB / WEB PRINT</span></div></div>
 <aside class="controls" id="controls"><div class="control-tabs" role="tablist" aria-label="${t().graphics}">${[
   ["text", t().text],
   ["colour", t().colour],
   ["press", t().press],
 ]
   .map(
     ([id, name]) =>
       `<button id="tab-${id}" role="tab" aria-selected="${activeTab === id}" aria-controls="panel-${id}" tabindex="${activeTab === id ? 0 : -1}" data-tab="${id}">${name}</button>`,
   )
   .join("")}</div>
 <div class="control-scroll"><section id="panel-text" role="tabpanel" aria-labelledby="tab-text" ${activeTab !== "text" ? "hidden" : ""}><label for="title">${t().title}</label><textarea id="title" data-prop="title" maxlength="160" rows="3" aria-describedby="title-hint"></textarea><p id="title-hint" class="hint">${t().titleHint}</p><label for="subtitle">${t().subtitle}</label><textarea id="subtitle" data-prop="subtitle" maxlength="240" rows="3"></textarea><label for="note">${t().note}</label><input id="note" data-prop="note" maxlength="100"/><div class="rule"></div><label for="format">${t().format}</label><select id="format" data-prop="format">${["portrait", "square", "landscape"].map((f) => `<option value="${f}" ${doc.format === f ? "selected" : ""}>${t()[f as "portrait"]}</option>`).join("")}</select><div class="rule"></div><h3>${t().graphics}</h3>${range("scale", t().scale, 0.75, 1.15, 0.01)}${range("x", t().positionX, -40, 40)}${range("y", t().positionY, -40, 40)}${range("rotation", t().rotation, -12, 12, 1, "°")}</section>
 <section id="panel-colour" role="tabpanel" aria-labelledby="tab-colour" ${activeTab !== "colour" ? "hidden" : ""}><h3>${t().palette}</h3><div class="palettes">${palettes.map((p, i) => `<button data-palette="${i}" aria-pressed="${doc.palette === i}"><span class="swatches" aria-hidden="true">${p.inks.map((c) => `<i style="background:${c}"></i>`).join("")}</span><span>${p.name[lang === "ru" ? 0 : 1]}</span><span aria-hidden="true" class="palette-check">${doc.palette === i ? "✓" : ""}</span></button>`).join("")}</div><div class="rule"></div><h3>${t().layers}</h3>${t()
   .layerNames.map(
     (name, i) =>
       `<label class="layer"><i style="background:${palettes[doc.palette].inks[i]}"></i><span>0${i + 1} / ${name}</span><input data-layer="${i}" type="checkbox" ${doc.layers[i] ? "checked" : ""}/></label>`,
   )
   .join(
     "",
   )}<p class="hint">${lang === "ru" ? "Выключи слой, чтобы увидеть разделение красок." : "Turn off a layer to see the ink separations."}</p><div class="rule"></div>${range("opacity", t().opacity, 40, 100, 1, "%")}<label class="checkbox"><input id="blend" data-prop="blend" type="checkbox" ${doc.blend ? "checked" : ""}/>${t().blend}</label></section>
 <section id="panel-press" role="tabpanel" aria-labelledby="tab-press" ${activeTab !== "press" ? "hidden" : ""}><h3>${t().press}</h3>${range("registration", t().registration, 0, 12, 1, " px")}${range("halftone", t().halftone, 0, 80, 1, "%")}${range("grain", t().grain, 0, 40, 1, "%")}<p class="hint">${lang === "ru" ? "Небольшой сдвиг и зерно придают отпечатку живой характер." : "A little offset and grain give your print a human touch."}</p><div class="rule"></div><h3>${t().export}</h3><div class="export-buttons"><button data-export="png">PNG <span>↓ 3×</span></button><button data-export="svg">SVG <span>↓</span></button></div><p class="hint">${t().exportHint}</p><button class="wide secondary" data-export="json">${t().json} ↓</button><button class="wide secondary" id="import-button">${t().import} ↗</button><input hidden type="file" id="file" accept=".json,application/json"/></section>
 </div><div class="control-bottom"><p id="glyph-warning" class="hint warning" hidden></p><button id="shuffle" class="wide secondary">${icon("shuffle")} ${t().variation}<span class="seed">${t().seed} <b id="seed"></b></span></button><button id="print" class="wide print-button">${t().print} ${icon("print")}</button></div></aside></section>
 <footer class="page-footer"><span>${t().about}</span><span>WORDS → INK → PAPER</span></footer></main><div class="mobile-dock"><button id="mobile-controls">${t().graphics} ↑</button><button id="mobile-print" class="primary">${t().print} ↳</button></div><div id="toast" role="status" hidden></div><dialog id="modal"></dialog>`;
  for (const k of ["title", "subtitle", "note"] as const)
    (document.getElementById(k) as HTMLInputElement).value = doc[k];
  bind();
  refresh(true);
  const nextFocus =
    focusedPalette !== undefined
      ? document.querySelector<HTMLElement>(
          `[data-palette="${focusedPalette}"]`,
        )
      : focusedId
        ? document.getElementById(focusedId)
        : null;
  nextFocus?.focus({ preventScroll: true });
  const scroller = document.querySelector(".control-scroll");
  if (scroller) scroller.scrollTop = scroll;
  if (notice) {
    toast(t()[notice as "corrupt"]);
    notice = "";
  }
}
function refresh(thumbs = false) {
  svg = render(doc);
  document.getElementById("poster")!.innerHTML = svg;
  const [w, h] = size(doc);
  document.getElementById("dimensions")!.textContent = `${w * 3} × ${h * 3} PX`;
  document.getElementById("seed")!.textContent = String(doc.seed).padStart(
    5,
    "0",
  );
  (document.getElementById("undo") as HTMLButtonElement).disabled =
    !history.past.length;
  (document.getElementById("redo") as HTMLButtonElement).disabled =
    !history.future.length;
  const missing = missingGlyphs(doc),
    warn = document.getElementById("glyph-warning")!;
  warn.hidden = !missing && doc.layers.some(Boolean);
  warn.textContent = missing ? t().glyph + missing + t().glyphHint : t().allOff;
  document
    .querySelectorAll<HTMLButtonElement>("[data-template]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(doc.template === b.dataset.template),
      ),
    );
  if (thumbs)
    document.querySelectorAll<HTMLElement>("[data-thumb]").forEach(
      (el) =>
        (el.innerHTML = render({
          ...clone(defaults),
          template: el.dataset.thumb as Doc["template"],
          palette: doc.palette,
        })),
    );
  updateStatus();
}
function change(next: Doc, rebuild = false) {
  history.push(doc);
  doc = next;
  persist();
  if (rebuild) shell();
  else refresh();
}
function restore(next: Doc | undefined) {
  if (next) {
    doc = next;
    persist();
    shell();
  }
}
function modal(content: string, handler?: () => void) {
  const dlg = document.getElementById("modal") as HTMLDialogElement;
  dlg.innerHTML = content;
  dlg.setAttribute(
    "aria-label",
    dlg.querySelector("h2")?.textContent || t().works,
  );
  dlg.showModal();
  dlg
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", () => dlg.close()));
  handler?.();
}
function confirmAction(title: string, body: string, action: () => void) {
  modal(
    `<div class="dialog-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="${t().close}">×</button></div><p>${body}</p><div class="dialog-actions"><button data-close autofocus>${t().cancel}</button><button id="confirm" class="primary">${t().confirm}</button></div>`,
    () =>
      (document.getElementById("confirm")!.onclick = () => {
        (document.getElementById("modal") as HTMLDialogElement).close();
        action();
      }),
  );
}
async function download(kind: string) {
  if (exporting) return;
  const exportDoc = clone(doc),
    exportSvg = svg;
  exporting = true;
  document
    .querySelectorAll<HTMLButtonElement>("[data-export]")
    .forEach((b) => (b.disabled = true));
  try {
    const blob =
      kind === "png"
        ? await pngBlob(exportSvg, exportDoc.format)
        : new Blob(
            [kind === "json" ? JSON.stringify(exportDoc, null, 2) : exportSvg],
            {
              type: kind === "json" ? "application/json" : "image/svg+xml",
            },
          );
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `pressroom-${exportDoc.template}-${exportDoc.seed}.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(t().exported);
  } catch {
    toast(t().exportError);
  } finally {
    exporting = false;
    document
      .querySelectorAll<HTMLButtonElement>("[data-export]")
      .forEach((b) => (b.disabled = false));
  }
}
function collection() {
  modal(
    `<div class="dialog-head"><h2>${t().works}</h2><button class="icon-btn" data-close aria-label="${t().close}">×</button></div>${works.length ? `<div class="work-grid">${works.map((w, i) => `<article><button data-open="${i}" class="work-open"><span aria-hidden="true">${render(w.doc)}</span><b>${esc(w.doc.title.replace(/\n/g, " ") || t().blank)}</b></button><button data-delete="${i}" class="delete" aria-label="${t().deleteLabel} ${i + 1}">${t().delete} ×</button></article>`).join("")}</div>` : `<div class="empty"><span aria-hidden="true">▦</span><h3>${t().empty}</h3><p>${t().emptyHint}</p></div>`}`,
    () => {
      document.querySelectorAll<HTMLElement>("[data-open]").forEach(
        (b) =>
          (b.onclick = () => {
            const next = clone(works[Number(b.dataset.open)].doc);
            (document.getElementById("modal") as HTMLDialogElement).close();
            change(next, true);
            toast(t().loaded);
          }),
      );
      document.querySelectorAll<HTMLElement>("[data-delete]").forEach(
        (b) =>
          (b.onclick = () => {
            const index = Number(b.dataset.delete);
            (document.getElementById("modal") as HTMLDialogElement).close();
            confirmAction(t().deleteTitle, t().deleteBody, () => {
              works.splice(index, 1);
              persist();
              collection();
            });
          }),
      );
    },
  );
}
function makePrint() {
  if (printing) return;
  printing = true;
  const enabled = [
    ...document.querySelectorAll<
      | HTMLButtonElement
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >("button:not(:disabled), input, textarea, select"),
  ];
  enabled.forEach((el) => (el.disabled = true));
  const button = document.getElementById("print") as HTMLButtonElement;
  button.disabled = true;
  button.textContent = t().printing;
  document.querySelector(".paper-area")!.classList.add("printing");
  const done = () => {
    printing = false;
    enabled.forEach((el) => (el.disabled = false));
    document.querySelector(".paper-area")!.classList.remove("printing");
    button.disabled = false;
    button.innerHTML = t().print + " " + icon("print");
    modal(
      `<div class="dialog-head"><div><p class="eyebrow">PRESSROOM / ${String(doc.seed).padStart(5, "0")}</p><h2>${t().ready}</h2></div><button class="icon-btn" data-close aria-label="${t().close}">×</button></div><div class="finished-poster">${svg}</div><div class="dialog-actions"><button data-close>${t().back}</button><button data-export="svg">SVG ↓</button><button data-export="png" class="primary">PNG ↓ 3×</button></div><p class="hint">${t().exportHint}</p>`,
      () =>
        document
          .querySelectorAll<HTMLButtonElement>("#modal [data-export]")
          .forEach(
            (b) =>
              (b.onclick = () => {
                void download(b.dataset.export!);
              }),
          ),
    );
  };
  window.setTimeout(
    done,
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 850,
  );
}
function bind() {
  document.getElementById("mobile-controls")!.onclick = () =>
    document.getElementById("controls")!.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  document.getElementById("mobile-print")!.onclick = makePrint;
  document.getElementById("language")!.onclick = () => {
    lang = lang === "ru" ? "en" : "ru";
    persist();
    shell();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
    b.onclick = () => {
      activeTab = b.dataset.tab!;
      document.querySelectorAll("[role=tab]").forEach((el) => {
        el.setAttribute("aria-selected", String(el === b));
        el.setAttribute("tabindex", el === b ? "0" : "-1");
      });
      document
        .querySelectorAll<HTMLElement>("[role=tabpanel]")
        .forEach((el) => (el.hidden = el.id !== `panel-${activeTab}`));
    };
    b.onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const tabs = [
          ...document.querySelectorAll<HTMLButtonElement>("[data-tab]"),
        ];
        let i = tabs.indexOf(b);
        i =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? 2
              : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
        tabs[i].click();
        tabs[i].focus();
      }
    };
  });
  document
    .querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("[data-prop]")
    .forEach(
      (el) =>
        (el.oninput = () => {
          const k = el.dataset.prop as keyof Doc;
          const value =
            el instanceof HTMLInputElement && el.type === "checkbox"
              ? el.checked
              : el instanceof HTMLInputElement && el.type === "range"
                ? Number(el.value)
                : el.value;
          change({ ...doc, [k]: value });
          const out = document.getElementById("value-" + k);
          if (out)
            out.textContent =
              el.value +
              (k === "rotation"
                ? "°"
                : ["grain", "halftone", "opacity"].includes(k)
                  ? "%"
                  : k === "registration"
                    ? " px"
                    : "");
        }),
    );
  document.querySelectorAll<HTMLInputElement>("[data-layer]").forEach(
    (el) =>
      (el.onchange = () => {
        const layers = [...doc.layers];
        layers[Number(el.dataset.layer)] = el.checked;
        change({ ...doc, layers });
      }),
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-palette]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          change({ ...doc, palette: Number(b.dataset.palette) }, true)),
    );
  document.querySelectorAll<HTMLButtonElement>("[data-template]").forEach(
    (b) =>
      (b.onclick = () => {
        if (doc.template !== b.dataset.template)
          change({ ...doc, template: b.dataset.template as Doc["template"] });
      }),
  );
  document.getElementById("undo")!.onclick = () => restore(history.undo(doc));
  document.getElementById("redo")!.onclick = () => restore(history.redo(doc));
  document.getElementById("reset")!.onclick = () =>
    confirmAction(t().resetTitle, t().resetBody, () =>
      change(clone(defaults), true),
    );
  document.getElementById("shuffle")!.onclick = () =>
    change({ ...doc, seed: ((Math.imul(doc.seed, 48271) >>> 0) % 99999) + 1 });
  document.getElementById("save")!.onclick = () => {
    if (works.length >= 12) {
      toast(t().limit);
      return;
    }
    if (!storageOk) {
      persist();
      if (!storageOk) {
        toast(t().memory);
        return;
      }
    }
    works.push({ id: crypto.randomUUID(), doc: clone(doc) });
    persist();
    toast(storageOk ? t().saveOk : t().memory);
  };
  document.getElementById("works-button")!.onclick = collection;
  document.getElementById("print")!.onclick = makePrint;
  document.getElementById("help-button")!.onclick = () =>
    modal(
      `<div class="dialog-head"><h2>${t().guideTitle}</h2><button class="icon-btn" data-close aria-label="${t().close}">×</button></div><ol class="guide">${t()
        .steps.map((s) => `<li>${s}</li>`)
        .join(
          "",
        )}</ol><p class="hint">${t().guideNote}</p><button data-close class="primary wide">${t().back}</button>`,
    );
  document.querySelectorAll<HTMLButtonElement>("[data-export]").forEach(
    (b) =>
      (b.onclick = () => {
        void download(b.dataset.export!);
      }),
  );
  document.getElementById("import-button")!.onclick = () =>
    (document.getElementById("file") as HTMLInputElement).click();
  (document.getElementById("file") as HTMLInputElement).onchange = async (
    e,
  ) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      if (f.size > 32768) throw new Error("size");
      const next = parseProject(await f.text());
      confirmAction(t().importTitle, t().importBody, () => {
        change(next, true);
        toast(t().imported);
      });
    } catch {
      toast(t().invalid);
    } finally {
      input.value = "";
    }
  };
}
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) &&
    !(document.getElementById("modal") as HTMLDialogElement)?.open
  ) {
    e.preventDefault();
    restore(e.shiftKey ? history.redo(doc) : history.undo(doc));
  }
});
async function start() {
  app.innerHTML =
    '<div class="loading">PRESSROOM<span role="status">Loading type / Загружаем шрифт…</span></div>';
  try {
    await loadFonts();
    persist();
    shell();
  } catch {
    app.innerHTML = `<div class="loading">PRESSROOM<p role="alert">${t().fontError}</p><button id="retry">${t().retry}</button></div>`;
    document.getElementById("retry")!.onclick = () => {
      void start();
    };
  }
}
void start();

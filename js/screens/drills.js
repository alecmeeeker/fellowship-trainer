/* drills.js — the drill catalog, grouped by topic. */
import { el } from "../lib/dom.js";
import { loadDrills, loadCramPath } from "../services/content-loader.js";
import { getDrill } from "../services/progress.js";

let _cramDrillSet = null;
function cramDrillIds() {
  if (_cramDrillSet) return _cramDrillSet;
  _cramDrillSet = loadCramPath().then((path) => {
    const set = new Set();
    for (const block of path.blocks) {
      for (const step of block.steps) {
        if (step.kind === "drill") set.add(step.id);
      }
    }
    return set;
  }).catch(() => new Set());
  return _cramDrillSet;
}

export function mount(outlet) {
  let destroyed = false;
  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Drills"),
    el("p", { class: "lead", style: { marginTop: "8px" } },
      "Short, focused exercises — one skill each, with an instant unit-test check. Use them to warm up before a project or to shore up a weak spot."));
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));

  const body = el("div");
  wrap.appendChild(body);

  (async () => {
    let drills, cramSet;
    try { [drills, cramSet] = await Promise.all([loadDrills(), cramDrillIds()]); }
    catch (e) { body.appendChild(el("div", { class: "empty" }, "Could not load drills — " + e.message)); return; }
    if (destroyed) return;

    body.appendChild(el("a", { href: "#/cram", class: "cram-pointer" },
      el("span", { class: "cram-pointer__flag" }, "▲ EXAM TODAY?"),
      el("span", { class: "cram-pointer__text" },
        "Drills flagged ", el("b", null, "ON PATH"),
        " are the prescribed warm-ups in the Cram Path — do them in the order the path specifies."),
      el("span", { class: "cram-pointer__cta" }, "Open Cram Path →")));

    const topics = [];
    const byTopic = new Map();
    for (const d of drills) {
      if (!byTopic.has(d.topic)) { byTopic.set(d.topic, []); topics.push(d.topic); }
      byTopic.get(d.topic).push(d);
    }

    const solved = drills.filter((d) => getDrill(d.id).status === "solved").length;
    body.appendChild(el("div", { class: "mono muted", style: { fontSize: "11px", marginTop: "4px" } },
      solved + " / " + drills.length + " solved"));

    for (const topic of topics) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, topic),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "grid grid--auto" },
        byTopic.get(topic).map((d) => drillCard(d, cramSet.has(d.id)))));
    }
  })();

  return () => { destroyed = true; };
}

function drillCard(d, onPath) {
  const p = getDrill(d.id);
  const pill = p.status === "solved"
    ? el("span", { class: "pill pill--ok" }, "✓ solved")
    : p.status === "attempted"
      ? el("span", { class: "pill pill--warn" }, "attempted")
      : el("span", { class: "pill" }, "new");
  return el("a", { class: "card card--link" + (onPath ? " card--cram" : ""), href: "#/drills/" + d.id },
    el("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
      el("span", { class: "card__title", style: { marginBottom: "0" } }, d.title),
      onPath ? el("span", { class: "cram-flag" }, "ON PATH") : null,
      pill),
    el("div", { class: "card__meta", style: { marginTop: "5px" } },
      "difficulty " + d.difficulty + (d.mode === "async" ? "  ·  asyncio" : "")),
    el("div", { class: "card__body" }, d.blurb));
}

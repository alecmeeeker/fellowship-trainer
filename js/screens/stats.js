/* stats.js — progress overview, exam history, and progress export / reset. */
import { el, clear, toast } from "../lib/dom.js";
import { store } from "../services/store.js";
import { loadManifest, loadDrills, loadCurriculum } from "../services/content-loader.js";
import { projectStats } from "../services/progress.js";

export function mount(outlet) {
  let destroyed = false;
  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Stats & Progress"));
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));
  const body = el("div");
  wrap.appendChild(body);

  render();

  async function render() {
    clear(body);
    body.appendChild(el("div", { class: "empty" }, el("span", { class: "spinner" })));
    let manifest, drills, curriculum;
    try {
      [manifest, drills, curriculum] = await Promise.all([loadManifest(), loadDrills(), loadCurriculum()]);
    } catch (e) {
      clear(body);
      body.appendChild(el("div", { class: "empty" }, "Could not load content — " + e.message));
      return;
    }
    if (destroyed) return;
    clear(body);

    const st = store.state;
    const streak = st.stats.streak || { current: 0, longest: 0 };
    const lessonsTotal = curriculum.modules.reduce((s, m) => s + m.lessons.length, 0);
    const lessonsDone = Object.values(st.lessons).filter((l) => l.status === "completed").length;
    const drillsDone = drills.filter((d) => (st.drills[d.id] || {}).status === "solved").length;
    const readyProjects = manifest.projects.filter((p) => p.status === "ready");
    let levelsDone = 0, levelsTotal = 0;
    readyProjects.forEach((p) => {
      levelsTotal += p.levels;
      levelsDone += projectStats(p.id, p.levels).completed;
    });
    const exams = st.exams.history || [];

    // ---- headline stats ----
    body.appendChild(el("div", { class: "grid grid--auto", style: { marginTop: "6px" } },
      bigStat(streak.current, "Day streak", "longest " + streak.longest),
      bigStat(lessonsDone + " / " + lessonsTotal, "Lessons", pct(lessonsDone, lessonsTotal)),
      bigStat(drillsDone + " / " + drills.length, "Drills solved", pct(drillsDone, drills.length)),
      bigStat(levelsDone + " / " + levelsTotal, "Project levels", pct(levelsDone, levelsTotal)),
      bigStat(String(exams.length), "Mock exams taken", st.stats.totalRuns + " total runs")));

    // ---- per-project ----
    body.appendChild(sectionHead("Projects"));
    const pgrid = el("div", { class: "grid", style: { gap: "8px" } });
    body.appendChild(pgrid);
    readyProjects.forEach((p) => {
      const s = projectStats(p.id, p.levels);
      const fraction = p.levels ? s.completed / p.levels : 0;
      const bar = el("div", { class: "bar stat-bar", style: { flex: "1", maxWidth: "260px" } },
        el("div", { class: "bar__fill" + (s.completed === p.levels ? " bar__fill--ok" : "") }));
      pgrid.appendChild(el("a", { class: "card card--link stat-row",
        href: "#/projects/" + p.id,
        style: { display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px" } },
        el("span", { class: "mono", style: { fontWeight: "700", flex: "1", fontSize: "13px" } }, p.title),
        bar,
        el("span", { class: "muted mono", style: { fontSize: "11px", width: "92px", textAlign: "right" } },
          s.completed + "/" + p.levels + " · " + s.score + "pt")));
      setTimeout(() => { bar.firstChild.style.width = Math.round(fraction * 100) + "%"; }, 30);
    });

    // ---- exam history ----
    body.appendChild(sectionHead("Mock Exam History"));
    if (!exams.length) {
      body.appendChild(el("div", { class: "empty" }, "No mock exams yet — start one from the Mock Exam screen."));
    } else {
      const egrid = el("div", { class: "grid", style: { gap: "8px" } });
      body.appendChild(egrid);
      exams.forEach((e) => {
        const when = new Date(e.endedAt).toLocaleDateString(undefined,
          { month: "short", day: "numeric" });
        egrid.appendChild(el("a", { class: "card card--link stat-row",
          href: "#/exam/" + e.examId + "/summary",
          style: { display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px" } },
          el("span", { class: "mono", style: { flex: "1", fontSize: "12.5px" } }, e.projectTitle),
          el("span", { class: "muted mono", style: { fontSize: "10px" } }, when),
          el("span", { class: "pill " + (e.levelsCompleted === e.totalLevels ? "pill--ok" : "pill--solid") },
            e.levelsCompleted + "/" + e.totalLevels + " levels"),
          el("span", { class: "mono", style: { fontWeight: "700", width: "92px", textAlign: "right" } },
            e.score + " / " + e.maxScore)));
      });
    }

    // ---- data ----
    body.appendChild(sectionHead("Your Data"));
    body.appendChild(el("p", { class: "muted", style: { fontSize: "12px", marginBottom: "12px" } },
      "Progress is saved in this browser's localStorage. Export it to keep a backup or move to another machine."));
    const fileInput = el("input", { type: "file", accept: "application/json", style: { display: "none" } });
    fileInput.onchange = () => {
      const f = fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { store.importJSON(String(reader.result)); toast("Progress imported", "ok"); render(); }
        catch (err) { toast("Import failed — " + err.message, "bad"); }
      };
      reader.readAsText(f);
    };
    const exportBtn = el("button", { class: "btn" }, "Export progress");
    exportBtn.onclick = () => {
      const blob = new Blob([store.exportJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: "fellowship-trainer-progress.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const importBtn = el("button", { class: "btn btn--ghost" }, "Import progress");
    importBtn.onclick = () => fileInput.click();
    const resetBtn = el("button", { class: "btn btn--danger" }, "Reset all progress");
    resetBtn.onclick = () => {
      if (window.confirm("Erase ALL progress — lessons, drills, projects, and exam history? This cannot be undone.")) {
        store.reset();
        toast("All progress reset", "");
        render();
      }
    };
    body.appendChild(el("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
      exportBtn, importBtn, resetBtn, fileInput));
  }

  return () => { destroyed = true; };
}

function bigStat(big, label, sub) {
  return el("div", { class: "card" },
    el("div", { class: "mono", style: { fontSize: "24px", fontWeight: "700" } }, String(big)),
    el("div", { class: "card__meta", style: { marginTop: "3px" } }, label),
    sub ? el("div", { class: "muted mono", style: { fontSize: "10px", marginTop: "5px" } }, sub) : null);
}

function sectionHead(label) {
  return el("div", { class: "section-head" },
    el("span", { class: "section-head__kicker" }, label),
    el("span", { class: "section-head__rule" }));
}

function pct(done, total) {
  return total ? Math.round((done / total) * 100) + "% done" : "";
}

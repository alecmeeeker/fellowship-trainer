/* markdown.js — a small, safe markdown renderer (builds DOM, never innerHTML).
 * Supports: # headings, **bold**, *italic*, `code`, ```fenced```, - / 1. lists,
 * > quotes, --- rules, paragraphs. Enough for specs, lessons, and cheatsheets. */
import { el } from "./dom.js";

export function renderMarkdown(md) {
  const root = el("div", { class: "md" });
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let list = null;
  let listOrdered = false;

  const closeList = () => { list = null; };
  const SPECIAL = /^(#{1,4}\s|```|>\s?|---+\s*$|\s*[-*]\s|\s*\d+\.\s)/;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      closeList();
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
      i++;
      root.appendChild(el("pre", { class: "md__pre" }, el("code", null, code.join("\n"))));
      continue;
    }

    const hm = line.match(/^(#{1,4})\s+(.*)$/);
    if (hm) {
      closeList();
      root.appendChild(el("h" + (hm[1].length + 1), { class: "md__h md__h" + hm[1].length }, ...inline(hm[2])));
      i++; continue;
    }

    if (/^---+\s*$/.test(line)) { closeList(); root.appendChild(el("div", { class: "md__hr" })); i++; continue; }

    if (/^>\s?/.test(line)) {
      closeList();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      root.appendChild(el("blockquote", { class: "md__quote" }, ...inline(quote.join(" "))));
      continue;
    }

    const um = line.match(/^\s*[-*]\s+(.*)$/);
    const om = line.match(/^\s*\d+\.\s+(.*)$/);
    if (um || om) {
      const ordered = !!om;
      if (!list || listOrdered !== ordered) {
        list = el(ordered ? "ol" : "ul", { class: "md__list" });
        listOrdered = ordered;
        root.appendChild(list);
      }
      list.appendChild(el("li", null, ...inline((um || om)[1])));
      i++; continue;
    }

    if (line.trim() === "") { closeList(); i++; continue; }

    closeList();
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !SPECIAL.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    root.appendChild(el("p", { class: "md__p" }, ...inline(para.join(" "))));
  }
  return root;
}

function inline(text) {
  const nodes = [];
  let rest = String(text);
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) { nodes.push(document.createTextNode(rest)); break; }
    if (m.index > 0) nodes.push(document.createTextNode(rest.slice(0, m.index)));
    const tok = m[0];
    if (tok.startsWith("`")) nodes.push(el("code", { class: "md__code" }, tok.slice(1, -1)));
    else if (tok.startsWith("**")) nodes.push(el("strong", null, tok.slice(2, -2)));
    else nodes.push(el("em", null, tok.slice(1, -1)));
    rest = rest.slice(m.index + tok.length);
  }
  return nodes;
}

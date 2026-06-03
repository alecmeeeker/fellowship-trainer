/* dom.js — a tiny element builder so screen code stays readable.
 * el("div", {class:"card"}, el("h2", null, "Hi"), "text")  */

export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class" || k === "className") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k in node && k !== "list" && k !== "type") {
        try { node[k] = v; } catch (_) { node.setAttribute(k, v); }
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) append(node, c);
    else if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

/* transient toast at the bottom of the screen */
export function toast(message, kind = "") {
  const t = el("div", { class: "toast" + (kind ? " toast--" + kind : "") }, message);
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 200ms, transform 200ms";
    t.style.opacity = "0";
    t.style.transform = "translate(-50%, 10px)";
    setTimeout(() => t.remove(), 220);
  }, 2400);
}

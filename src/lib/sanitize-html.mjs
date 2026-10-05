// Dependency-free sanitiser for blog paragraph HTML. Everything that stores a
// paragraph block (the converter today, an editor's save path later) must pass
// it through sanitizeInlineHtml(): the pages inject the result as raw HTML.
// getPost() in blog.ts re-applies it (and safeEmbedSrc) on every read as well.

const ENTITIES = { nbsp: " ", lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

/** @param {string} s */
export const decodeEntities = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1))
      : (ENTITIES[e.toLowerCase()] ?? m),
  );

/** @param {string} s */
const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Inline tags a paragraph may keep, without attributes except a safe <a href>.
// Everything else is dropped (its text stays).
const ALLOWED = new Set(["a", "b", "strong", "i", "em", "u", "s", "code", "sub", "sup", "br"]);

/** @param {string} href */
const safeHref = (href) => {
  const h = decodeEntities(href).trim();
  return /^(https?:\/\/|mailto:)/i.test(h) && !/[\s\u0000-\u001f]/.test(h) ? h : null;
};

const EMBED_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);

/**
 * Returns the embed URL if it is a YouTube embed, otherwise null.
 * @param {string} src
 */
export function safeEmbedSrc(src) {
  let u;
  try {
    u = new URL(src);
  } catch {
    return null;
  }
  const ok =
    u.protocol === "https:" && EMBED_HOSTS.has(u.hostname) && !u.port && !u.username && !u.password &&
    /^\/embed\/[\w-]+$/.test(u.pathname);
  return ok ? u.href : null;
}

// Opening tag for a safe href; external (http/https) links open in a new tab.
/** @param {string} href */
const linkOpen = (href) =>
  /^https?:/i.test(href)
    ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">`
    : `<a href="${escape(href)}">`;

// Bare URLs in plain (decoded) text become links. Quotes, angle brackets and
// trailing punctuation end the URL; a closing paren only counts if it is paired.
/** @param {string} text */
const autolink = (text) => {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"'`]+/g)) {
    let url = m[0].replace(/[.,;:!?\]}]+$/, "");
    while (url.endsWith(")") && url.split("(").length < url.split(")").length)
      url = url.slice(0, -1).replace(/[.,;:!?\]}]+$/, "");
    if (!/^https?:\/\/[^/?#]/.test(url)) continue;
    out += escape(text.slice(last, m.index)) + `${linkOpen(url)}${escape(url)}</a>`;
    last = m.index + url.length;
  }
  return out + escape(text.slice(last));
};

/**
 * Returns well-formed inline HTML: allow-listed tags only, balanced, no nested links.
 * @param {string} html
 */
export function sanitizeInlineHtml(html) {
  let out = "";
  let last = 0;
  /** @type {string[]} */
  const open = [];
  const text = (/** @type {string} */ raw) => {
    const t = decodeEntities(raw).replace(/ /g, " ");
    return open.includes("a") ? escape(t) : autolink(t);
  };
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi)) {
    out += text(html.slice(last, m.index));
    last = m.index + m[0].length;
    const [, close, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) continue;
    if (name === "br") {
      if (!close) out += "<br>";
    } else if (close) {
      // Only close the innermost open tag; stray or misnested closers are dropped.
      if (open.at(-1) === name) out += `</${open.pop()}>`;
    } else if (name === "a") {
      if (open.includes("a")) continue;
      const m2 = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
      const href = m2 ? safeHref(m2[1] ?? m2[2] ?? m2[3]) : null;
      out += href ? linkOpen(href) : "<a>";
      open.push("a");
    } else {
      out += `<${name}>`;
      open.push(name);
    }
  }
  out += text(html.slice(last));
  out = out.replace(/\s+/g, " ").replace(/^(\s|<br>)+|(\s|<br>)+$/g, "");
  return out + open.reverse().map((t) => `</${t}>`).join("");
}

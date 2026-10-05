// Quick checks for the blog paragraph sanitiser: node scripts/test-sanitize.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { safeEmbedSrc, sanitizeInlineHtml as s } from "../src/lib/sanitize-html.mjs";

const R = ' target="_blank" rel="noopener noreferrer"';
const cases = [
  // Unbalanced and misnested tags are closed or dropped.
  ['one <a href="https://evil.example">click', 'one <a href="https://evil.example"' + R + '>click</a>'],
  ["<b>bold <i>both</b> tail</i>", "<b>bold <i>both tail</i></b>"],
  ["stray </b> close</code>", "stray close"],
  ["<s><code>x", "<s><code>x</code></s>"],
  // Nested links: the inner <a> is ignored.
  ['<a href="https://a.example">a <a href="https://b.example">b</a> c</a>', '<a href="https://a.example"' + R + '>a b</a> c'],
  // Disallowed tags and attributes.
  ['<script>alert(1)</script><img src=x onerror=alert(1)>hi', "alert(1)hi"],
  ['<b onclick="x()" style="color:red">t</b>', "<b>t</b>"],
  ['<div><span class="c">t</span></div>', "t"],
  ["a <!-- note --> b", "a b"],
  // Unsafe hrefs keep the link text but lose the href.
  ['<a href="javascript:alert(1)">x</a>', "<a>x</a>"],
  ['<a href=" JavaScript:alert(1)">x</a>', "<a>x</a>"],
  ['<a href="java&#9;script:alert(1)">x</a>', "<a>x</a>"],
  ['<a href="data:text/html,x">x</a>', "<a>x</a>"],
  ["<a href='https://ok.example/?a=1&amp;b=\"2\"'>x</a>", '<a href="https://ok.example/?a=1&amp;b=&quot;2&quot;"' + R + '>x</a>'],
  // Autolinking stops at quotes, angle brackets and trailing punctuation.
  ['"https://example.com"', '&quot;<a href="https://example.com"' + R + '>https://example.com</a>&quot;'],
  ["&lt;https://example.com&gt;", '&lt;<a href="https://example.com"' + R + '>https://example.com</a>&gt;'],
  ["see https://example.com&quot; ok", 'see <a href="https://example.com"' + R + '>https://example.com</a>&quot; ok'],
  ["at https://example.com/a.", 'at <a href="https://example.com/a"' + R + '>https://example.com/a</a>.'],
  ["(see https://example.com/x)", '(see <a href="https://example.com/x"' + R + '>https://example.com/x</a>)'],
  ["https://en.wikipedia.org/wiki/Foo_(bar).", '<a href="https://en.wikipedia.org/wiki/Foo_(bar)"' + R + '>https://en.wikipedia.org/wiki/Foo_(bar)</a>.'],
  ["https://a.example/?q=1&amp;r=2", '<a href="https://a.example/?q=1&amp;r=2"' + R + '>https://a.example/?q=1&amp;r=2</a>'],
  ['"https://example.com" said', '&quot;<a href="https://example.com"' + R + '>https://example.com</a>&quot; said'],
  ["<https://example.com>", ""], // raw, this is an (unknown) tag to a browser too
  ["https://y.com/a_(b)", '<a href="https://y.com/a_(b)"' + R + '>https://y.com/a_(b)</a>'],
  ["just https:// here", "just https:// here"],
  ['<a href="https://x.example"' + R + '>https://x.example</a>', '<a href="https://x.example"' + R + '>https://x.example</a>'],
  // Author target/rel are dropped; mailto links get no target.
  ['<a href="https://t.example" target="_self" rel="opener">t</a>', '<a href="https://t.example"' + R + '>t</a>'],
  ['<a href="mailto:me@example.com" target="_blank">m</a>', '<a href="mailto:me@example.com">m</a>'],
  // Text is escaped; whitespace and edge <br>s are trimmed.
  ["i &lt; N &amp;&amp; 1 > 0 <3", "i &lt; N &amp;&amp; 1 &gt; 0 &lt;3"],
  ["<br> a&nbsp; b <br/><br>", "a b"],
];

for (const [input, expected] of cases) assert.equal(s(input), expected, `input: ${input}`);

const embeds = [
  ["https://www.youtube.com/embed/v4Sv72j4RCk", "https://www.youtube.com/embed/v4Sv72j4RCk"],
  ["https://www.youtube-nocookie.com/embed/abc_-1?start=5", "https://www.youtube-nocookie.com/embed/abc_-1?start=5"],
  ["http://www.youtube.com/embed/x", null],
  ["https://youtube.com.evil.example/embed/x", null],
  ["https://www.youtube.com/watch?v=x", null],
  ["https://www.youtube.com/embed/../redirect", null],
  ["https://user@www.youtube.com/embed/x", null],
  ["javascript:alert(1)", null],
  ["not a url", null],
];
for (const [input, expected] of embeds) assert.equal(safeEmbedSrc(input), expected, `embed: ${input}`);

// Stored posts are already sanitised, so getPost's re-sanitising must not change them.
let stored = 0;
const dir = new URL("../content/blog/", import.meta.url);
for (const f of fs.readdirSync(dir)) {
  for (const b of JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")).blocks) {
    if (b.type === "paragraph") {
      assert.equal(s(b.html), b.html, `${f}: ${b.html.slice(0, 60)}`);
      stored++;
    }
    if (b.type === "embed") assert.equal(safeEmbedSrc(b.src), b.src, `${f}: ${b.src}`);
  }
}
console.log(`${cases.length} sanitiser, ${embeds.length} embed and ${stored} stored-paragraph checks passed`);

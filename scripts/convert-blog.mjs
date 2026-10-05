// Converts the old site's blog backup into content/blog/<id>.json and copies the
// media it references into public/assets/blog/. Plain Node, no deps, re-runnable:
//   node scripts/convert-blog.mjs
// Re-running overwrites content/blog/ entirely, so put corrections in the
// tables below (CODE_OVERRIDES, TEXT_FIXES) rather than editing the JSON by hand.
import fs from "node:fs";
import path from "node:path";
import { decodeEntities, safeEmbedSrc, sanitizeInlineHtml } from "../src/lib/sanitize-html.mjs";

const root = path.resolve(import.meta.dirname, "..");
const backup = path.resolve(root, "../old_site_backup");
const outDir = path.join(root, "content/blog");
const mediaDir = path.join(root, "public/assets/blog");

// Older posts stored code as one flattened string (newlines lost in the editor).
// These restore the line breaks; tokens are checked against the source below.
const CODE_OVERRIDES = {
  "000004": {
    4: `def compute_quadratic_cost(Q, data):
    assert Q.shape[0] == data.shape[0]
    if len(data.shape) != 2:
        data = data.reshape(-1, 1)
    cost = (data * (Q @ data)).sum(axis=0)
    return cost

def compute_state_cost(Q, target_state, data):
    if len(data.shape) != 2:
        data = data.reshape(-1, 1)
    #since theta is periodic
    data[1] = data[1] % (2 * np.pi)
    return ((data - target_state) * (Q @ (data - target_state))).sum(axis=0)

def compute_u_star(R_diag, dJdX, dstate_dynamics_du):
    assert dJdX.shape[1] == dstate_dynamics_du.shape[2]
    assert dJdX.shape[0] == dstate_dynamics_du.shape[0]
    inv_R = 1 / R_diag
    #the analytically derived optimal control
    u_star = -(1/2) * inv_R @ torch.einsum('sin, sn -> in', dstate_dynamics_du, dJdX)
    u_star = u_star.reshape(1, -1)
    return u_star`,
    // The source has a typo here ("'ReLU']"), fixed to "'ReLU':".
    6: `class MLP(nn.Module):
    def __init__(self, use_sin_cos_for_input, remaining_layers, activation_types):
        super(MLP, self).__init__()
        self.use_sin_cos_for_input = use_sin_cos_for_input
        input_size = sum(2 if use else 1 for use in use_sin_cos_for_input)
        layers = []
        prev_size = input_size
        for i, layer_size in enumerate(remaining_layers):
            layers.append(nn.Linear(prev_size, layer_size))
            if activation_types[i] == 'ReLU':
                layers.append(nn.ReLU())
            elif activation_types[i] == 'Identity':
                layers.append(nn.Identity())
            prev_size = layer_size
        self.model = nn.Sequential(*layers).to(device)

    def forward(self, x):
        transformed_input = []
        for i, use in enumerate(self.use_sin_cos_for_input):
            if use:
                transformed_input.append(torch.sin(x[:, i:i+1]))
                transformed_input.append(torch.cos(x[:, i:i+1]))
            else:
                transformed_input.append(x[:, i:i+1])
        x = torch.cat(transformed_input, dim=1)
        return self.model(x)`,
    9: `x_states_cart = np.linspace(-2, 2, 10)
theta_states_cart = np.linspace(0, 2 * np.pi, num_samples)
x_dot_states_cart = np.linspace(-10, 10, num_samples-20)
theta_dot_states_cart = np.linspace(-10, 10, num_samples-20)
state_grid_cart = np.meshgrid(x_states_cart, theta_states_cart,
    x_dot_states_cart, theta_dot_states_cart, indexing="xy")`,
    12: `Q = torch.diag(torch.tensor([0.1, 25, 1, 5], dtype=torch.float32))
R_diag = torch.tensor(np.array([1]), dtype=torch.float32)`,
    15: `use_sin_cos = [False, True, False, False]
remaining_layers = [128, 128, 1]
activation_types = ['ReLU', 'ReLU','Identity']`,
    17: `for i in range(num_samples):
    d.ctrl[0] = 0
    d.qpos = [state_samples[0, i].item(), state_samples[1, i].item()]
    d.qvel = [state_samples[2, i].item(), state_samples[3, i].item()]
    mujoco.mj_forward(m, d)
    state_dynamics_x[i, :2] = d.qvel
    state_dynamics_x[i, 2:] = d.qacc
    for j in range(num_inputs):
        d.qpos = [state_samples[0, i].item(), state_samples[1, i].item()]
        d.qvel = [state_samples[2, i].item(), state_samples[3, i].item()]
        d.ctrl[0] = 1
        mujoco.mj_forward(m, d)
        dstate_dynamics_du[:2, j, i] = d.qvel - state_dynamics_x[i,:2]
        dstate_dynamics_du[2:, j, i] = d.qacc - state_dynamics_x[i, 2:]
        d.ctrl[0] = 0`,
    20: `batch_states_grad = state_samples[:, batch].requires_grad_(True).to(device)
J = value_mlp.forward(batch_states_grad.T)
dJdX = torch.autograd.grad(J.sum(), batch_states_grad, create_graph=True, retain_graph=True)[0]
u_star = compute_u_star(R_diag, dJdX, dstate_dynamics_du[:, :, batch].to(device))
if input_limits is not None:
    u_star = torch.clamp(u_star, input_limits[0], input_limits[1])
Xnext = batch_states_grad + time_step * (state_dynamics_x[batch, :].T + torch.einsum('sin,in->sn', dstate_dynamics_du[:, :, batch], u_star))
Cost = time_step * (compute_quadratic_cost(R_diag.reshape(1,1), u_star) + state_cost_function(Xnext))
Jnext = value_mlp.forward(Xnext.T).detach()
Jd = Cost.reshape(-1, 1) + discount_factor * Jnext
for i in range(optim_steps_per_epoch):
    J_pred = value_mlp.forward(batch_states_grad.T)
    loss = nn.MSELoss()(J_pred, Jd.detach())
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()`,
  },
};

// Typo fixes applied to titles and paragraph html (after sanitising). Each
// "from" must match exactly once in its post, so a stale entry fails loudly.
const TEXT_FIXES = {
  "000000": [["the out diameter", "the outer diameter"]],
  "000001": [
    ["Two mains vulnerabilities", "Two main vulnerabilities"],
    ["Server side Request Forgery", "Server-Side Request Forgery"],
    ["checks being ran behind", "checks being run behind"],
    ["more URL's", "more URLs"],
    ["back to google", "back to Google"],
    ["using google", "using Google"],
    ["my php server", "my PHP server"],
    ["and submitting the tunneled URL", "and submitted the tunneled URL"],
    ["and... just like that", "And... just like that"],
  ],
  "000002": [["we still can not optimize", "we still cannot optimize"]],
  "000003": [
    ["once we reach the part b", "once we reach part b"],
    ["the function we had part a", "the function we had in part a"],
  ],
  "000004": [
    ["you have to option to switch", "you have the option to switch"],
    ["our MLP is defined", "our MLP are defined"],
    ["sudden jolts).", "sudden jolts))."],
  ],
  "000008": [
    ["LQR's on Inverted Penulum Problem", "LQRs on Inverted Pendulum Problem"],
    ["some GIF’s", "some GIFs"],
  ],
  "000009": [
    ["into an URDF file", "into a URDF file"],
    ["slowing hopping", "slowly hopping"],
    ["stable gait., and", "stable gait, and"],
    ["finally got semi-successful walk", "finally got a semi-successful walk"],
    ["with RL lives on", "with RL live on"],
  ],
  "000021": [["radix_bits = 4 :", "radix_bits = 4:"]],
  "000022": [
    ["single–thread-block", "single-thread-block"],
    ["to oneSweep to", "to OneSweep to"],
    ["while oneSweep remains", "while OneSweep remains"],
  ],
};

function applyFixes(id, post) {
  for (const [from, to] of TEXT_FIXES[id] ?? []) {
    const fields = [post, ...post.blocks.filter((b) => b.type === "paragraph")];
    const key = (f) => (f === post ? "title" : "html");
    const hits = fields.filter((f) => f[key(f)].includes(from));
    if (hits.length !== 1 || hits[0][key(hits[0])].split(from).length !== 2)
      throw new Error(`text fix ${id} "${from}" must match exactly once`);
    hits[0][key(hits[0])] = hits[0][key(hits[0])].replace(from, to);
  }
}

function codeText(id, index, raw) {
  const override = CODE_OVERRIDES[id]?.[index];
  if (override !== undefined) {
    const squash = (s) => s.replace(/\s+/g, "");
    if (squash(override) !== squash(raw.replace("'ReLU']", "'ReLU':")))
      throw new Error(`code override ${id}#${index} no longer matches the source`);
    return override;
  }
  // Editor format: <div contenteditable="false"><div>line</div>...</div>
  if (raw.startsWith("<div")) {
    raw = raw
      .replace(/^<div[^>]*>|<\/div>$/g, "")
      .replace(/<br\s*\/?>/gi, "")
      .replace(/<\/div>/gi, "\n")
      .replace(/<div[^>]*>/gi, "");
    raw = decodeEntities(raw);
  }
  // Older posts stored code as plain text (e.g. a literal "<iframe ...>"), so no decoding.
  return raw
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

const sniff = (buf) =>
  buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "png"
  : buf[0] === 0xff && buf[1] === 0xd8 ? "jpg"
  : buf.subarray(0, 4).toString() === "GIF8" ? "gif"
  : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "webp"
  : null;

// Copies bucket/<key> to public/assets/blog/<key>.<ext>; returns the asset path.
function copyMedia(url) {
  const key = new URL(url).pathname.split("/").pop();
  const buf = fs.readFileSync(path.join(backup, "bucket", key));
  const ext = sniff(buf);
  if (!ext) throw new Error(`unknown media type for ${key}`);
  fs.writeFileSync(path.join(mediaDir, `${key}.${ext}`), buf);
  return `blog/${key}.${ext}`;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });

const posts = JSON.parse(fs.readFileSync(path.join(backup, "blog_posts.json"), "utf8"));
for (const p of posts) {
  const id = p.SK.split("#")[1];
  const bodyKey = new URL(p.text).pathname.split("/").pop();
  const body = JSON.parse(fs.readFileSync(path.join(backup, "bucket", bodyKey), "utf8"));

  const blocks = [];
  body.forEach((s, i) => {
    if (s.startsWith("https:")) blocks.push({ type: "image", src: copyMedia(s) });
    else if (s.startsWith("embed:")) {
      const src = safeEmbedSrc(s.slice("embed:".length));
      if (!src) throw new Error(`unsupported embed in ${id}: ${s}`);
      blocks.push({ type: "embed", src });
    } else if (s.startsWith("cccc")) blocks.push({ type: "code", text: codeText(id, i, s.slice(4)) });
    else {
      const html = sanitizeInlineHtml(s);
      if (html) blocks.push({ type: "paragraph", html });
    }
  });

  const post = {
    id,
    title: p.title,
    author: p.author,
    date: new Date(p.date).toISOString(),
    cover: copyMedia(p.image),
    blocks,
  };
  applyFixes(id, post);
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(post, null, 2) + "\n");
  console.log(`${id}  ${blocks.length} blocks  ${post.title}`);
}
console.log(`${posts.length} posts written to ${path.relative(root, outDir)}`);

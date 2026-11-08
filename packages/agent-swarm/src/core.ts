/**
 * agent-swarm core. Framework-free.
 *
 * Every element you hand it gets a small crew of cursor "agents":
 *   1. a box agent drags out the element's frame,
 *   2. a scan line sweeps tall elements as they fill,
 *   3. a text-box agent drags a box around each piece of text,
 *   4. an I-beam typist types that text in, one character at a time.
 *
 * Each root builds its elements strictly in order, one after another, and every
 * root on the page draws to a single shared overlay canvas. When nothing is being built, nothing is drawn.
 */

export type SwarmTrigger = "visible" | "mount" | "manual";

export interface SwarmColors {
  /** Frame lines, carets and cursor outlines. */
  ink: string;
  /** The contrasting colour: cursor fill and the inside of corner handles. */
  paper: string;
  /** Background of the name tags and size labels. Defaults to `ink`. */
  accent: string;
}

export type SwarmTheme = "auto" | "light" | "dark" | Partial<SwarmColors>;

export interface SwarmOptions {
  /**
   * Which elements inside the root get built. Defaults to every element marked
   * `data-swarm`, or the root's direct children when none are marked.
   */
  selector?: string;
  /** When building starts. `visible` (default) builds each element as it scrolls into view. */
  trigger?: SwarmTrigger;
  /** Playback speed. 2 is twice as fast. Default 1. */
  speed?: number;
  /** Colours. `auto` (default) picks light or dark from the background behind each element. */
  theme?: SwarmTheme;
  /** Show the `Label  W×H` tag on each frame. Default true. */
  labels?: boolean;
  /** Show the name tag next to each cursor. Default true. */
  names?: boolean;
  /** Prefix for agent names. Default `agent`. */
  namePrefix?: string;
  /** Sweep a scan line over taller elements. Default true. */
  scan?: boolean;
  /** Type text in character by character. When false, text appears with its element. Default true. */
  typing?: boolean;
  /** Font for the tags. Default a system monospace. */
  font?: string;
  /** Show everything immediately when the user prefers reduced motion. Default true. */
  respectReducedMotion?: boolean;
  /** IntersectionObserver rootMargin for the `visible` trigger. Default `0px 0px -6% 0px`. */
  rootMargin?: string;
  /** Called when the first element starts building. */
  onStart?: () => void;
  /** Called when every element has been built and typed. */
  onComplete?: () => void;
}

export interface SwarmController {
  /** Start building (for `trigger: "manual"`). Safe to call more than once. */
  play(): void;
  /** Hide everything again and build it from scratch. */
  replay(): void;
  /** Skip to the end: show everything now. */
  reveal(): void;
  /** Stop, show everything, and remove every trace of the effect. */
  destroy(): void;
}

/* ------------------------------------------------------------------------- */
/* Timing (seconds, at speed 1)                                               */
/* ------------------------------------------------------------------------- */

const LOOKAHEAD = 2; // box agents already flying in, ready for their turn
const ARRIVE_S = 0.5; // a box agent still in flight by now starts its turn anyway
const NEXT_AT = 0.75; // the next element starts when this frame is this far along
const TEXT_BOX_S = 0.22;
const SCAN_S = 0.32;
const FADE_S = 0.3;
const LEAVE_S = 0.32;
const DONE_MS = 520; // how long the "built" entrance animation runs

const HIGHLIGHT = "agent-swarm-hidden";
const STYLE_ID = "agent-swarm-styles";

const CSS_TEXT = `
[data-swarm-state="pending"]{opacity:0}
[data-swarm-state="built"]{animation:agent-swarm-in ${DONE_MS}ms cubic-bezier(.33,1,.68,1) both}
@keyframes agent-swarm-in{from{opacity:0}}
[data-swarm-text="hidden"]{visibility:hidden}
::highlight(${HIGHLIGHT}){color:transparent;background-color:transparent;text-shadow:none;text-decoration-color:transparent}
.agent-swarm-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000}
`;

/* ------------------------------------------------------------------------- */
/* Types                                                                      */
/* ------------------------------------------------------------------------- */

type Agent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  k: number;
  type: boolean; // I-beam instead of an arrow
  name: string;
  named: boolean;
  colors: SwarmColors;
  bornAt: number;
  leftAt: number; // below 0 while still working
};

type Char = { node: Text; offset: number; l: number; t: number; r: number; b: number };

/** One run of text inside a box: everything owned by the nearest block-level element. */
type Block = {
  el: HTMLElement;
  nodes: Text[];
  range: Range | null;
  chars: Char[]; // positions relative to el's border box; measured when its job starts
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  shown: number;
  boxAt: number;
  typeAt: number;
  typeFor: number;
  boxer: Agent | null;
  typist: Agent | null;
  typed: boolean;
};

type Box = {
  el: HTMLElement;
  owner: Root;
  label: string;
  blocks: Block[];
  state: "idle" | "pending" | "queued" | "active" | "done";
  job: Job | null;
};

type Job = {
  box: Box;
  outer: SwarmColors;
  inner: SwarmColors;
  drag: number;
  scan: boolean;
  endsAt: number;
  boxer: Agent | null;
  hiredAt: number;
  startedAt: number;
  built: boolean;
};

type Root = {
  el: HTMLElement;
  opts: Required<Omit<SwarmOptions, "onStart" | "onComplete" | "selector">> & {
    selector: string | undefined;
    onStart?: () => void;
    onComplete?: () => void;
  };
  boxes: Box[];
  io: IntersectionObserver | null;
  mo: MutationObserver | null;
  playing: boolean;
  started: boolean;
  completed: boolean;
  serial: number;
  turnAt: number;
};

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

const smooth = (x: number) => {
  const v = Math.min(1, Math.max(0, x));
  return v * v * v * (v * (v * 6 - 15) + 10);
};

const supportsHighlights = () =>
  isBrowser && typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

const prefersReducedMotion = () =>
  isBrowser && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}

/* Colour: read any CSS colour by painting one pixel. */
let probe: CanvasRenderingContext2D | null = null;
const colorCache = new Map<string, [number, number, number, number]>();
function rgba(color: string): [number, number, number, number] {
  const hit = colorCache.get(color);
  if (hit) return hit;
  if (!probe) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    probe = c.getContext("2d", { willReadFrequently: true });
  }
  let out: [number, number, number, number] = [0, 0, 0, 0];
  if (probe) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgba(0,0,0,0)";
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    out = [d[0], d[1], d[2], d[3] / 255];
  }
  colorCache.set(color, out);
  return out;
}

/** Is the first solid background at or above this node dark? */
function isDarkBehind(node: Element | null): boolean {
  for (let el = node; el; el = el.parentElement) {
    const [r, g, b, a] = rgba(getComputedStyle(el).backgroundColor);
    if (a > 0.5) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 140;
    }
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches &&
    getComputedStyle(document.documentElement).colorScheme.includes("dark");
}

const LIGHT_ON_DARK: SwarmColors = { ink: "#f4f3ee", paper: "#111110", accent: "#f4f3ee" };
const DARK_ON_LIGHT: SwarmColors = { ink: "#111110", paper: "#ffffff", accent: "#111110" };

function colorsFor(theme: SwarmTheme, node: Element | null): SwarmColors {
  if (theme === "dark") return LIGHT_ON_DARK;
  if (theme === "light") return DARK_ON_LIGHT;
  if (theme === "auto") return isDarkBehind(node) ? LIGHT_ON_DARK : DARK_ON_LIGHT;
  const base = isDarkBehind(node) ? LIGHT_ON_DARK : DARK_ON_LIGHT;
  const ink = theme.ink ?? base.ink;
  return { ink, paper: theme.paper ?? base.paper, accent: theme.accent ?? theme.ink ?? base.accent };
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "SVG"]);

/** Group the box's text by the nearest block-level element that owns it. */
function findBlocks(box: HTMLElement, isOtherBox: (el: Element) => boolean): Block[] {
  const blocks = new Map<HTMLElement, Text[]>();
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      for (let el = node.parentElement; el && el !== box; el = el.parentElement) {
        if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.hasAttribute("data-swarm-skip") || isOtherBox(el)) {
          return NodeFilter.FILTER_REJECT;
        }
      }
      if (box.hasAttribute("data-swarm-skip")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    let owner = n.parentElement as HTMLElement;
    while (owner !== box) {
      const display = getComputedStyle(owner).display;
      if (display !== "inline" && display !== "contents") break;
      owner = owner.parentElement as HTMLElement;
    }
    const list = blocks.get(owner) ?? [];
    list.push(n);
    blocks.set(owner, list);
  }
  return Array.from(blocks, ([el, nodes]) => ({
    el,
    nodes,
    range: null,
    chars: [],
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    shown: 0,
    boxAt: 0,
    typeAt: 0,
    typeFor: 0,
    boxer: null,
    typist: null,
    typed: false,
  }));
}

/** Where every visible character sits, relative to its block's border box. */
function measureBlock(block: Block) {
  const origin = block.el.getBoundingClientRect();
  const range = document.createRange();
  const chars: Char[] = [];
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const node of block.nodes) {
    if (!node.isConnected) continue;
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rects = range.getClientRects();
      const box = rects[rects.length - 1] ?? range.getBoundingClientRect();
      if (!box || (box.width === 0 && box.height === 0)) continue;
      const c = {
        node,
        offset: i,
        l: box.left - origin.left,
        t: box.top - origin.top,
        r: box.right - origin.left,
        b: box.bottom - origin.top,
      };
      chars.push(c);
      l = Math.min(l, c.l);
      t = Math.min(t, c.t);
      r = Math.max(r, c.r);
      b = Math.max(b, c.b);
    }
  }
  block.chars = chars;
  block.x0 = l;
  block.y0 = t;
  block.x1 = r;
  block.y1 = b;
}

/* ------------------------------------------------------------------------- */
/* The engine: one canvas, one queue, shared by every root on the page        */
/* ------------------------------------------------------------------------- */

class Engine {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  highlight: Highlight | null = null;
  roots = new Set<Root>();
  agents: Agent[] = [];
  waiting: Job[] = [];
  active: Job[] = [];
  width = 1;
  height = 1;
  raf = 0;
  last = 0;
  clock = 0;
  dirty = false;
  font = "";

  attach(root: Root) {
    this.roots.add(root);
    injectStyles();
    if (!this.highlight && supportsHighlights()) {
      this.highlight = new Highlight();
      CSS.highlights.set(HIGHLIGHT, this.highlight);
    }
  }

  detach(root: Root) {
    this.roots.delete(root);
    if (this.roots.size) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener("resize", this.resize);
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.agents = [];
    this.waiting = [];
    this.active = [];
    if (this.highlight) {
      CSS.highlights.delete(HIGHLIGHT);
      this.highlight = null;
    }
  }

  ensureCanvas() {
    if (this.canvas) return;
    const canvas = document.createElement("canvas");
    canvas.className = "agent-swarm-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  resize = () => {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.font = "";
  };

  wake() {
    if (this.raf) return;
    this.ensureCanvas();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---- text hiding ------------------------------------------------------- */

  hideBlock(block: Block) {
    const first = block.nodes[0];
    const last = block.nodes[block.nodes.length - 1];
    if (!first || !last) return;
    if (this.highlight) {
      const range = document.createRange();
      range.setStart(first, 0);
      range.setEnd(last, last.length);
      block.range = range;
      this.highlight.add(range);
    } else {
      block.el.dataset.swarmText = "hidden";
    }
  }

  /** Show the first `n` measured characters of a block. */
  showUpTo(block: Block, n: number) {
    if (n === block.shown) return;
    block.shown = n;
    if (!this.highlight) {
      if (n > 0) delete block.el.dataset.swarmText;
      return;
    }
    if (!block.range) return;
    if (n >= block.chars.length) {
      this.showBlock(block);
      return;
    }
    const c = block.chars[n];
    if (c?.node.isConnected) block.range.setStart(c.node, c.offset);
  }

  showBlock(block: Block) {
    if (block.range && this.highlight) this.highlight.delete(block.range);
    block.range = null;
    if (block.el.dataset.swarmText) delete block.el.dataset.swarmText;
  }

  /* ---- agents ------------------------------------------------------------ */

  spawn(root: Root, x: number, y: number, colors: SwarmColors, type = false): Agent {
    const angle = Math.random() * Math.PI * 2;
    const reach = 110 + Math.random() * 170;
    root.serial = (root.serial % 48) + 1;
    const agent: Agent = {
      x: x + Math.cos(angle) * reach,
      y: y + Math.sin(angle) * reach,
      vx: 0,
      vy: 0,
      tx: x,
      ty: y,
      k: 70,
      type,
      name: `${root.opts.namePrefix}-${String(root.serial).padStart(2, "0")}`,
      named: root.opts.names,
      colors,
      bornAt: this.clock,
      leftAt: -1,
    };
    this.agents.push(agent);
    return agent;
  }

  dismiss(agent: Agent | null) {
    if (!agent || agent.leftAt >= 0) return;
    const angle = Math.random() * Math.PI * 2;
    agent.leftAt = this.clock;
    agent.tx = agent.x + Math.cos(angle) * 170;
    agent.ty = agent.y + Math.sin(angle) * 170;
    agent.k = 18;
  }

  /* ---- jobs -------------------------------------------------------------- */

  enqueue(box: Box) {
    if (box.state !== "pending") return;
    box.state = "queued";
    const root = box.owner;
    const job: Job = {
      box,
      outer: colorsFor(root.opts.theme, box.el.parentElement),
      inner: colorsFor(root.opts.theme, box.el),
      drag: 0.5,
      scan: false,
      endsAt: 1,
      boxer: null,
      hiredAt: -1,
      startedAt: -1,
      built: false,
    };
    box.job = job;
    this.waiting.push(job);
    this.wake();
  }

  /** Measure and plan the job right before it starts, so layout is as fresh as possible. */
  plan(job: Job) {
    const { box } = job;
    const speed = Math.max(0.05, box.owner.opts.speed);
    const rect = box.el.getBoundingClientRect();
    const tall = rect.height;
    job.drag = (tall > 200 ? 0.75 : tall > 46 ? 0.5 : 0.4) / speed;
    job.scan = box.owner.opts.scan && tall >= 44;
    let cursor = job.drag * 0.85;
    let lastType = 0;
    for (const block of box.blocks) {
      if (!box.owner.opts.typing) continue;
      measureBlock(block);
      if (!block.chars.length) {
        this.showBlock(block);
        block.typed = true;
        continue;
      }
      const count = block.chars.length;
      const lines = new Set(block.chars.map((c) => Math.round(c.t))).size;
      block.boxAt = cursor;
      block.typeAt = cursor + TEXT_BOX_S / speed;
      const perChar = block.y1 - block.y0 > 46 && lines === 1 ? 0.042 : 0.024;
      const cap = lines > 1 ? 1.6 : 0.85;
      block.typeFor = Math.min(cap, Math.max(0.14, count * perChar)) / speed;
      lastType = Math.max(lastType, block.typeAt + block.typeFor);
      cursor += 0.09 / speed;
    }
    job.endsAt = Math.max(job.drag + (job.scan ? SCAN_S / speed : 0), lastType) + 0.12;
  }

  isVisible(job: Job) {
    const r = job.box.el.getBoundingClientRect();
    return r.bottom > 0 && r.top < this.height && r.right > 0 && r.left < this.width;
  }

  /** Show a box at once, without the effect. */
  finish(box: Box) {
    const job = box.job;
    if (job) {
      this.dismiss(job.boxer);
      for (const block of box.blocks) {
        this.dismiss(block.boxer);
        this.dismiss(block.typist);
      }
      this.waiting = this.waiting.filter((j) => j !== job);
      this.active = this.active.filter((j) => j !== job);
      box.job = null;
    }
    for (const block of box.blocks) this.showBlock(block);
    if (box.state !== "done" && box.state !== "idle") {
      box.state = "done";
      box.el.dataset.swarmState = "done";
    }
    this.checkComplete(box.owner);
  }

  build(box: Box) {
    box.el.dataset.swarmState = "built";
    const el = box.el;
    window.setTimeout(() => {
      if (el.dataset.swarmState === "built") el.dataset.swarmState = "done";
    }, DONE_MS + 40);
  }

  checkComplete(root: Root) {
    if (root.completed || !root.boxes.length) return;
    if (root.boxes.every((b) => b.state === "done" || b.state === "idle")) {
      root.completed = true;
      root.opts.onComplete?.();
    }
  }

  /* ---- the loop ---------------------------------------------------------- */

  frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000, 0.033);
    this.last = now;
    this.clock += dt;
    const ctx = this.ctx;
    if (!ctx) return;
    const busy = this.agents.length > 0 || this.active.length > 0 || this.waiting.length > 0;
    if (!busy) {
      if (this.dirty) ctx.clearRect(0, 0, this.width, this.height);
      this.dirty = false;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    this.dirty = true;
    this.step(dt);
    this.draw(ctx);
  };

  step(dt: number) {
    const { clock } = this;

    // Scrolled away before its turn came: show it now, so nothing lags behind the reader.
    for (let i = this.waiting.length - 1; i >= 0; i--) {
      const job = this.waiting[i];
      if (!this.isVisible(job)) this.finish(job.box);
    }

    // Each root builds its own elements strictly in order; separate roots run side by side.
    const seen = new Map<Root, number>();
    for (const job of this.waiting.slice()) {
      const root = job.box.owner;
      const index = seen.get(root) ?? 0;
      seen.set(root, index + 1);
      if (index >= LOOKAHEAD) continue;
      if (!job.boxer) {
        const r = job.box.el.getBoundingClientRect();
        job.boxer = this.spawn(root, r.left, r.top, job.outer);
        job.hiredAt = clock;
      }
      if (index !== 0 || clock < root.turnAt) continue;
      const r = job.box.el.getBoundingClientRect();
      const near = Math.hypot(job.boxer.x - r.left, job.boxer.y - r.top) < 22;
      if (near || clock - job.hiredAt > ARRIVE_S / root.opts.speed) {
        this.plan(job);
        job.startedAt = clock;
        job.box.state = "active";
        root.turnAt = clock + job.drag * NEXT_AT;
        this.active.push(job);
        this.waiting.splice(this.waiting.indexOf(job), 1);
        if (!root.started) {
          root.started = true;
          root.opts.onStart?.();
        }
      }
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const job = this.active[i];
      const { box } = job;
      const t = clock - job.startedAt;
      const r = box.el.getBoundingClientRect();
      const speed = box.owner.opts.speed;

      if (job.boxer && job.boxer.leftAt < 0) {
        const e = smooth(t / job.drag);
        job.boxer.tx = r.left + r.width * e;
        job.boxer.ty = r.top + r.height * e;
        job.boxer.k = 120;
        if (t >= job.drag) this.dismiss(job.boxer);
      }

      for (const block of box.blocks) {
        if (block.typed || !block.chars.length) continue;
        const o = block.el.getBoundingClientRect();
        const bx0 = o.left + block.x0;
        const by0 = o.top + block.y0;
        if (!block.boxer && t >= block.boxAt - 0.28 / speed) block.boxer = this.spawn(box.owner, bx0, by0, job.inner);
        if (block.boxer && block.boxer.leftAt < 0) {
          const e = smooth((t - block.boxAt) / (TEXT_BOX_S / speed));
          block.boxer.tx = bx0 + (block.x1 - block.x0) * e;
          block.boxer.ty = by0 + (block.y1 - block.y0) * e;
          block.boxer.k = 150;
          if (t >= block.boxAt + TEXT_BOX_S / speed) this.dismiss(block.boxer);
        }
        const first = block.chars[0];
        if (!block.typist && t >= block.typeAt - 0.3 / speed) {
          block.typist = this.spawn(box.owner, o.left + first.l, o.top + (first.t + first.b) / 2, job.inner, true);
        }
        if (block.typist && block.typist.leftAt < 0) {
          const p = Math.min(1, Math.max(0, (t - block.typeAt) / block.typeFor));
          const shown = Math.floor(p * block.chars.length);
          const at = shown === 0 ? first : block.chars[shown - 1];
          block.typist.tx = o.left + (shown === 0 ? at.l : at.r) + 2;
          block.typist.ty = o.top + (at.t + at.b) / 2;
          block.typist.k = t < block.typeAt ? 90 : 400;
          if (t >= block.typeAt) this.showUpTo(block, shown);
          if (p >= 1) {
            this.showBlock(block);
            block.typed = true;
            this.dismiss(block.typist);
          }
        }
      }

      if (!job.built && t >= job.drag) {
        job.built = true;
        this.build(box);
      }
      if (t >= job.endsAt + FADE_S) {
        this.active.splice(i, 1);
        for (const block of box.blocks) this.showBlock(block);
        box.state = "done";
        box.job = null;
        this.checkComplete(box.owner);
      }
    }

    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      // Critically damped spring: arrives without ever overshooting or jittering.
      const c = 2 * Math.sqrt(a.k);
      a.vx += (a.k * (a.tx - a.x) - c * a.vx) * dt;
      a.vy += (a.k * (a.ty - a.y) - c * a.vy) * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.leftAt >= 0 && clock - a.leftAt > LEAVE_S) this.agents.splice(i, 1);
    }
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    colors: SwarmColors,
    x0: number,
    y0: number,
    w: number,
    h: number,
    alpha: number,
    label: string,
    fill: number,
  ) {
    const x = Math.round(x0) + 0.5;
    const y = Math.round(y0) + 0.5;
    const rw = Math.round(w);
    const rh = Math.round(h);
    if (rw < 1 || rh < 1 || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    if (fill) {
      ctx.globalAlpha = alpha * fill;
      ctx.fillStyle = colors.ink;
      ctx.fillRect(x, y, rw, rh);
      ctx.globalAlpha = alpha;
    }
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, rw, rh);
    ctx.fillStyle = colors.paper;
    for (const [cx, cy] of [
      [x, y],
      [x + rw, y],
      [x, y + rh],
      [x + rw, y + rh],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (label) {
      const text = `${label}  ${rw}×${rh}`;
      const tw = ctx.measureText(text).width + 8;
      ctx.fillStyle = colors.accent;
      ctx.fillRect(x - 0.5, y - 15.5, tw, 13);
      ctx.fillStyle = colors.accent === colors.ink ? colors.paper : "#ffffff";
      ctx.fillText(text, x + 3.5, y - 8.5);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { clock } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    const fonts = new Set<string>();

    for (const job of this.active) {
      const { box } = job;
      const opts = box.owner.opts;
      if (ctx.font !== opts.font) ctx.font = opts.font;
      fonts.add(opts.font);
      ctx.textBaseline = "middle";
      const speed = opts.speed;
      const t = clock - job.startedAt;
      const r = box.el.getBoundingClientRect();
      const fade = t > job.endsAt ? Math.max(0, 1 - (t - job.endsAt) / FADE_S) : 1;
      const e = smooth(t / job.drag);
      this.drawFrame(
        ctx,
        job.outer,
        r.left,
        r.top,
        r.width * e,
        r.height * e,
        fade,
        opts.labels ? box.label : "",
        0.035,
      );

      // The scan line that sweeps an element as it fills.
      const scanFor = SCAN_S / speed;
      if (job.scan && t > job.drag && t < job.drag + scanFor) {
        const p = (t - job.drag) / scanFor;
        const y = r.top + r.height * p;
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.fillStyle = job.inner.ink;
        ctx.globalAlpha *= 0.16;
        ctx.fillRect(r.left, y - 3, r.width, 6);
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.fillRect(r.left, y - 0.5, r.width, 1);
      }

      for (const block of box.blocks) {
        if (!block.chars.length || t < block.boxAt) continue;
        const o = block.el.getBoundingClientRect();
        const blockFade = block.typed ? fade : 1;
        const le = smooth((t - block.boxAt) / (TEXT_BOX_S / speed));
        const lh = block.y1 - block.y0;
        this.drawFrame(
          ctx,
          job.inner,
          o.left + block.x0 - 2,
          o.top + block.y0 - 1,
          (block.x1 - block.x0 + 4) * le,
          (lh + 2) * le,
          blockFade * 0.8,
          opts.labels && lh > 30 ? "Text" : "",
          0,
        );
        // The caret: a solid bar at the end of what has been typed.
        if (!block.typed && t >= block.typeAt) {
          const shown = block.shown;
          const at = shown === 0 ? block.chars[0] : block.chars[shown - 1];
          const cx = o.left + (shown === 0 ? at.l : at.r);
          ctx.globalAlpha = 1;
          ctx.fillStyle = job.inner.ink;
          ctx.fillRect(Math.round(cx) + 1, o.top + at.t, 1, at.b - at.t);
        }
      }
    }

    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.textBaseline = "middle";
    for (const a of this.agents) {
      const born = Math.min(1, (clock - a.bornAt) / 0.14);
      const gone = a.leftAt < 0 ? 1 : Math.max(0, 1 - (clock - a.leftAt) / LEAVE_S);
      ctx.globalAlpha = born * gone;
      const { ink, paper, accent } = a.colors;
      let labelX = a.x + 9;
      let labelY = a.y + 11;
      if (a.type) {
        // An I-beam, which is what says "this one is typing".
        const x = Math.round(a.x + 3) + 0.5;
        const y = Math.round(a.y);
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 7);
        ctx.lineTo(x + 3, y - 7);
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
        ctx.moveTo(x - 3, y + 7);
        ctx.lineTo(x + 3, y + 7);
        ctx.stroke();
        labelX = a.x + 6;
        labelY = a.y + 10;
      } else {
        ctx.strokeStyle = paper;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + 9, a.y + 5.4);
        ctx.lineTo(a.x + 5, a.y + 6.4);
        ctx.lineTo(a.x + 2.8, a.y + 10.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (!a.named) continue;
      const tw = ctx.measureText(a.name).width + 10;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, tw, 13, 6.5);
      ctx.fill();
      ctx.fillStyle = accent === ink ? paper : "#ffffff";
      ctx.fillText(a.name, labelX + 5, labelY + 7);
    }
    ctx.globalAlpha = 1;
  }
}

let engine: Engine | null = null;
const getEngine = () => (engine ??= new Engine());

/* ------------------------------------------------------------------------- */
/* Public API                                                                 */
/* ------------------------------------------------------------------------- */

const DEFAULT_FONT = '500 9px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

function labelFor(el: HTMLElement) {
  const given = el.dataset.swarmLabel ?? (el.dataset.swarm || "");
  if (given) return given;
  const tag = el.tagName.toLowerCase();
  const names: Record<string, string> = {
    h1: "Heading",
    h2: "Heading",
    h3: "Heading",
    h4: "Heading",
    p: "Text",
    button: "Button",
    a: "Link",
    img: "Image",
    ul: "List",
    ol: "List",
    li: "Item",
    nav: "Nav",
    form: "Form",
    input: "Input",
    section: "Section",
    header: "Header",
    footer: "Footer",
    article: "Card",
    figure: "Figure",
  };
  return names[tag] ?? "Frame";
}

/**
 * Apply the swarm effect to the elements inside `root`.
 *
 * ```js
 * const swarm = createSwarm(document.querySelector("main"), { speed: 1.2 });
 * ```
 */
export function createSwarm(rootEl: HTMLElement, options: SwarmOptions = {}): SwarmController {
  const noop: SwarmController = { play() {}, replay() {}, reveal() {}, destroy() {} };
  if (!isBrowser || !rootEl) return noop;

  const eng = getEngine();
  const root: Root = {
    el: rootEl,
    opts: {
      selector: options.selector,
      trigger: options.trigger ?? "visible",
      speed: options.speed ?? 1,
      theme: options.theme ?? "auto",
      labels: options.labels ?? true,
      names: options.names ?? true,
      namePrefix: options.namePrefix ?? "agent",
      scan: options.scan ?? true,
      typing: options.typing ?? true,
      font: options.font ?? DEFAULT_FONT,
      respectReducedMotion: options.respectReducedMotion ?? true,
      rootMargin: options.rootMargin ?? "0px 0px -6% 0px",
      onStart: options.onStart,
      onComplete: options.onComplete,
    },
    boxes: [],
    io: null,
    mo: null,
    playing: false,
    started: false,
    completed: false,
    serial: Math.floor(Math.random() * 40),
    turnAt: 0,
  };
  eng.attach(root);
  let destroyed = false;

  const query = (): HTMLElement[] => {
    const sel = root.opts.selector;
    if (sel) return Array.from(rootEl.querySelectorAll<HTMLElement>(sel));
    const marked = Array.from(rootEl.querySelectorAll<HTMLElement>("[data-swarm]"));
    if (marked.length) return marked;
    return Array.from(rootEl.children).filter(
      (c): c is HTMLElement =>
        c instanceof HTMLElement && !SKIP_TAGS.has(c.tagName.toUpperCase()) && !c.classList.contains("agent-swarm-canvas"),
    );
  };

  const isBoxEl = (el: Element) => root.boxes.some((b) => b.el === el);

  /** Hide a box and its text until an agent builds it. */
  const arm = (box: Box) => {
    box.state = "pending";
    box.el.dataset.swarmState = "pending";
    box.blocks = root.opts.typing ? findBlocks(box.el, (el) => el !== box.el && isBoxEl(el)) : [];
    for (const block of box.blocks) eng.hideBlock(block);
  };

  const collect = () => {
    const els = query().filter((el) => !isBoxEl(el));
    const added = els.map<Box>((el) => ({ el, owner: root, label: labelFor(el), blocks: [], state: "idle", job: null }));
    root.boxes.push(...added);
    root.boxes.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return added;
  };

  const instant = () => root.opts.respectReducedMotion && prefersReducedMotion();

  const observe = (boxes: Box[]) => {
    if (root.opts.trigger === "visible") {
      root.io ??= new IntersectionObserver(
        (entries) => {
          // Keep document order even when several enter together.
          const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target);
          for (const box of root.boxes) {
            if (hits.includes(box.el)) {
              root.io?.unobserve(box.el);
              eng.enqueue(box);
            }
          }
        },
        { rootMargin: root.opts.rootMargin },
      );
      for (const box of boxes) root.io.observe(box.el);
    } else {
      for (const box of boxes) eng.enqueue(box);
    }
  };

  const start = (boxes: Box[]) => {
    if (instant()) {
      for (const box of boxes) eng.finish(box);
      return;
    }
    observe(boxes);
  };

  // Arm before the first paint: callers run this in a layout effect or right after the DOM exists.
  const initial = collect();
  initial.forEach(arm);
  if (instant()) initial.forEach((b) => eng.finish(b));

  // New children (a list that grows, a lazy section) join the queue too.
  root.mo = new MutationObserver(() => {
    if (destroyed) return;
    const added = collect();
    if (!added.length) return;
    root.completed = false;
    added.forEach(arm);
    if (root.playing) start(added);
  });
  root.mo.observe(rootEl, { childList: true, subtree: true });

  const play = () => {
    if (destroyed || root.playing) return;
    root.playing = true;
    start(root.boxes.filter((b) => b.state === "pending"));
  };

  const reveal = () => {
    root.io?.disconnect();
    root.io = null;
    for (const box of root.boxes) eng.finish(box);
  };

  const replay = () => {
    if (destroyed) return;
    root.io?.disconnect();
    root.io = null;
    root.completed = true; // no onComplete for the reset itself
    for (const box of root.boxes) eng.finish(box);
    root.boxes = root.boxes.filter((b) => b.el.isConnected);
    root.started = false;
    root.completed = false;
    root.boxes.forEach(arm);
    root.playing = true;
    if (instant()) return reveal();
    // Replays build at once, whatever the trigger, but still in document order.
    for (const box of root.boxes) eng.enqueue(box);
  };

  const destroy = () => {
    if (destroyed) return;
    reveal();
    destroyed = true;
    root.mo?.disconnect();
    for (const box of root.boxes) {
      delete box.el.dataset.swarmState;
      for (const block of box.blocks) eng.showBlock(block);
    }
    eng.detach(root);
  };

  if (root.opts.trigger !== "manual") play();

  return { play, replay, reveal, destroy };
}

/** Shorthand for `createSwarm`. */
export const swarm = createSwarm;

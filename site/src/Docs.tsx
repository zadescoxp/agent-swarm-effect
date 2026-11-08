import { Code } from "./Code";

const props: [string, string, string, string][] = [
  ["selector", "string", "[data-swarm] or children", "Which elements get built. Without it, elements marked data-swarm are used, or the wrapper's direct children when nothing is marked."],
  ["trigger", '"visible" | "mount" | "manual"', '"visible"', "visible builds each element as it scrolls into view. mount builds everything on mount. manual waits for play()."],
  ["speed", "number", "1", "Playback speed. 2 is twice as fast."],
  ["theme", '"auto" | "light" | "dark" | { ink, paper, accent }', '"auto"', "auto reads the background behind each frame and picks light or dark ink. Pass colours to match a brand."],
  ["labels", "boolean", "true", "The `Label  W×H` tag on each frame."],
  ["names", "boolean", "true", "The name tag that follows each cursor."],
  ["namePrefix", "string", '"agent"', "Agents are called agent-01, agent-02… Change the prefix here."],
  ["scan", "boolean", "true", "Sweep a scan line over elements taller than 44px."],
  ["typing", "boolean", "true", "Type text in character by character. When false, text appears with its frame."],
  ["font", "string", "system mono, 9px", "CSS font shorthand for tags and labels."],
  ["respectReducedMotion", "boolean", "true", "Show everything at once for people who prefer reduced motion."],
  ["rootMargin", "string", '"0px 0px -6% 0px"', "IntersectionObserver margin for the visible trigger."],
  ["onStart / onComplete", "() => void", "—", "Called when the first element starts, and when every element is built and typed."],
  ["as", "ElementType", '"div"', "The wrapper element. Every other prop passes straight through to it."],
];

const attrs: [string, string][] = [
  ['data-swarm="Label"', "Build this element as its own frame. The value is shown in the frame's tag."],
  ['data-swarm-label="Label"', "Rename a frame without marking it (for elements picked by selector or as children)."],
  ["data-swarm-skip", "Don't type the text inside this element. It shows up with its frame."],
  ['data-swarm-state', "Set by the library: pending, built, done. Style against it if you like."],
];

const REF = `import { Swarm, type SwarmHandle } from "agent-swarm-effect";

const swarm = useRef<SwarmHandle>(null);

<Swarm ref={swarm} trigger="manual">
  <Hero />
</Swarm>

swarm.current?.play();    // start a manual swarm
swarm.current?.replay();  // hide everything and build it again
swarm.current?.reveal();  // skip to the end`;

const HOOK = `import { useSwarm } from "agent-swarm-effect";

function Card() {
  const ref = useRef<HTMLDivElement>(null);
  const swarm = useSwarm(ref, { speed: 1.5, labels: false });
  return (
    <div ref={ref} onClick={() => swarm.replay()}>
      <h3>No wrapper needed</h3>
      <p>The hook attaches to an element you already render.</p>
    </div>
  );
}`;

const VANILLA = `import { createSwarm } from "agent-swarm-effect/vanilla";

const swarm = createSwarm(document.querySelector("main"), {
  selector: "section, h1, p",
  theme: { ink: "#1b3dff", paper: "#fff", accent: "#1b3dff" },
  onComplete: () => console.log("built"),
});

// later
swarm.destroy();`;

const NEXT = `// app/page.tsx — Server Components are fine.
// agent-swarm-effect ships with "use client" already.
import { Swarm } from "agent-swarm-effect";

export default function Page() {
  return (
    <Swarm as="main" selector="[data-swarm]">
      <h1 data-swarm="Headline">Hello</h1>
      <section data-swarm="Features">…</section>
    </Swarm>
  );
}`;

export default function Docs() {
  return (
    <div className="docs">
      <aside className="docs-toc">
        <span>On this page</span>
        <a href="#props">Props</a>
        <a href="#attributes">Data attributes</a>
        <a href="#handle">Imperative handle</a>
        <a href="#hook">useSwarm</a>
        <a href="#vanilla">Vanilla JS</a>
        <a href="#next">Next.js</a>
        <a href="#how">How it works</a>
      </aside>

      <div className="docs-body">
        <h3 id="props" className="docs-h">
          Props <small>{"<Swarm />"}</small>
        </h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Default</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              {props.map(([name, type, def, desc]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td className="t-type">{type}</td>
                  <td className="t-def">{def}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 id="attributes" className="docs-h">
          Data attributes
        </h3>
        <dl className="attrs">
          {attrs.map(([k, v]) => (
            <div key={k}>
              <dt>
                <code>{k}</code>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <h3 id="handle" className="docs-h">
          Imperative handle
        </h3>
        <p className="docs-p">A ref on {"<Swarm>"} gives you the controls, plus the wrapper element.</p>
        <Code code={REF} />

        <h3 id="hook" className="docs-h">
          useSwarm
        </h3>
        <p className="docs-p">Same options, no extra wrapper element. Returns a stable controller.</p>
        <Code code={HOOK} />

        <h3 id="vanilla" className="docs-h">
          Vanilla JS
        </h3>
        <p className="docs-p">
          The core has no framework in it. Import from <code>agent-swarm-effect/vanilla</code> and point it at any element. Works with
          Vue, Svelte, Astro or a plain HTML page.
        </p>
        <Code code={VANILLA} label="js" />

        <h3 id="next" className="docs-h">
          Next.js
        </h3>
        <p className="docs-p">
          The wrapper renders hidden on the server and is armed before the first paint in the browser, so content never
          flashes before the agents get to it.
        </p>
        <Code code={NEXT} />

        <h3 id="how" className="docs-h">
          How it works
        </h3>
        <ol className="how">
          <li>
            <b>One canvas.</b> Every swarm on the page shares a single fixed, click-through overlay. When nothing is being
            built, the animation loop stops completely.
          </li>
          <li>
            <b>A queue per swarm.</b> Each swarm builds its elements in document order, starting the next frame when
            the current one is 75% drawn, so the crew flows rather than stampedes. Separate swarms work side by side.
          </li>
          <li>
            <b>Real typing, real kerning.</b> Text is hidden with the CSS Custom Highlight API, not split into spans, so
            your type, wrapping and ligatures stay exactly as designed. Multi-line text types line by line.
          </li>
          <li>
            <b>Scroll-aware.</b> Frames follow their elements every frame. Anything you scroll past before its turn is shown
            at once, so nothing lags behind the reader.
          </li>
          <li>
            <b>Accessible.</b> The canvas is aria-hidden, text stays in the DOM for screen readers the whole time, and
            reduced-motion users get the finished page instantly.
          </li>
        </ol>
      </div>
    </div>
  );
}

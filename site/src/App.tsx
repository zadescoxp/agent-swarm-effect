import { Swarm, useSwarm } from "agent-swarm-effect";
import { useEffect, useRef, useState } from "react";
import { Code, GitHubIcon } from "./Code";
import Docs from "./Docs";
import Examples from "./Examples";

export const REPO = "zadescoxp/agent-swarm-effect";
export const REPO_URL = `https://github.com/${REPO}`;

const QUICK = `import { Swarm } from "agent-swarm-effect";

export default function Page() {
  return (
    <Swarm>
      <div>this is a div</div>
    </Swarm>
  );
}`;

let starsRequest: Promise<number | null> | null = null;
const fetchStars = () =>
  (starsRequest ??= fetch(`https://api.github.com/repos/${REPO}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (typeof d?.stargazers_count === "number" ? d.stargazers_count : null))
    .catch(() => null));

function useStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetchStars().then((n) => alive && setStars(n));
    return () => {
      alive = false;
    };
  }, []);
  return stars;
}

export function StarButton({ big = false }: { big?: boolean }) {
  const stars = useStars();
  return (
    <a className={`star ${big ? "star-big" : ""}`} href={REPO_URL} target="_blank" rel="noopener noreferrer">
      <GitHubIcon size={big ? 22 : 15} />
      <span>Star Us</span>
      {stars !== null && <span className="star-count">★ {stars.toLocaleString()}</span>}
    </a>
  );
}

/** Four big outlined cursors, marching across the poster like the agents do. */
function CursorArt() {
  const arrow = "M0 0 L90 54 L50 64 L28 106 Z";
  return (
    <svg className="cursor-art" viewBox="0 0 590 310" overflow="visible" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${40 + i * 92} ${20 + i * 6}) scale(2.35) rotate(-8)`}>
          <path d={arrow} className="cursor-art-path" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      <g transform="translate(372 300)">
        <rect x="0" y="-30" width="74" height="18" rx="9" className="cursor-art-tag" />
        <text x="10" y="-17.5" className="cursor-art-text">
          agent-04
        </text>
      </g>
    </svg>
  );
}

/** The tiny build that loops forever inside the black panel. */
function PanelDemo({ go }: { go: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const api = useSwarm(ref, {
    trigger: "manual",
    speed: 0.9,
    namePrefix: "agent",
    onComplete: () => {
      timer.current = window.setTimeout(() => api.replay(), 2600);
    },
  });
  useEffect(() => {
    if (go) api.play();
  }, [go, api]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div ref={ref} className="panel-demo" data-swarm-skip>
      <div className="panel-div" data-swarm-label="div">
        this is a div
      </div>
    </div>
  );
}

function Hero() {
  const [built, setBuilt] = useState(false);
  return (
    <header className="poster-wrap">
      <Swarm as="div" className="poster" selector="[data-swarm]" theme="dark" onComplete={() => setBuilt(true)}>
        <h1 className="title" data-swarm="Title">
          SWARM
        </h1>

        <div className="meta meta-1" data-swarm="Meta">
          <span>AGENT-SWARM-EFFECT</span>
          <span>REACT COMPONENT</span>
        </div>
        <div className="meta meta-2" data-swarm="Meta">
          <span>LICENSE</span>
          <span>MIT, FREE</span>
        </div>
        <div className="meta meta-3" data-swarm="Meta">
          <span>SIZE</span>
          <span>6KB GZIP</span>
        </div>

        <nav className="poster-nav" data-swarm="Nav">
          <a href="#install">Install</a>
          <a href="#examples">Examples</a>
          <a href="#docs">Docs</a>
          <StarButton />
        </nav>

        <div className="poster-left">
        <p className="manifesto m-1" data-swarm="Text">
          Maybe it's just a wrapper. But every div deserves a crew. Somebody has to drag the frame, somebody has to type
          the words, and somebody has to leave before you notice they were there.
        </p>
        <p className="manifesto m-2" data-swarm="Text">
          Sometimes I remember the first layout I ever shipped. It loaded all at once, flat, silent. So now a swarm of
          very small agents builds yours, one box at a time, in order, and then gets out of the way. Doctor, this
          might be a long journey, but it's all right.
        </p>
        </div>

        <div className="poster-mid">
        <div className="credit c-1" data-swarm="Credit">
          ©2026. Open source BY Zade
        </div>
        <div className="credit c-2" data-swarm="Credit">
          <span className="credit-dim">Works with</span>
          <span>React · Next.js · Vite · Vanilla JS</span>
        </div>
        </div>

        <div className="panel" data-swarm="Panel">
          <div className="panel-top">
            <span>STARTING ;</span>
            <span>npm i agent-swarm-effect</span>
          </div>
          <p className="panel-copy">
            Swarm, a crew for every element. Wrap anything, and cursor agents fly in to drag out its frame, sweep it with
            a scan line and type its text in, one character at a time. Then they leave.
          </p>
          <PanelDemo go={built} />
          <pre className="panel-code">{`<Swarm>
  <div>this is a div</div>
</Swarm>`}</pre>
        </div>

        <CursorArt />

        <div className="poster-foot" data-swarm="Footer">
          <span>DOM</span>
          <span>CANVAS</span>
          <span>HIGHLIGHT API</span>
          <span>TS</span>
          <span className="foot-version">v0.1.0</span>
        </div>
      </Swarm>
    </header>
  );
}

function Interlude() {
  return (
    <section className="interlude" aria-label="What the agents say">
      <div className="terrain" aria-hidden="true" />
      <div className="shard shard-1" aria-hidden="true" />
      <div className="shard shard-2" aria-hidden="true" />
      <Swarm className="interlude-inner" selector="[data-swarm]" theme={{ ink: "#1b3dff", paper: "#ffffff", accent: "#1b3dff" }}>
        <h2 className="giant" data-swarm="Display">
          Agents
        </h2>
        <svg className="figure" viewBox="0 0 120 180" aria-hidden="true">
          <path d="M10 6 L104 62 L62 73 L38 120 Z" />
          <rect x="44" y="132" width="66" height="22" rx="11" />
          <text x="54" y="147">agent-01</text>
        </svg>
        <span className="say say-1" data-swarm="Say">
          Hey, who drew this box?
        </span>
        <span className="say say-2" data-swarm="Say">
          If you don't care about the frame
        </span>
        <span className="say say-3" data-swarm="Say">
          Oh okay, as you like
        </span>
        <span className="say say-4" data-swarm="Say">
          agent-07, prepare your caret
        </span>
      </Swarm>
    </section>
  );
}

function Section({ id, num, title, kicker, children }: { id: string; num: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="section" id={id}>
      <Swarm className="section-head" selector="[data-swarm]">
        <span className="section-num" data-swarm="Index">
          ({num})
        </span>
        <h2 className="section-title" data-swarm="Heading">
          {title}
        </h2>
        <p className="section-kicker" data-swarm="Text">
          {kicker}
        </p>
      </Swarm>
      {children}
    </section>
  );
}

function Install() {
  const [copied, setCopied] = useState(false);
  const cmd = "npm i agent-swarm-effect";
  return (
    <Section id="install" num="01" title="Install" kicker="One package. No dependencies. React is optional: there is a framework-free core too.">
      <div className="install">
        <button
          type="button"
          className="install-cmd"
          onClick={() => {
            navigator.clipboard?.writeText(cmd).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          <span className="install-prompt">$</span>
          <span>{cmd}</span>
          <span className="install-copy">{copied ? "copied" : "copy"}</span>
        </button>
        <div className="install-alts">
          <code>pnpm add agent-swarm-effect</code>
          <code>yarn add agent-swarm-effect</code>
          <code>bun add agent-swarm-effect</code>
        </div>
      </div>
      <div className="quick">
        <Code code={QUICK} label="page.tsx" />
        <div className="quick-result">
          <span className="quick-label">Result</span>
          <QuickDemo />
        </div>
      </div>
    </Section>
  );
}

function QuickDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const api = useSwarm(ref);
  return (
    <>
      <div ref={ref} className="quick-stage">
        <div className="quick-div">this is a div</div>
      </div>
      <button type="button" className="pill pill-blue quick-replay" onClick={() => api.replay()}>
        Replay ↻
      </button>
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <Swarm className="footer-card" selector="[data-swarm]" theme="dark">
        <p className="footer-kicker" data-swarm="Text">
          Free forever. MIT licensed. Built in the open.
        </p>
        <h2 className="footer-title" data-swarm="Title">
          GIVE THE AGENTS A STAR
        </h2>
        <div className="footer-row" data-swarm="Actions">
          <StarButton big />
          <a className="footer-link" href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            Report an issue ↗
          </a>
          <a className="footer-link" href="https://www.npmjs.com/package/agent-swarm-effect" target="_blank" rel="noopener noreferrer">
            npm ↗
          </a>
        </div>
        <div className="footer-base" data-swarm="Credit">
          <span>agent-swarm-effect</span>
          <span>
            Made by{" "}
            <a href="https://zadescoxp.com" target="_blank" rel="noopener noreferrer">
              Zade
            </a>
          </span>
          <span>©2026</span>
        </div>
      </Swarm>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <Interlude />
        <Install />
        <Section id="examples" num="02" title="Examples" kicker="Every card below is live. Hit replay and watch the crew work again.">
          <Examples />
        </Section>
        <Section id="docs" num="03" title="Docs" kicker="Props, data attributes, the imperative handle, the hook and the vanilla core.">
          <Docs />
        </Section>
      </main>
      <Footer />
    </>
  );
}

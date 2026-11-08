import { Swarm, type SwarmHandle, type SwarmProps } from "agent-swarm-effect";
import { useRef, useState, type ReactNode } from "react";
import { Code } from "./Code";

type Example = {
  id: string;
  title: string;
  note: string;
  wide?: boolean;
  props?: Omit<SwarmProps, "children">;
  code: string;
  demo: ReactNode;
};

const examples: Example[] = [
  {
    id: "A",
    title: "Profile card",
    note: "Mark the parts you want built one by one with data-swarm. The value becomes the frame's label.",
    code: `<Swarm>
  <article className="profile" data-swarm="Card">
    <div className="avatar" data-swarm="Avatar" />
    <h3 data-swarm="Name">Ada Okafor</h3>
    <p data-swarm="Role">Design engineer, Lagos</p>
    <button data-swarm="Button">Follow</button>
  </article>
</Swarm>`,
    demo: (
      <article className="ex-profile" data-swarm="Card">
        <div className="ex-avatar" data-swarm="Avatar">
          <span>AO</span>
        </div>
        <div>
          <h3 data-swarm="Name">Ada Okafor</h3>
          <p data-swarm="Role">Design engineer, Lagos</p>
        </div>
        <button type="button" data-swarm="Button">
          Follow
        </button>
      </article>
    ),
  },
  {
    id: "B",
    title: "Chat thread",
    note: "Direct children are built in document order. Bubbles get typed in like someone is replying live.",
    props: { speed: 1.2 },
    code: `<Swarm speed={1.2}>
  <p className="bubble">Is the hero done?</p>
  <p className="bubble me">The agents are on it.</p>
  <p className="bubble">agent-07 is typing…</p>
  <p className="bubble me">Ship it.</p>
</Swarm>`,
    demo: (
      <>
        <p className="ex-bubble">Is the hero done?</p>
        <p className="ex-bubble me">The agents are on it.</p>
        <p className="ex-bubble">agent-07 is typing…</p>
        <p className="ex-bubble me">Ship it.</p>
      </>
    ),
  },
  {
    id: "C",
    title: "Pricing",
    note: "A dark element on a light page: theme auto reads the background behind every frame and flips its ink.",
    props: { theme: "auto" },
    code: `<Swarm theme="auto">
  <div className="plan dark" data-swarm="Plan">
    <span data-swarm="Tier">Studio</span>
    <strong data-swarm="Price">$0</strong>
    <ul data-swarm="Perks">
      <li>Unlimited agents</li>
      <li>Every div, framed</li>
      <li>MIT licensed</li>
    </ul>
  </div>
</Swarm>`,
    demo: (
      <div className="ex-plan" data-swarm="Plan">
        <span className="ex-tier" data-swarm="Tier">
          Studio
        </span>
        <strong className="ex-price" data-swarm="Price">
          $0<small>/forever</small>
        </strong>
        <ul data-swarm="Perks">
          <li>Unlimited agents</li>
          <li>Every div, framed</li>
          <li>MIT licensed</li>
        </ul>
      </div>
    ),
  },
  {
    id: "D",
    title: "Editorial",
    note: "Big type, custom colours. Pass ink, paper and accent to match your brand.",
    props: { theme: { ink: "#1b3dff", paper: "#ffffff", accent: "#1b3dff" }, namePrefix: "editor" },
    code: `<Swarm
  namePrefix="editor"
  theme={{ ink: "#1b3dff", paper: "#fff", accent: "#1b3dff" }}
>
  <span>Issue Nº 04</span>
  <h2>Who drew <em>this</em> box?</h2>
  <p>Not you. A swarm of very small agents did.</p>
</Swarm>`,
    demo: (
      <>
        <span className="ex-kicker">Issue Nº 04 — Autumn</span>
        <h2 className="ex-head">
          Who drew <em>this</em> box?
        </h2>
        <p className="ex-dek">Not you. A swarm of very small agents did, one frame at a time.</p>
      </>
    ),
  },
  {
    id: "E",
    title: "Stats",
    note: "Turn off the labels or the name tags when the layout is dense.",
    props: { labels: false, selector: ".ex-stat" },
    code: `<Swarm labels={false} selector=".stat">
  <div className="stat"><b>48</b><span>agents</span></div>
  <div className="stat"><b>6kb</b><span>gzipped</span></div>
  <div className="stat"><b>0</b><span>dependencies</span></div>
</Swarm>`,
    demo: (
      <div className="ex-stats">
        <div className="ex-stat">
          <b>48</b>
          <span>agents per page</span>
        </div>
        <div className="ex-stat">
          <b>6kb</b>
          <span>gzipped</span>
        </div>
        <div className="ex-stat">
          <b>0</b>
          <span>dependencies</span>
        </div>
      </div>
    ),
  },
  {
    id: "F",
    title: "Sign-up form",
    note: "Skip any text you don't want typed with data-swarm-skip. It appears with its frame instead.",
    props: { speed: 1.4 },
    code: `<Swarm speed={1.4}>
  <label>Email</label>
  <input placeholder="you@studio.com" />
  <button>Join the swarm</button>
  <small data-swarm-skip>No spam. Only agents.</small>
</Swarm>`,
    demo: (
      <>
        <label className="ex-label">Email</label>
        <div className="ex-input">you@studio.com</div>
        <button type="button" className="ex-join">
          Join the swarm →
        </button>
        <small className="ex-small" data-swarm-skip>
          No spam. Only agents.
        </small>
      </>
    ),
  },
];

function ExampleCard({ ex }: { ex: Example }) {
  const ref = useRef<SwarmHandle>(null);
  const [showCode, setShowCode] = useState(false);
  return (
    <figure className={`example ${ex.wide ? "is-wide" : ""}`}>
      <figcaption className="example-head">
        <span className="example-id">({ex.id})</span>
        <span className="example-title">{ex.title}</span>
        <button type="button" className="pill" onClick={() => setShowCode((v) => !v)}>
          {showCode ? "Demo" : "Code"}
        </button>
        <button type="button" className="pill pill-blue" onClick={() => ref.current?.replay()} disabled={showCode}>
          Replay ↻
        </button>
      </figcaption>
      <div className={`example-stage stage-${ex.id}`} hidden={showCode}>
        <Swarm ref={ref} className={`demo demo-${ex.id}`} {...ex.props}>
          {ex.demo}
        </Swarm>
      </div>
      {showCode && <Code code={ex.code} className="example-code" />}
      <p className="example-note">{ex.note}</p>
    </figure>
  );
}

export default function Examples() {
  return (
    <div className="examples">
      {examples.map((ex) => (
        <ExampleCard key={ex.id} ex={ex} />
      ))}
    </div>
  );
}

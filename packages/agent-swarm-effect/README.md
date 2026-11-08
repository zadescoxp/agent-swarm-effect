# agent-swarm-effect

[![npm version](https://img.shields.io/npm/v/agent-swarm-effect?color=1b3dff&label=npm)](https://www.npmjs.com/package/agent-swarm-effect)
[![npm downloads](https://img.shields.io/npm/dm/agent-swarm-effect?color=1b3dff)](https://www.npmjs.com/package/agent-swarm-effect)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/agent-swarm-effect?color=1b3dff&label=size)](https://bundlephobia.com/package/agent-swarm-effect)
[![license](https://img.shields.io/npm/l/agent-swarm-effect?color=1b3dff)](https://github.com/zadescoxp/agent-swarm-effect/blob/main/LICENSE)

**[Website and live examples](https://zadescoxp.github.io/agent-swarm-effect/)** · **[GitHub](https://github.com/zadescoxp/agent-swarm-effect)**

Wrap any element and a swarm of cursor agents flies in to build it: one drags out the frame, a scan line sweeps it, another boxes each piece of text, and an I-beam types the text in, one character at a time. Then they leave.

- **One component.** `<Swarm>` around anything. No setup.
- **Real typing, real kerning.** Text is hidden with the CSS Custom Highlight API, not split into spans, so your type stays exactly as designed. Multi-line text types line by line.
- **Light.** About 6 KB gzipped, zero dependencies. One shared canvas, and nothing runs while nothing is being built.
- **Works anywhere.** React 17+, Next.js (ships with `"use client"`), Vite, or framework-free through `agent-swarm-effect/vanilla`.
- **Polite.** The canvas is `aria-hidden` and ignores clicks, text stays in the DOM, and people who prefer reduced motion get the finished page right away.

## Install

```bash
npm i agent-swarm-effect
```

## Usage

```tsx
import { Swarm } from "agent-swarm-effect";

export default function Page() {
  return (
    <Swarm>
      <div>this is a div</div>
    </Swarm>
  );
}
```

By default each direct child of `<Swarm>` gets its own frame. To pick the parts yourself, mark them with `data-swarm`. The value becomes the frame's label:

```tsx
<Swarm>
  <article data-swarm="Card">
    <h3 data-swarm="Name">Ada Okafor</h3>
    <p data-swarm="Role">Design engineer</p>
    <button data-swarm="Button">Follow</button>
  </article>
</Swarm>
```

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `selector` | `string` | `[data-swarm]`, else children | Which elements get built. |
| `trigger` | `"visible" \| "mount" \| "manual"` | `"visible"` | When building starts. |
| `speed` | `number` | `1` | Playback speed. |
| `theme` | `"auto" \| "light" \| "dark" \| { ink, paper, accent }` | `"auto"` | `auto` reads the background behind each frame. |
| `labels` | `boolean` | `true` | `Label  W×H` tags on frames. |
| `names` | `boolean` | `true` | Name tags on cursors. |
| `namePrefix` | `string` | `"agent"` | `agent-01`, `agent-02`… |
| `scan` | `boolean` | `true` | Scan line over taller elements. |
| `typing` | `boolean` | `true` | Type text in. When false, text appears with its frame. |
| `font` | `string` | system mono | CSS font shorthand for tags. |
| `respectReducedMotion` | `boolean` | `true` | Skip the effect for reduced-motion users. |
| `rootMargin` | `string` | `"0px 0px -6% 0px"` | Margin for the `visible` trigger. |
| `onStart`, `onComplete` | `() => void` | | Lifecycle callbacks. |
| `as` | `ElementType` | `"div"` | Wrapper element. Other props pass through. |

### Data attributes

- `data-swarm="Label"`: build this element as its own frame.
- `data-swarm-label="Label"`: rename a frame without marking it.
- `data-swarm-skip`: don't type the text inside. It appears with its frame.
- `data-swarm-state`: set by the library (`pending`, `built`, `done`).

## Controls

```tsx
const swarm = useRef<SwarmHandle>(null);

<Swarm ref={swarm} trigger="manual">…</Swarm>

swarm.current?.play();
swarm.current?.replay();
swarm.current?.reveal();
```

### Hook

```tsx
const ref = useRef<HTMLDivElement>(null);
const swarm = useSwarm(ref, { speed: 1.5 });
```

### Vanilla JS

```js
import { createSwarm } from "agent-swarm-effect/vanilla";

const swarm = createSwarm(document.querySelector("main"), { selector: "section, h1, p" });
swarm.destroy();
```

## Browser support

Every evergreen browser. Character-by-character typing uses the CSS Custom Highlight API (Chrome 105+, Safari 17.2+, Firefox 140+). Where it isn't available, text appears whole when its typist arrives.

## License

MIT © Zade

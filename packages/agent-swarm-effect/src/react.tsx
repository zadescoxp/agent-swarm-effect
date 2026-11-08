import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { createSwarm, type SwarmController, type SwarmOptions } from "./core";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Options whose change should rebuild the effect. Callbacks are read live instead. */
function optionKey(o: SwarmOptions) {
  const { onStart: _s, onComplete: _c, ...rest } = o;
  return JSON.stringify(rest);
}

/**
 * Attach the swarm to an element you already render.
 *
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const swarm = useSwarm(ref, { trigger: "manual" });
 * <button onClick={() => swarm.replay()}>Replay</button>
 * ```
 */
export function useSwarm(ref: RefObject<HTMLElement | null>, options: SwarmOptions = {}): SwarmController {
  const controller = useRef<SwarmController | null>(null);
  const callbacks = useRef(options);
  callbacks.current = options;
  const key = optionKey(options);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parsed = JSON.parse(key) as SwarmOptions;
    const c = createSwarm(el, {
      ...parsed,
      onStart: () => callbacks.current.onStart?.(),
      onComplete: () => callbacks.current.onComplete?.(),
    });
    controller.current = c;
    return () => {
      c.destroy();
      if (controller.current === c) controller.current = null;
    };
  }, [key, ref]);

  // A stable object whose methods always reach the live controller.
  const [api] = useState<SwarmController>(() => ({
    play: () => controller.current?.play(),
    replay: () => controller.current?.replay(),
    reveal: () => controller.current?.reveal(),
    destroy: () => controller.current?.destroy(),
  }));
  return api;
}

export interface SwarmHandle extends SwarmController {
  /** The wrapper element. */
  element: HTMLElement | null;
}

export type SwarmProps = SwarmOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof SwarmOptions> & {
    /** The element to render as the wrapper. Default `div`. */
    as?: ElementType;
    children?: ReactNode;
  };

/**
 * Wrap anything to have a swarm of agents build it.
 *
 * ```tsx
 * <Swarm>
 *   <div>this is a div</div>
 * </Swarm>
 * ```
 */
export const Swarm = forwardRef<SwarmHandle, SwarmProps>(function Swarm(
  {
    as = "div",
    children,
    selector,
    trigger,
    speed,
    theme,
    labels,
    names,
    namePrefix,
    scan,
    typing,
    font,
    respectReducedMotion,
    rootMargin,
    onStart,
    onComplete,
    style,
    ...rest
  },
  ref,
) {
  const el = useRef<HTMLElement>(null);
  // Hidden until armed, so server-rendered markup never flashes before the agents arrive.
  const [armed, setArmed] = useState(false);
  const api = useSwarm(el, {
    selector,
    trigger,
    speed,
    theme,
    labels,
    names,
    namePrefix,
    scan,
    typing,
    font,
    respectReducedMotion,
    rootMargin,
    onStart,
    onComplete,
  });

  useIsoLayoutEffect(() => setArmed(true), []);

  useImperativeHandle(
    ref,
    () => ({
      ...api,
      get element() {
        return el.current;
      },
    }),
    [api],
  );

  const merged: CSSProperties | undefined = armed ? style : { ...style, visibility: "hidden" };
  return createElement(as, { ...rest, ref: el, style: merged, "data-swarm-root": "" }, children);
});

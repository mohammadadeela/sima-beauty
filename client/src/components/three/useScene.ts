import { useEffect, useRef, useState, type RefObject } from "react";
import { createRenderer, type Renderer } from "./engine";

export interface Frame { r: Renderer; t: number; dt: number; w: number; h: number; reduced: boolean }

/**
 * Runs a 3D scene on a canvas: sets up WebGL, keeps the size right, and only
 * draws while the canvas is actually on screen (so it never drains a phone).
 * `setup` runs once and returns the function that draws each frame.
 * Returns true when the device can't do WebGL, so the caller can show a picture instead.
 */
export function useScene(canvasRef: RefObject<HTMLCanvasElement>, setup: (r: Renderer, canvas: HTMLCanvasElement) => ((f: Frame) => void) | { frame: (f: Frame) => void; dispose?: () => void }) {
  const [failed, setFailed] = useState(false);
  const setupRef = useRef(setup);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = createRenderer(canvas);
    if (!r) { setFailed(true); return; }
    const made = setupRef.current(r, canvas);
    const frame = typeof made === "function" ? made : made.frame;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = false, start = 0, last = 0, size = r.resize();
    const ro = new ResizeObserver(() => { size = r.resize(); });
    ro.observe(canvas);
    const tick = (now: number) => {
      raf = visible ? requestAnimationFrame(tick) : 0;
      if (!size.w || !size.h) return;
      if (!start) { start = now; last = now; }
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      frame({ r, t: (now - start) / 1000, dt, w: size.w, h: size.h, reduced });
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }, { rootMargin: "80px" });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); if (typeof made !== "function") made.dispose?.(); };
  }, [canvasRef]);
  return failed;
}

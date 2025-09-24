<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { assets } from "$app/paths";

  /** Public API */
  export let visible: boolean | number = false;                      // boolean or incrementing number
  export let spotImage: string = "HealthSpaces_Icon6_circle.png";    // /static filename
  export let anchor: HTMLElement | null = null;                      // optional grid wrapper for precise alignment

  /** Ring shape (NEW) */
  export let ringShape: "ellipse" | "circle" = "circle";             // force perfect circle by default
  export let circleRadiusMode: "fit" | "cover" = "cover";            // 'cover' surrounds the rect; 'fit' inscribes it

  /** Motion / layout */
  export let pad = -64;                   // ring sits this many px outside the grid bounds
  export let patternScale = 3.0;         // particle density multiplier
  export let slowFactor = 0.4;           // lower = slower outward travel (you set this)
  export let durationMin = 0.72;         // per-sprite min duration (seconds)
  export let durationMax = 2.36;         // per-sprite max duration (seconds)

  /** Visuals */
  export let sizeMin = 26;               // sprite min size (px)
  export let sizeMax = 42;               // sprite max size (px)
  export let zIndex = 2147483647;        // draw above everything
  export let debug = false;              // outline the anchor rect & crosshair

  /** Lifetime */
  export let autoHideMs = 7200;          // total life of burst (ms) — you set this long

  /** Resolve static asset robustly (handles base path + strips directories) */
  $: resolvedSrc = `${assets}/${(spotImage || "").split(/[/\\]/).pop() || "HealthSpaces_Icon6_circle.png"}`;

  // Canvas overlay (fixed, full viewport)
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  type Spot = {
    sx: number; sy: number;   // start position (viewport px)
    dx: number; dy: number;   // normalized outward direction
    dist: number;             // travel distance to go off-screen
    size: number;             // sprite size (px)
    delay: number;            // sec
    dur: number;              // sec
    rot0: number;             // initial rotation (rad)
    rps: number;              // rotations per second
  };

  let spots: Spot[] = [];
  let img: HTMLImageElement | null = null;
  let imgLoaded = false;

  let raf = 0;
  let playing = false;
  let tStart = 0;
  let lastTriggerKey: string | number | boolean = false;

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  const rnd   = (min: number, max: number) => Math.random() * (max - min) + min;
  const rndi  = (min: number, max: number) => Math.floor(rnd(min, max + 1));

  function getAnchorEl(): HTMLElement | null {
    if (anchor) return anchor;
    // canvas is inside <div> which is inside your grid wrapper — parentElement?.parentElement keeps it robust
    const parent = canvas?.parentElement?.parentElement;
    return (parent as HTMLElement) || document.body;
  }

  function measure() {
    const el = getAnchorEl();
    if (!el) return null;

    const r = el.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;

    // ellipse radii by default
    let rx = r.width  / 2 + pad;
    let ry = r.height / 2 + pad;

    // perfect circle option
    if (ringShape === "circle") {
      const base = circleRadiusMode === "cover"
        ? Math.max(r.width, r.height) / 2
        : Math.min(r.width, r.height) / 2;
      const circ = base + pad;
      rx = circ;
      ry = circ;
    }

    return { rect: r, vw, vh, cx, cy, rx, ry };
  }

  function buildSpots() {
    const m = measure();
    if (!m) { spots = []; return; }

    const { rect, vw, vh, cx, cy, rx, ry } = m;
    const perimeter = 2 * (rect.width + rect.height);
    const count = clamp(Math.round((perimeter / 26) * patternScale), 60, 360); // slightly higher ceiling for circle density

    const arr: Spot[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2 + rnd(-0.10, 0.10);

      // Start on ellipse/circle around the grid
      const sx = cx + rx * Math.cos(t);
      const sy = cy + ry * Math.sin(t);

      // Outward direction (normalized)
      let dx = Math.cos(t);
      let dy = Math.sin(t);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;

      // Travel until off-screen (with slight overshoot)
      const maxX = dx >= 0 ? vw - sx : sx;
      const maxY = dy >= 0 ? vh - sy : sy;
      const travel = Math.hypot(maxX * dx, maxY * dy) * rnd(1.05, 1.20) * slowFactor;

      arr.push({
        sx, sy, dx, dy,
        dist: travel,
        size: rndi(sizeMin, sizeMax),
        delay: rnd(0.0, 0.18),
        dur: rnd(durationMin, Math.max(durationMin, durationMax)),
        rot0: rnd(0, Math.PI * 2),
        rps: rnd(0.35, 0.75)
      });
    }
    spots = arr;
    if (debug) console.log("[CompletionRing] spots", spots.length);
  }

  // ease + alpha
  function easeOutCubic(u: number) {
    const t = clamp(u, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }
  function alphaCurve(u: number) {
    // Fade in 0..0.12, hold 0.12..0.75, fade out 0.75..1
    if (u <= 0) return 0;
    if (u < 0.12) return u / 0.12;
    if (u < 0.75) return 1;
    if (u < 1.0)  return 1 - (u - 0.75) / 0.25;
    return 0;
  }

  function draw(nowMs: number) {
    if (!canvas || !ctx) return;
    if (!imgLoaded) { // don't render placeholders—prevents any UI tint
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Resize canvas for crispness
    const targetW = Math.floor(W * dpr);
    const targetH = Math.floor(H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, W, H);

    const tNow = (nowMs - tStart) / 1000; // seconds since start

    for (const s of spots) {
      const local = (tNow - s.delay) / s.dur; // 0..1 in its own schedule
      if (local <= 0 || local >= 1) continue;

      const p = easeOutCubic(local);
      const x = s.sx + s.dx * s.dist * p;
      const y = s.sy + s.dy * s.dist * p;

      const a = alphaCurve(local);
      if (a <= 0) continue;

      const angle = s.rot0 + (nowMs / 1000) * (Math.PI * 2) * s.rps;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Soft shadow
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      const w = s.size, h = s.size;

      // ✅ Only draw your PNG (NO colored fallback to avoid tinting the UI)
      ctx.drawImage(img!, -w / 2, -h / 2, w, h);

      ctx.restore();
    }

    if (debug) {
      const m = measure();
      if (m) {
        // Anchor outline and crosshair (no tint fill)
        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(m.rect.left, m.rect.top, m.rect.width, m.rect.height);
        ctx.beginPath();
        ctx.moveTo(m.cx - 8, m.cy);
        ctx.lineTo(m.cx + 8, m.cy);
        ctx.moveTo(m.cx, m.cy - 8);
        ctx.lineTo(m.cx, m.cy + 8);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function tick(now: number) {
    if (!playing) return;
    draw(now);
    if (now - tStart >= autoHideMs) {
      playing = false;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (playing) return; // prevent overlapping runs
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion if desired
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) { return; }

    buildSpots();
    tStart = performance.now();
    playing = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // React to visible toggle or numeric trigger
  $: {
    const key = typeof visible === "number" ? visible : (visible ? "on" : "off");
    if (key !== lastTriggerKey && (typeof visible === "number" ? visible > 0 : !!visible)) {
      lastTriggerKey = key;
      // Two frames so card flips/layout settle before measuring
      requestAnimationFrame(() => requestAnimationFrame(start));
    }
  }

  // Image + listeners
  let resizeHandler = () => { /* canvas resizes on next frame */ };

  onMount(() => {
    img = new Image();
    img.onload = () => { imgLoaded = true; if (debug) console.info("[CompletionRing] image OK:", resolvedSrc); };
    img.onerror = () => { imgLoaded = false; console.warn("[CompletionRing] image 404:", resolvedSrc); };
    img.src = resolvedSrc;

    resizeHandler = () => { /* drawing path handles size; nothing to do here */ };
    window.addEventListener("resize", resizeHandler);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resizeHandler);
  });
</script>

<!-- Full-viewport canvas overlay (no color fill) -->
<div class="absolute inset-0 pointer-events-none" style={`z-index:${zIndex};`}>
  <canvas
    bind:this={canvas}
    class="fixed inset-0 pointer-events-none block"
    style={`z-index:${zIndex}; width:100vw; height:100vh;`}
  />
</div>

<style>
  /* No CSS animations here; all motion is on the canvas. */
</style>

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

// ─── Configuration ───────────────────────────────────────────────
const FRAME_COUNT = 300;
const FRAME_DIR = "/images/HeroSection";
const FRAME_PREFIX = "ezgif-frame-";
const FRAME_EXT = ".jpg";
const LERP_FACTOR = 0.1; // Interpolation speed (lower = smoother)
const MAX_DPR = 2; // Cap devicePixelRatio for performance
const SCROLL_DISTANCE = "+=220%"; // Dedicated pinned distance for all 300 frames

// ─── Helpers ─────────────────────────────────────────────────────

/** Generate zero-padded frame URL */
function getFrameUrl(index: number): string {
  const num = String(index + 1).padStart(3, "0");
  return `${FRAME_DIR}/${FRAME_PREFIX}${num}${FRAME_EXT}`;
}

/**
 * Draw image onto canvas with "cover" behavior,
 * keeping center of image visible (important for the truck subject).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasW / canvasH;

  let drawW: number, drawH: number, offsetX: number, offsetY: number;

  if (canvasRatio > imgRatio) {
    // Canvas is wider than image aspect — fit to width
    drawW = canvasW;
    drawH = canvasW / imgRatio;
    offsetX = 0;
    offsetY = (canvasH - drawH) * 0.5;
  } else {
    // Canvas is taller than image aspect — fit to height
    drawH = canvasH;
    drawW = canvasH * imgRatio;
    // Keep the vehicle centered in the framed, editorial composition.
    offsetX = (canvasW - drawW) * 0.5;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

// ─── Component ───────────────────────────────────────────────────

export default function HeroScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Frame management refs (imperative, no React state for performance)
  const framesRef = useRef<(HTMLImageElement | null)[]>(
    new Array(FRAME_COUNT).fill(null),
  );
  const loadedCountRef = useRef(0);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);
  const rafIdRef = useRef<number>(0);
  const isReadyRef = useRef(false);
  const preloadStartedRef = useRef(false);

  // React state only for loading UI
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Overlay refs for GSAP-driven darkness reveal
  const darknessOverlayRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // ─── Canvas sizing ───────────────────────────────────────────
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Force redraw after resize
    lastDrawnFrameRef.current = -1;
  }, []);

  // ─── Frame drawing ──────────────────────────────────────────
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = framesRef.current[frameIndex];
    if (!img) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Set scale matrix idempotently
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Clear and draw
    ctx.clearRect(0, 0, w, h);
    drawImageCover(ctx, img, w, h);
  }, []);

  // ─── rAF interpolation loop ─────────────────────────────────
  const animateRef = useRef<() => void>(() => {});

  useEffect(() => {
    animateRef.current = () => {
      const target = targetFrameRef.current;
      const current = currentFrameRef.current;

      // Lerp toward target
      const next = current + (target - current) * LERP_FACTOR;
      currentFrameRef.current = next;

      const frameIndex = Math.min(
        Math.max(Math.round(next), 0),
        FRAME_COUNT - 1,
      );

      // Always redraw if frame changed or if forced (-1)
      if (
        frameIndex !== lastDrawnFrameRef.current ||
        lastDrawnFrameRef.current === -1
      ) {
        if (framesRef.current[frameIndex]) {
          drawFrame(frameIndex);
          lastDrawnFrameRef.current = frameIndex;
        } else {
          // Frame not loaded yet — find nearest loaded frame
          for (let delta = 1; delta < FRAME_COUNT; delta++) {
            const before = frameIndex - delta;
            const after = frameIndex + delta;
            if (before >= 0 && framesRef.current[before]) {
              drawFrame(before);
              lastDrawnFrameRef.current = frameIndex;
              break;
            }
            if (after < FRAME_COUNT && framesRef.current[after]) {
              drawFrame(after);
              lastDrawnFrameRef.current = frameIndex;
              break;
            }
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(() => animateRef.current());
    };
  }, [drawFrame]);

  // ─── Image preloading ──────────────────────────────────────
  const loadFrame = useCallback((index: number): Promise<void> => {
    return new Promise((resolve) => {
      if (framesRef.current[index]) {
        resolve();
        return;
      }

      const tryLoad = (attempt: number) => {
        const img = new Image();
        img.onload = () => {
          framesRef.current[index] = img;
          loadedCountRef.current++;
          const progress = Math.round(
            (loadedCountRef.current / FRAME_COUNT) * 100,
          );
          setLoadingProgress(progress);

          // Force redraw in animation loop when initial frame loads
          if (index === 0) {
            lastDrawnFrameRef.current = -1;
          }

          resolve();
        };
        img.onerror = () => {
          if (attempt < 2) {
            window.setTimeout(() => tryLoad(attempt + 1), 250 * (attempt + 1));
            return;
          }
          setLoadError(true);
          resolve();
        };
        img.src = getFrameUrl(index);
      };

      tryLoad(0);
    });
  }, []);

  const preloadFrames = useCallback(async () => {
    if (preloadStartedRef.current) return;
    preloadStartedRef.current = true;

    // Start every request immediately; wait for frame zero only to paint the first view.
    const frameLoads = Array.from({ length: FRAME_COUNT }, (_, index) => loadFrame(index));
    await frameLoads[0];
    updateCanvasSize();
    if (framesRef.current[0]) drawFrame(0);

    // Every remaining frame must be available before ScrollTrigger is created.
    await Promise.all(frameLoads);

    if (loadedCountRef.current === FRAME_COUNT) {
      isReadyRef.current = true;
      setLoadingProgress(100);
      setIsReady(true);
    }
  }, [loadFrame, drawFrame, updateCanvasSize]);

  // ─── Initialization ────────────────────────────────────────
  useEffect(() => {
    updateCanvasSize();
    void preloadFrames();

    // Start single animation loop
    rafIdRef.current = requestAnimationFrame(() => animateRef.current());

    // Resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateCanvasSize();
        lastDrawnFrameRef.current = -1; // Force redraw
      }, 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateCanvasSize, preloadFrames]);

  // Prevent access to the page until every cinematic frame is in memory.
  useEffect(() => {
    if (isReady) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    const previousGutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = "stable";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      html.style.scrollbarGutter = previousGutter;
    };
  }, [isReady]);

  // ─── GSAP ScrollTrigger setup ──────────────────────────────
  useGSAP(
    () => {
      if (!isReady || !containerRef.current || !stickyRef.current) return;

      // Main scroll-to-frame mapping
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: SCROLL_DISTANCE,
        pin: stickyRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.5,
        onUpdate: (self) => {
          targetFrameRef.current = Math.round(
            self.progress * (FRAME_COUNT - 1),
          );
          if (darknessOverlayRef.current) {
            darknessOverlayRef.current.style.opacity = String(Math.max(0, (self.progress - 0.96) / 0.04));
          }
        },
      });

      // Text animation: fully visible on load, smoothly fades out on scroll
      if (textContainerRef.current) {
        gsap.fromTo(
          textContainerRef.current,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          },
          {
            opacity: 0,
            y: -35,
            filter: "blur(10px)",
            ease: "power2.in",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "35% top",
              end: "65% top",
              scrub: 1,
            },
          },
        );
      }

      ScrollTrigger.refresh();
    },
    { scope: containerRef, dependencies: [isReady], revertOnUpdate: true },
  );

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative bg-[#050505]"
      style={{ height: "100svh" }}
    >
      {/* Pinned viewport container — released only once the final frame is reached */}
      <div
        ref={stickyRef}
        className="relative h-[100svh] w-full min-h-[100svh] overflow-hidden transform-gpu"
      >
        {/* Fallback initial frame image (guarantees hero visual is visible immediately on load) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/HeroSection/ezgif-frame-001.jpg"
          alt="PaisaMatters Hero Travel Visual"
          className="retro-motion absolute inset-0 h-full w-full object-cover object-center z-0 pointer-events-none"
        />

        {/* Loading state */}
        {!isReady && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#050505]/72 backdrop-blur-[1px] transition-opacity duration-500">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-[0.25em] uppercase text-white">
                  Paisa
                </span>
                <span className="text-lg font-bold tracking-[0.25em] uppercase text-[#d4a853]">
                  Matters
                </span>
              </div>
              <p className="-mt-2 text-[10px] font-semibold tracking-[0.28em] text-white/55">PREPARING THE JOURNEY</p>

              {/* Minimal loading indicator */}
              <div className="flex items-center gap-3">
                <div className="w-32 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d4a853]/60 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <span className="text-xs text-white/45 font-mono tabular-nums w-10">
                  {loadError ? "ERROR" : `${loadingProgress}%`}
                </span>
              </div>
              {loadError && <p className="text-xs text-white/65">A frame could not load. Please refresh to try again.</p>}
            </div>
          </div>
        )}

        {/* Canvas — frame renderer */}
        <canvas
          ref={canvasRef}
          className="retro-motion absolute inset-0 w-full h-full z-0"
          style={{
            background: "transparent",
            display: "block",
          }}
        />

        {/* Directional overlay (darkens left for text, keeps center/right clear) */}
        <div className="hero-directional-overlay absolute inset-0 pointer-events-none z-10" />

        {/* Vignette overlay */}
        <div className="hero-vignette absolute inset-0 pointer-events-none z-10" />

        {/* Ambient warm glow */}
        <div className="hero-ambient-glow absolute inset-0 pointer-events-none z-10" />

        {/* Film treatment makes the image sequence feel intentionally archival. */}
        <div className="retro-scanlines absolute inset-0 pointer-events-none z-[11]" />
        <div className="retro-grain absolute inset-0 pointer-events-none z-[12]" />

        {/* Subtle Edge fades */}
        <div className="hero-fade-top absolute top-0 left-0 right-0 h-24 pointer-events-none z-10" />
        <div className="hero-fade-bottom absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10" />
        <div className="hero-fade-left absolute top-0 bottom-0 left-0 w-24 pointer-events-none z-10 lg:w-40" />
        <div className="hero-fade-right absolute top-0 bottom-0 right-0 w-16 pointer-events-none z-10 lg:w-28" />

        {/* Dark transition overlay (fades in at end of hero to transition into black) */}
        <div
          ref={darknessOverlayRef}
          className="absolute inset-0 bg-[#050505] pointer-events-none z-[15] opacity-0"
        />

        {/* Hero text content */}
        <div
          ref={textContainerRef}
          className="absolute inset-0 z-20 flex flex-col justify-center px-6 pointer-events-none sm:px-10 lg:px-12"
        >
          <div className="mx-auto flex w-full max-w-[1320px] justify-center">
            <div className="hero-copy flex w-full max-w-2xl flex-col items-center gap-5 rounded-[28px] px-2 py-6 text-center sm:gap-6 sm:px-8 sm:py-8">
              {/* Tagline */}
              <p
                data-hero-text
                className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#d4a853] sm:text-sm"
              >
                Travel Together · Split Effortlessly
              </p>

              {/* Headline */}
              <h1
                data-hero-text
                className="text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Every Trip Deserves
                <br />
                <span className="text-[#d4a853]">Fair Splits</span>
              </h1>

              {/* Subtitle */}
              <p
                data-hero-text
                className="max-w-xl text-sm font-normal leading-relaxed text-white/75 drop-shadow-md sm:text-base md:text-lg"
              >
                Track group expenses in real-time, settle debts instantly, and
                keep the adventure stress-free.
              </p>

              {/* CTA */}
              <div
                data-hero-text
                className="mt-2 flex w-full flex-col items-stretch gap-3 pointer-events-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4"
              >
                <a
                  href="/auth?mode=signup"
                  id="hero-cta-primary"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4a853] px-7 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:scale-[1.02] hover:bg-[#c49a48] hover:shadow-[0_0_30px_rgba(212,168,83,0.35)]"
                >
                  Get Started Free
                  <span aria-hidden="true">→</span>
                </a>
                <a
                  href="https://youtu.be/thXUz7isjfc?si=PksxUcOnV9_cPiYf"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="hero-cta-secondary"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/30 px-7 py-3.5 text-sm font-medium text-white/85 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/[0.08] hover:text-white"
                >
                  <span className="text-xs" aria-hidden="true">▶</span>
                  See How It Works
                </a>
              </div>

              <div className="mt-1 flex items-center justify-center gap-5 text-left text-white/80 sm:gap-8">
                <div>
                  <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">10K+</p>
                  <p className="text-[9px] font-semibold tracking-[0.18em] text-white/45">TRIPS</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">50K+</p>
                  <p className="text-[9px] font-semibold tracking-[0.18em] text-white/45">TRAVELLERS</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">Zero</p>
                  <p className="text-[9px] font-semibold tracking-[0.18em] text-white/45">AWKWARD TALKS</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-40 pointer-events-none"
          style={{
            animation: "loadingPulse 2.5s ease-in-out infinite",
          }}
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium">
            Scroll
          </span>
          <svg
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
            className="text-white/30"
          >
            <rect
              x="1"
              y="1"
              width="14"
              height="22"
              rx="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="8" cy="8" r="2" fill="currentColor">
              <animate
                attributeName="cy"
                values="7;14;7"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      </div>
    </section>
  );
}

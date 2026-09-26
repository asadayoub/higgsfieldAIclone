"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GenerationScene = dynamic(
  () => import("./generation-scene").then((module) => module.GenerationScene),
  { ssr: false },
);

function supportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function GenerationSceneLoader({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [capable, setCapable] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      setCapable(!reduced && !connection?.saveData && supportsWebGl());
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !capable) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [capable]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative min-h-[23rem] overflow-hidden sm:min-h-[29rem] lg:min-h-full"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative size-[min(78vw,31rem)] rounded-full border border-white/8 bg-[radial-gradient(circle_at_38%_32%,rgba(255,255,255,0.28),rgba(72,102,255,0.15)_18%,rgba(10,13,20,0.2)_54%,transparent_72%)] shadow-[inset_0_0_80px_rgba(71,104,255,0.12),0_0_100px_rgba(60,90,255,0.1)]">
          <div className="absolute inset-[13%] rotate-[-14deg] rounded-full border border-white/10" />
          <div className="absolute inset-[24%] rotate-[22deg] rounded-full border border-[var(--action)]/20 shadow-[0_0_50px_rgba(182,255,68,0.08)]" />
          <div className="absolute top-[20%] left-[7%] h-[34%] w-[27%] -rotate-12 rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgba(42,66,140,0.7),rgba(9,11,16,0.78))] shadow-2xl" />
          <div className="absolute right-[4%] bottom-[20%] h-[27%] w-[35%] rotate-12 rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgba(129,172,62,0.35),rgba(9,11,16,0.8))] shadow-2xl" />
          <div className="absolute inset-[36%] rounded-[38%] border border-white/20 bg-[radial-gradient(circle_at_35%_28%,white,rgba(91,123,255,0.7)_8%,rgba(15,19,31,0.85)_48%,black_82%)] shadow-[0_0_70px_rgba(91,123,255,0.4)]" />
        </div>
      </div>
      {capable && visible ? (
        <div className="animate-in fade-in absolute inset-0 duration-700">
          <GenerationScene />
        </div>
      ) : null}
      <div className="absolute right-5 bottom-5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase backdrop-blur-md">
        Generation core / 01
      </div>
    </div>
  );
}

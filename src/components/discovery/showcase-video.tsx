"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export function ShowcaseVideo({ src }: { src: string }) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={container}
      className="relative size-full bg-[radial-gradient(circle_at_30%_20%,rgba(94,121,255,0.35),transparent_46%),#090b10]"
      onMouseEnter={() => void video.current?.play().catch(() => undefined)}
      onMouseLeave={() => video.current?.pause()}
    >
      {near ? (
        <video
          ref={video}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : null}
      <span className="pointer-events-none absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
        <Play aria-hidden="true" className="ml-0.5 size-3.5 fill-current" />
      </span>
    </div>
  );
}

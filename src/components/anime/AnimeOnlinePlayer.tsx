"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type VideoProvider,
} from "@vidstack/react";
import { PlyrLayout, plyrLayoutIcons } from "@vidstack/react/player/layouts/plyr";

import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/plyr/theme.css";

import JASSUB from "jassub";

import { VideoSource } from "@/types/anime";

interface Props {
  instanceKey?: number;
  autoPlayToken?: number;
  resumeSeekToken?: number;
  fastStartToken?: number;
  sources: VideoSource[];
  subUrl: string;
  poster: string;
  title: string;
  startTime?: number;
  onTimeUpdate?: (time: number, duration?: number) => void;
  onEnded?: () => void;
}

export default function AnimeOnlinePlayer({
  instanceKey,
  autoPlayToken = 0,
  resumeSeekToken = 0,
  fastStartToken = 0,
  sources,
  subUrl,
  poster,
  title,
  startTime = 0,
  onTimeUpdate,
  onEnded,
}: Props) {
  const player = useRef<MediaPlayerInstance>(null);
  const jassubRef = useRef<JASSUB | null>(null);
  const isInitialized = useRef(false);
  const hasSeeked = useRef(false);
  const pendingAutoPlay = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useFullSources, setUseFullSources] = useState(false);

  useEffect(() => {
    if (!player.current || !startTime || startTime <= 0) return;

    const media = player.current;
    const targetTime = startTime;
    let rafId = 0;
    const start = performance.now();

    const trySeek = () => {
      if (media.duration && media.duration > 0) {
        media.currentTime = targetTime;
        hasSeeked.current = true;
        return;
      }

      const elapsed = performance.now() - start;
      if (elapsed < 4000) {
        rafId = requestAnimationFrame(trySeek);
      }
    };

    trySeek();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [startTime, resumeSeekToken]);

  // Filter and map sources to ensure they have valid height/src
  // Prefer non-x265 sources for each quality to avoid unsupported codecs.
  const mappedSources = useMemo(() => {
    const byHeight = new Map<number, { src: string; score: number }>();

    sources.forEach((source) => {
      if (!source.src) return;
      const height = parseInt(source.quality);
      if (isNaN(height)) return;

      const isX265 = /x265|hevc/i.test(source.src);
      if (isX265) return; // Exclude x265 entirely for stability
      const isX264 = /x264|h264/i.test(source.src);
      // Lower score is better.
      const score = isX265 ? 2 : isX264 ? 0 : 1;

      const existing = byHeight.get(height);
      if (!existing || score < existing.score) {
        byHeight.set(height, { src: source.src, score });
      }
    });

    return Array.from(byHeight.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([height, entry]) => ({
        src: entry.src,
        type: "video/mp4" as const,
        height,
        width: Math.ceil(height * (16 / 9)),
        label: `${height}p`,
      }));
  }, [sources]);

  const activeSources = useMemo(() => {
    if (useFullSources) return mappedSources;
    return mappedSources.slice(0, 1);
  }, [mappedSources, useFullSources]);

  useEffect(() => {
    // Reset internal initialization flags
    hasSeeked.current = false;
    isInitialized.current = false;
    queueMicrotask(() => setIsLoading(true));
    queueMicrotask(() => setUseFullSources(false));
    
    // Explicitly destroy previous JASSUB instance to prevent conflicts
    if (jassubRef.current) {
        jassubRef.current.destroy();
        jassubRef.current = null;
    }
  }, [sources, subUrl]); // Add subUrl to dependency array

  useEffect(() => {
    if (fastStartToken > 0) {
      queueMicrotask(() => setUseFullSources(false));
    }
  }, [fastStartToken]);

  useEffect(() => {
    if (autoPlayToken > 0) {
      pendingAutoPlay.current = true;
    }
  }, [autoPlayToken]);

  const onProviderChange = async (provider: MediaProviderAdapter | null) => {
    if (provider?.type === "video" && !isInitialized.current) {
      const videoElement = (provider as VideoProvider).video;
      if (!videoElement) return;

      isInitialized.current = true;

      let subContent: string | null = null;
      if (subUrl) {
        try {
          const response = await fetch(subUrl);
          if (response.ok) {
            subContent = await response.text();
          } else {
            console.error(
              `Subtitle fetch failed: ${response.status} ${response.statusText}`
            );
          }
        } catch (error) {
          console.error("Subtitle fetch error (CORS?):", error);
        }
      }

      if (!subContent) {
        console.warn("No subtitle content available to initialize JASSUB.");
        return;
      }

      setTimeout(() => {
        if (jassubRef.current) {
          jassubRef.current.destroy();
        }

        try {
          jassubRef.current = new JASSUB({
            video: videoElement,
            subContent: subContent,
            workerUrl: "/subtitles/jassub-worker.js",
            wasmUrl: "/subtitles/jassub-worker.wasm",
            fonts: ["/fonts/Vazir.woff2", "/fonts/B Koodak.woff2"],
            fallbackFont: "vazir",
            availableFonts: {
              "b koodak": "/fonts/B Koodak.woff2",
              bkoodak: "/fonts/B Koodak.woff2",
              vazir: "/fonts/Vazir.woff2",
            },
            debug: false,
          });
        } catch (e) {
          console.error("JASSUB initialization failed:", e);
        }
      }, 0);
    }
  };

  useEffect(() => {
    return () => {
      isInitialized.current = false;
      if (jassubRef.current) {
        jassubRef.current.destroy();
        jassubRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-video group">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[32px] opacity-60 blur-3xl saturate-150"
        style={{
          backgroundColor: "var(--anime-glow, #6366f1)",
          backgroundImage: poster ? `url(${poster})` : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-950 shadow-2xl border border-white/5 z-10">
        <MediaPlayer
          key={instanceKey}
          ref={player}
          title={title}
          src={activeSources}
          poster={poster}
          preload="auto"
          onProviderChange={onProviderChange}
          onLoadedMetadata={() => {
            setIsLoading(false);
          }}
          onPlay={() => {
            setIsLoading(false);
            setUseFullSources(true);
          }}
          onPause={() => {}}
          onWaiting={() => {
            setIsLoading(true);
          }}
          onStalled={() => {
            setIsLoading(true);
          }}
          onError={() => {
            setIsLoading(true);
          }}
          onPlaying={() => {
            setIsLoading(false);
          }}
          onTimeUpdate={(detail) => {
             // vidstack onTimeUpdate event passes the detail directly or we can read from ref
             if (onTimeUpdate) onTimeUpdate(detail.currentTime, player.current?.duration);
          }}
          onCanPlay={() => {
             if (startTime > 0 && !hasSeeked.current && player.current) {
                player.current.currentTime = startTime;
                hasSeeked.current = true;
             }

             if (pendingAutoPlay.current && player.current) {
               pendingAutoPlay.current = false;
               player.current.play().catch(() => {
                 // Ignore autoplay failures if browser blocks it
               });
             }

             setIsLoading(false);
          }}
          onEnded={() => onEnded?.()}
          playsInline
          className="w-full h-full"
        >
          <MediaProvider>
            {subUrl && (
              <Track
                src={subUrl.replace(".ass", ".srt")}
                kind="subtitles"
                label="Farsi (Simple)"
                lang="fa"
              />
            )}
          </MediaProvider>

          <PlyrLayout icons={plyrLayoutIcons} thumbnails={null} />
        </MediaPlayer>
        {isLoading && (
          <div className="pointer-events-none absolute top-3 right-3 z-20">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              در حال بارگذاری...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

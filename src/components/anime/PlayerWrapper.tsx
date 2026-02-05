"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EpisodesList, UnifiedEpisode } from "@/types/anime";
import EpisodeSidebar from "@/components/anime/EpisodeSidebar";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const AnimeOnlinePlayer = dynamic(
  () => import("@/components/anime/AnimeOnlinePlayer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-gray-900 rounded-xl animate-pulse flex items-center justify-center text-gray-500 shadow-2xl border border-white/5">
        در حال بارگذاری پلیر...
      </div>
    ),
  }
);

/** Encode URL only if it doesn't already contain percent-encoded sequences (avoids double encoding). */
function encodeUrlIfNeeded(url: string): string {
  if (/%[0-9A-Fa-f]{2}/.test(url)) return url;
  return encodeURI(url);
}

interface PlayerWrapperProps {
  episodes: EpisodesList;
  children?: React.ReactNode;
}

export default function PlayerWrapper({ episodes, children }: PlayerWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // -- State --
  const [selectedEpisode, setSelectedEpisode] = useState<UnifiedEpisode | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [resumePrompt, setResumePrompt] = useState<{ time: number; episodeId: number } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playerInstanceKey, setPlayerInstanceKey] = useState(0);
  const [autoPlayToken, setAutoPlayToken] = useState(0);
  const [resumeSeekToken, setResumeSeekToken] = useState(0);
  const [fastStartToken, setFastStartToken] = useState(0);
  const lastProgressUpdateRef = useRef(0);
  const hasLoadedStateRef = useRef(false);
  
  const animeId = episodes[0]?.anime_id;

  // -- Initialization & Persistence --
  
  // Load initial state (defer setState to avoid synchronous cascading renders)
  useEffect(() => {
    if (!animeId) return;

    let watched: number[] = [];
    try {
      watched = JSON.parse(localStorage.getItem(`aoyume_watched_${animeId}`) || "[]");
    } catch (e) {
      console.error("Failed to load watched history", e);
    }

    // 2. Select initial episode (URL param > Last played > First episode)
    const urlEpNumber = searchParams.get("ep");
    let initialEp: UnifiedEpisode | undefined;
    let resumePromptPayload: { time: number; episodeId: number } | null = null;

    if (urlEpNumber) {
      initialEp = episodes.find(e => e.number.toString() === urlEpNumber);
    }

    if (!initialEp) {
      try {
        const progressRaw = localStorage.getItem(`aoyume_progress_${animeId}`);
        if (progressRaw) {
          const progress = JSON.parse(progressRaw);
          const found = episodes.find(e => e.id === progress.episodeId);
          if (found) {
            initialEp = found;
            if (progress.time > 60) {
              resumePromptPayload = { time: progress.time, episodeId: progress.episodeId };
            }
          }
        }
      } catch (e) { console.error(e); }
    }

    if (!initialEp) {
      initialEp = episodes[0];
    }

    const finalEp = initialEp;
    queueMicrotask(() => {
      setWatchedEpisodes(watched);
      if (resumePromptPayload) setResumePrompt(resumePromptPayload);
      setStartTime(0);
      if (finalEp) setSelectedEpisode(finalEp);
      hasLoadedStateRef.current = true;
    });
  }, [animeId, episodes, searchParams]);

  // Handle Episode Selection
  const handleEpisodeSelect = (episode: UnifiedEpisode) => {
    setSelectedEpisode(null); // Force unmount to reset player fully
    setStartTime(0); // Reset start time for manual selection
    setResumePrompt(null);
    setPlayerInstanceKey((prev) => prev + 1);
    setAutoPlayToken((prev) => prev + 1);
    setFastStartToken((prev) => prev + 1);

    queueMicrotask(() => {
      setSelectedEpisode(episode);
    });
    
    // Update URL without refresh
    const params = new URLSearchParams(searchParams.toString());
    params.set("ep", episode.number.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Resume Action
  const handleResume = useCallback(() => {
    if (resumePrompt) {
      setStartTime(resumePrompt.time);
      setResumePrompt(null);
      setAutoPlayToken((prev) => prev + 1);
      setResumeSeekToken((prev) => prev + 1);
      setFastStartToken((prev) => prev + 1);
    }
  }, [resumePrompt]);

  const handleDismissResume = () => {
    setResumePrompt(null);
    setStartTime(0); // Ensure we start from 0 if dismissed
    setAutoPlayToken((prev) => prev + 1);
    setFastStartToken((prev) => prev + 1);
  };

  // Progress Tracking (updates state only; persistence is in effects)
  const handleTimeUpdate = useCallback((time: number, duration?: number) => {
    if (!selectedEpisode || !animeId) return;
    if (!Number.isFinite(time) || time < 0) return;
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 1000) return;
    lastProgressUpdateRef.current = now;
    setCurrentTime(time);

    if (duration && duration > 0) {
      const watchedThreshold = 0.9;
      if (time / duration >= watchedThreshold) {
        setWatchedEpisodes(prev => (
          prev.includes(selectedEpisode.id) ? prev : [...prev, selectedEpisode.id]
        ));
      }
    }
  }, [selectedEpisode, animeId]);

  const handleEnded = useCallback(() => {
    if (!selectedEpisode || !animeId) return;

    setWatchedEpisodes(prev => (
      prev.includes(selectedEpisode.id) ? prev : [...prev, selectedEpisode.id]
    ));
  }, [selectedEpisode, animeId]);

  useEffect(() => {
    if (!hasLoadedStateRef.current) return;
    if (!selectedEpisode || !animeId) return;
    if (!Number.isFinite(currentTime)) return;
    localStorage.setItem(`aoyume_progress_${animeId}`, JSON.stringify({
      episodeId: selectedEpisode.id,
      time: currentTime,
      updatedAt: Date.now()
    }));
  }, [currentTime, selectedEpisode, animeId]);

  useEffect(() => {
    if (!hasLoadedStateRef.current) return;
    if (!animeId) return;
    localStorage.setItem(`aoyume_watched_${animeId}`, JSON.stringify(watchedEpisodes));
  }, [watchedEpisodes, animeId]);

  const videoSources = useMemo(
    () => selectedEpisode?.sources || [],
    [selectedEpisode]
  );
  const subtitles = Array.isArray(selectedEpisode?.subtitles)
    ? selectedEpisode.subtitles
    : [];
  const subtitleUrl =
    subtitles.find((s: { url: string; lang: string }) => s.lang === "per")
      ?.url ||
    subtitles[0]?.url ||
    "";
    
  const poster = selectedEpisode?.thumbnail || "";
  const title = selectedEpisode ? `قسمت ${selectedEpisode.number}` : "";

  const fileBaseUrl =
    process.env.NEXT_PUBLIC_FILE_URL || "https://dl.aoyume.ir";
  const subtitlePathPrefix = process.env.NEXT_PUBLIC_SUBTITLES_PATH ?? "";
  const subtitleBase = subtitlePathPrefix
    ? `${fileBaseUrl}/${subtitlePathPrefix}`
    : fileBaseUrl.replace(/\/$/, "");
  const fullSubtitleUrl = subtitleUrl
    ? subtitleUrl.startsWith("http")
      ? encodeUrlIfNeeded(subtitleUrl)
      : encodeUrlIfNeeded(`${subtitleBase}/${subtitleUrl}`)
    : "";

  const playerNode = useMemo(() => {
    if (!selectedEpisode) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          لطفا یک قسمت را انتخاب کنید
        </div>
      );
    }

    return (
      <div className="relative w-full h-full" key={selectedEpisode.id}>
        <AnimeOnlinePlayer
          instanceKey={playerInstanceKey}
          autoPlayToken={autoPlayToken}
          resumeSeekToken={resumeSeekToken}
          fastStartToken={fastStartToken}
          sources={videoSources}
          poster={poster}
          subUrl={fullSubtitleUrl}
          title={title}
          startTime={startTime}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {/* Resume Prompt Toast */}
        {resumePrompt && resumePrompt.episodeId === selectedEpisode.id && (
          <div className="absolute bottom-20 right-4 z-50 bg-slate-900/90 border border-primary/20 backdrop-blur-md p-4 rounded-xl shadow-2xl flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-[300px]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-primary">ادامه پخش؟</h4>
                <p className="text-xs text-muted-foreground">
                  شما این قسمت را تا دقیقه {Math.floor(resumePrompt.time / 60)} تماشا کرده‌اید.
                </p>
              </div>
              <button 
                onClick={handleDismissResume}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleResume} className="flex-1 gap-2">
                <Play className="w-3 h-3 fill-current" />
                ادامه
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismissResume} className="px-2">
                <RotateCcw className="w-3 h-3" />
                از اول
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    selectedEpisode,
    playerInstanceKey,
    autoPlayToken,
    resumeSeekToken,
    fastStartToken,
    videoSources,
    poster,
    fullSubtitleUrl,
    title,
    startTime,
    handleTimeUpdate,
    handleEnded,
    resumePrompt,
    handleResume,
  ]);

  // -- Render Helpers --
  
  if (!episodes || episodes.length === 0) {
    return <div className="text-center p-4">هنوز قسمتی آپلود نشده است.</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto items-stretch lg:grid lg:grid-cols-[1fr_340px]">
      {/* Main Player Area */}
      <div className="flex flex-col gap-8 min-w-0 lg:min-h-[800px]">
        <div className="relative w-full aspect-video shrink-0 bg-black/50 rounded-xl overflow-hidden shadow-2xl">
          {/* Ambient Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 rounded-[32px] opacity-50 blur-3xl saturate-150 transition-opacity duration-500"
            style={{
              backgroundColor: "var(--anime-glow)",
              backgroundImage: poster ? `url(${poster})` : undefined,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />

          {playerNode}
        </div>
        
        {/* Mobile Info / Title (Visible on mobile below player) */}
        <div className="lg:hidden px-2">
           <h2 className="text-lg font-bold text-foreground">
             {title}
           </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>

      {/* Sidebar (Right on desktop, Bottom on mobile) */}
      <div className="h-[500px] lg:h-[800px] min-h-[400px]">
         <EpisodeSidebar 
            episodes={episodes}
            currentEpisode={selectedEpisode}
            onEpisodeSelect={handleEpisodeSelect}
            watchedEpisodes={watchedEpisodes}
            className="h-full"
         />
      </div>
    </div>
  );
}

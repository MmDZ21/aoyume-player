import { UnifiedEpisode, EpisodesList } from "@/types/anime";
import { Check, Play } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface EpisodeSidebarProps {
  episodes: EpisodesList;
  currentEpisode: UnifiedEpisode | null;
  onEpisodeSelect: (episode: UnifiedEpisode) => void;
  watchedEpisodes?: number[]; // Array of episode IDs
  className?: string;
}

export default function EpisodeSidebar({
  episodes,
  currentEpisode,
  onEpisodeSelect,
  watchedEpisodes = [],
  className,
}: EpisodeSidebarProps) {
  return (
    <div className={cn("flex flex-col gap-4 h-full", className)}>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_12px_40px_rgba(0,0,0,0.35)] custom-scrollbar">
        <div className="flex flex-col gap-2">
          {episodes.map((episode) => {
            const isSelected = currentEpisode?.id === episode.id;
            const isWatched = watchedEpisodes.includes(episode.id);

            return (
              <div
                key={episode.id}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all duration-300",
                  isSelected
                    ? "bg-primary/15 border-primary/50 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                    : isWatched
                      ? "bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/15"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
                onClick={() => onEpisodeSelect(episode)}
              >
                {/* Active Indicator Bar */}
                {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full shadow-[0_0_10px_var(--primary)]" />
                )}

                {/* Thumbnail */}
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-slate-800">
                  {episode.thumbnail ? (
                    <Image
                      src={episode.thumbnail}
                      alt={`Episode ${episode.number}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No Thumb
                    </div>
                  )}
                  
                  {/* Overlay Icon */}
                  <div className={cn(
                      "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                      {isSelected ? (
                          <div className="playing-animation flex gap-0.5 h-3 items-end">
                              <span className="w-1 bg-primary animate-[music-bar_1s_ease-in-out_infinite] h-2"></span>
                              <span className="w-1 bg-primary animate-[music-bar_1s_ease-in-out_0.2s_infinite] h-3"></span>
                              <span className="w-1 bg-primary animate-[music-bar_1s_ease-in-out_0.4s_infinite] h-1"></span>
                          </div>
                      ) : (
                          <Play className="w-6 h-6 text-white fill-white/50" />
                      )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-primary" : "text-foreground"
                    )}>
                        قسمت {episode.number}
                    </span>
                    {isWatched && (
                        <Check className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  {/* Placeholder duration if we had it, for now just subtle text */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{isSelected ? "در حال پخش" : isWatched ? "تماشا شده" : "پخش نشده"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes music-bar {
            0%, 100% { height: 40%; }
            50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

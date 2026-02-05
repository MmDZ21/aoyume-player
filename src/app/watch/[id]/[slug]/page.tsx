"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PlayerWrapper from "@/components/anime/PlayerWrapper";
import AnimeInfo, { type AnimeDetailsRow } from "@/components/anime/AnimeInfo";
import { Button } from "@/components/ui/button";
import { ArrowRight, CircleArrowOutUpLeftIcon } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { EpisodesList, UnifiedEpisode, VideoSource } from "@/types/anime";
import { slugify } from "@/lib/utils";

type Status = "loading" | "ready" | "error" | "no-session";
const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://aoyu.me"
export default function WatchPage() {
  const params = useParams<{ id: string; slug: string }>();
  const searchParams = useSearchParams();
  const [episodes, setEpisodes] = useState<EpisodesList>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [anime, setAnime] = useState<AnimeDetailsRow | null>(null);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const animeId = Number(params?.id);
  const accessToken = searchParams.get("access_token") || "";
  const refreshToken = searchParams.get("refresh_token") || "";

  const validationError: "error" | "no-session" | null =
    !animeId || Number.isNaN(animeId)
      ? "error"
      : !accessToken || !refreshToken
        ? "no-session"
        : null;

  useEffect(() => {
    if (validationError) return;

    const fetchEpisodes = async () => {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        const { data: rawEpisodes, error } = await supabase
          .from("episodes")
          .select("*")
          .eq("anime_id", animeId)
          .order("number", { ascending: true });

        if (error || !rawEpisodes) {
          console.error("Supabase Error (Episodes Table):", error);
          setStatus("error");
          return;
        }

        const imageBaseUrl =
          process.env.NEXT_PUBLIC_IMAGE_URL || process.env.IMAGE_URL || "";
        const normalizeImageUrl = (path: string | null) => {
          if (!path) return null;
          if (/^https?:\/\//i.test(path)) return path;
          if (!imageBaseUrl) {
            return path.startsWith("/") ? path : `/${path}`;
          }
          const base = imageBaseUrl.replace(/\/$/, "");
          const normalizedPath = path.startsWith("/") ? path : `/${path}`;
          return `${base}${normalizedPath}`;
        };

        // Group by episode number
        const episodesMap = new Map<number, UnifiedEpisode>();

        rawEpisodes.forEach((episode) => {
          let parsedSubtitles = episode.subtitles;
          if (typeof parsedSubtitles === "string") {
            try {
              parsedSubtitles = JSON.parse(parsedSubtitles);
            } catch (e) {
              console.error("Failed to parse subtitles JSON:", e);
              parsedSubtitles = null;
            }
          }

          const normalizedThumb = normalizeImageUrl(episode.thumbnail);
          
          const source: VideoSource = {
            quality: episode.quality || "Unknown",
            src: episode.direct_link || "",
            size: episode.size || ""
          };

          if (!episodesMap.has(episode.number)) {
             // Create base object from first occurrence
             // omit quality-specific fields from the base object
             const baseEp = { ...episode };
             delete baseEp.quality;
             delete baseEp.direct_link;
             delete baseEp.size;
             delete baseEp.direct_link_status;
             
             const unifiedEp: UnifiedEpisode = {
                ...(baseEp as UnifiedEpisode),
                number: episode.number,
                thumbnail: normalizedThumb,
                subtitles: parsedSubtitles as { url: string; lang: string }[] | null,
                sources: [source]
             };
             episodesMap.set(episode.number, unifiedEp);
          } else {
             const existing = episodesMap.get(episode.number)!;
             existing.sources.push(source);
             
             // If existing doesn't have subtitles but this one does, use it.
             if ((!existing.subtitles || existing.subtitles.length === 0) && parsedSubtitles && Array.isArray(parsedSubtitles) && parsedSubtitles.length > 0) {
                 existing.subtitles = parsedSubtitles as { url: string; lang: string }[];
             }
          }
        });

        const episodesList: EpisodesList = Array.from(episodesMap.values())
          .sort((a, b) => a.number - b.number);
        
        // Sort sources within each episode (high quality first)
        episodesList.forEach(ep => {
          ep.sources.sort((a, b) => {
             const qualA = parseInt(a.quality) || 0;
             const qualB = parseInt(b.quality) || 0;
             return qualB - qualA;
          });
        });

        const { data: animeRow, error: animeError } = await supabase
          .from("complete_anime_details_materialized")
          .select("*")
          .eq("anime_id", animeId)
          .maybeSingle();

        if (animeError) {
          console.error("Supabase Error (Anime Details):", animeError);
        } else {
          setAnime(animeRow);
        }

        setEpisodes(episodesList);
        setStatus("ready");
      } catch (err) {
        console.error("Player auth bootstrap failed:", err);
        setStatus("error");
      }
    };

    fetchEpisodes();
  }, [animeId, accessToken, refreshToken, validationError, supabase]);

  if (validationError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 text-center">
        <h1 className="text-lg font-bold">پخش آنلاین</h1>
        <p className="text-sm text-muted-foreground">
          {validationError === "no-session"
            ? "سشن لاگین از سایت اصلی دریافت نشد. لطفا از طریق سایت اصلی وارد پلیر شوید."
            : "شناسه انیمه نامعتبر است."}
        </p>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 text-center">
        <h1 className="text-lg font-bold">پخش آنلاین</h1>
        <p className="text-sm text-muted-foreground">در حال آماده‌سازی پلیر...</p>
      </div>
    );
  }

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_IMAGE_URL || process.env.IMAGE_URL || "";
  const buildImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (!imageBaseUrl) {
      return path.startsWith("/") ? path : `/${path}`;
    }
    const base = imageBaseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  };
  const animePosterUrl = buildImageUrl(
    anime?.dic_image_url || anime?.mal_image_url
  );

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: animePosterUrl ? `url(${animePosterUrl})` : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
          filter:"blur(16px)"
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/80" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-[32px]">
            <span className="text-primary">Ao</span>Yume
          </h1>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={`${mainSiteUrl}/anime/${animeId}/${slugify(anime?.dic_title || "")}`}>
              <CircleArrowOutUpLeftIcon className="h-4 w-4" />
              بازگشت به صفحه انیمه
            </Link>
          </Button>
        </div>
        <PlayerWrapper episodes={episodes}>
          <AnimeInfo anime={anime} />
        </PlayerWrapper>
      </div>
    </div>
  );
}

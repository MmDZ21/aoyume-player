import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { EpisodesList, UnifiedEpisode, VideoSource } from "@/types/anime";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export const getAnimeEpisodes = cache(async (id: number): Promise<EpisodesList> => {
  const supabase = getSupabaseClient();

  const { data: rawEpisodes, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", id)
    .order("number", { ascending: true });

  if (error || !rawEpisodes) {
    console.error("Supabase Error (Episodes Table):", error);
    return [];
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
      size: episode.size || "",
    };

    if (!episodesMap.has(episode.number)) {
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
        sources: [source],
      };
      episodesMap.set(episode.number, unifiedEp);
    } else {
      const existing = episodesMap.get(episode.number)!;
      existing.sources.push(source);
      if (
        (!existing.subtitles || existing.subtitles.length === 0) &&
        parsedSubtitles &&
        Array.isArray(parsedSubtitles) &&
        parsedSubtitles.length > 0
      ) {
        existing.subtitles = parsedSubtitles as { url: string; lang: string }[];
      }
    }
  });

  const episodesList: EpisodesList = Array.from(episodesMap.values()).sort(
    (a, b) => a.number - b.number
  );

  episodesList.forEach((ep) => {
    ep.sources.sort((a, b) => {
      const qualA = parseInt(a.quality) || 0;
      const qualB = parseInt(b.quality) || 0;
      return qualB - qualA;
    });
  });

  return episodesList;
});

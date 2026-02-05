export interface Episode {
  id: number;
  anime_id: number;
  number: number;
  quality: string;
  created_at: string;
  thumbnail: string | null;
  size: string;
  new_link: string | null;
  new_backup: string | null;
  direct_link: string | null;
  subinfo: string;
  direct_link_status: "uploaded" | "pending" | "failed" | "never";
  subtitle: string | null;
  subtitles: { url: string; lang: string }[] | null;
  al_id: string | null;
}

export interface VideoSource {
  quality: string;
  src: string;
  size: string;
}

export interface UnifiedEpisode extends Omit<Episode, "quality" | "direct_link" | "size" | "direct_link_status"> {
  sources: VideoSource[];
}

export type EpisodesList = UnifiedEpisode[];

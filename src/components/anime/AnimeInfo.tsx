"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import parse from "html-react-parser";
export type AnimeDetailsRow = {
  dic_title?: string | null;
  dic_title_en?: string | null;
  title_en_normalized?: string | null;
  title_fa?: string | null;
  summary_fa?: string | null;
  summary_en?: string | null;
  genre_names_fa?: string[] | null;
  genre_names_en?: string[] | null;
  dic_image_url?: string | null;
  mal_image_url?: string | null;
  dic_score?: number | null;
  dic_scored_by?: number | string | null;
  dic_rating?: number | null;
  episodes_en?: string | null;
  episodes_fa?: string | null;
};

interface AnimeInfoProps {
  anime: AnimeDetailsRow | null;
}

export default function AnimeInfo({ anime }: AnimeInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!anime) return null;

  const imageBase =
    process.env.NEXT_PUBLIC_IMAGE_URL || process.env.IMAGE_URL || "";

  const buildImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    if (!imageBase) {
      return path.startsWith("/") ? path : `/${path}`;
    }
    const base = imageBase.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  };

  const title =
    anime.dic_title || anime.title_en_normalized || "عنوان نامشخص";
  const altTitleEn = anime.dic_title_en;
  const altTitleFa = anime.title_fa;

  const genres: string[] = Array.isArray(anime.genre_names_fa)
    ? anime.genre_names_fa
    : Array.isArray(anime.genre_names_en)
      ? anime.genre_names_en
      : [];

  const synopsis =
    anime.summary_fa || anime.summary_en || "خلاصه‌ای برای این انیمه ثبت نشده است.";

  const score: number | null =
    anime.dic_score ?? anime.dic_rating ?? null;

  const episodesRaw = anime.episodes_en || anime.episodes_fa;
  const episodes =
    episodesRaw &&
    episodesRaw !== "0" &&
    episodesRaw !== "?" &&
    episodesRaw.toLowerCase?.() !== "unknown"
      ? `${episodesRaw} قسمت`
      : "نامشخص";

  const poster =
    buildImageUrl(
      anime.dic_image_url || anime.mal_image_url || "/images/placeholder.jpg"
    ) ?? "/images/placeholder.jpg";

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 py-4 text-right md:flex-row md:items-start md:gap-6">
      <div className="relative aspect-2/3 w-32 shrink-0 overflow-hidden rounded-lg shadow-lg md:w-40">
        <Image
          src={poster}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 768px) 128px, 160px"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="space-y-1">
            <h2 className="text-xl font-bold leading-tight tracking-tight md:text-2xl">{title}</h2>
            {altTitleEn && altTitleEn !== title && (
              <p className="font-mono text-xs text-muted-foreground opacity-80">{altTitleEn}</p>
            )}
            {altTitleFa && altTitleFa !== title && (
              <p className="text-xs text-muted-foreground">{altTitleFa}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 text-[10px] shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">
                {score !== null ? (
                  <>
                    <span className="text-amber-400">{score}</span>
                    <span className="text-muted-foreground"> / 10</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-muted-foreground">{episodes}</span>
            </div>
          </div>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g: string) => (
              <span
                key={g}
                className="rounded-md bg-secondary/50 px-2.5 py-1 text-[10px] font-medium text-secondary-foreground transition-colors hover:bg-secondary"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col space-y-1.5 text-xs leading-6 text-muted-foreground/90 md:text-sm md:leading-7">
          <h3 className="shrink-0 font-semibold text-foreground">خلاصه داستان</h3>
          <div className={`relative min-h-0 flex-1 ${isExpanded ? "" : "overflow-hidden"}`}>
            <p className={isExpanded ? "" : "h-full line-clamp-4"}>{parse(synopsis)}</p>
            
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className=" gap-1 px-2 text-xs mt-4"
              >
                {isExpanded ? (
                  <>
                    بستن
                    <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    نمایش بیشتر
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
    </section>
  );
}


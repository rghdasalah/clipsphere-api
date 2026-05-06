"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Video } from "@/types";
import { getAvatarUrl } from "@/utils/avatarUrl";
import { getThumbnailUrl } from "@/utils/thumbnailUrl";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-gold" aria-label={`${rating.toFixed(1)} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 20 20" fill={i < Math.round(rating) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const hue = video._id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!video.owner?.avatarKey) return;
    let cancelled = false;
    getAvatarUrl(video.owner._id).then((url) => {
      if (!cancelled) setAvatarUrl(url);
    });
    return () => { cancelled = true; };
  }, [video.owner._id, video.owner?.avatarKey]);

  useEffect(() => {
    if (!video.thumbnailKey) return;
    let cancelled = false;
    getThumbnailUrl(video._id).then((url) => {
      if (!cancelled) setThumbUrl(url);
    });
    return () => { cancelled = true; };
  }, [video._id, video.thumbnailKey]);

  return (
    <Link
      href={`/video/${video._id}`}
      className="group block overflow-hidden rounded-xl bg-surface border border-border transition-all hover:border-border-accent hover:glow-accent animate-fade-in-up"
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-video overflow-hidden"
        style={!thumbUrl ? { background: `linear-gradient(135deg, hsl(${hue},50%,35%), hsl(${(hue + 40) % 360},40%,25%))` } : undefined}
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* Glassmorphism play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-lg">
            <svg className="h-5 w-5 translate-x-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Glassmorphism title overlay (bottom) */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
            <p className="truncate text-xs font-medium text-white">{video.title}</p>
          </div>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-brand-400 group-hover:opacity-0 transition-opacity duration-200">
          {formatDuration(video.duration)}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-strong group-hover:text-brand-400">
          {video.title}
        </h3>

        <div className="flex items-center gap-1.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-400">
              {video.owner.username?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <p className="text-xs text-text-muted">{video.owner.username}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{formatCount(video.viewsCount)} views</span>
          {video.likeCount != null && <span>{formatCount(video.likeCount)} likes</span>}
          {video.averageRating != null && video.averageRating > 0 && (
            <StarRating rating={video.averageRating} />
          )}
        </div>
      </div>
    </Link>
  );
}
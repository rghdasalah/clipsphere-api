"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import type { Video, ApiResponse, PaginatedResponse } from "@/types";
import FeedGrid from "@/components/feed/FeedGrid";
import SkeletonFeed from "@/components/feed/SkeletonFeed";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

type Tab = "trending" | "following" | "for-you";

// Endpoint per tab — kept inline so the auth-only tabs can also drive the
// "log in to view" empty state below.
const ENDPOINT_BY_TAB: Record<Tab, string> = {
  trending: "/videos/trending",
  following: "/videos/following",
  "for-you": "/videos/for-you",
};
const AUTH_ONLY_TABS: Tab[] = ["following", "for-you"];

export default function FeedsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("trending");
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = page < totalPages;

  const fetchVideos = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const endpoint = ENDPOINT_BY_TAB[activeTab];
        const { data } = await api.get<ApiResponse<PaginatedResponse<Video>>>(endpoint, {
          params: { page: pageNum, limit: 20 },
        });

        const payload = data.data!;
        setVideos((prev) => (replace ? payload.videos : [...prev, ...payload.videos]));
        setPage(payload.page);
        setTotalPages(payload.totalPages);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load videos";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab]
  );

  // Reset and fetch on tab change (wait for auth to settle)
  useEffect(() => {
    if (authLoading) return;
    if (AUTH_ONLY_TABS.includes(activeTab) && !isAuthenticated) return;
    setVideos([]);
    setPage(1);
    setTotalPages(1);
    fetchVideos(1, true);
  }, [activeTab, isAuthenticated, authLoading, fetchVideos]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchVideos(page + 1, false);
    }
  }, [fetchVideos, page, hasMore, isLoadingMore]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isLoadingMore);

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const tabClasses = (tab: Tab) =>
    `px-5 py-2 text-sm rounded-full transition-colors ${
      activeTab === tab
        ? "bg-brand-500 text-white font-semibold"
        : "bg-surface-2 text-text-muted font-medium hover:bg-surface-3 hover:text-text"
    }`;

  return (
    <>
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button className={tabClasses("trending")} onClick={() => switchTab("trending")}>
          Trending
        </button>
        {isAuthenticated && (
          <>
            <button className={tabClasses("for-you")} onClick={() => switchTab("for-you")}>
              For You
            </button>
            <button className={tabClasses("following")} onClick={() => switchTab("following")}>
              Following
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {AUTH_ONLY_TABS.includes(activeTab) && !isAuthenticated ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-text-muted">
            {activeTab === "following"
              ? "Log in to see videos from creators you follow"
              : "Log in to see your personalized feed"}
          </p>
          <a
            href="/login"
            className="mt-4 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-400"
          >
            Log in
          </a>
        </div>
      ) : isLoading ? (
        <SkeletonFeed />
      ) : error ? (
        <ErrorMessage
          message={error}
          retry={() => {
            setVideos([]);
            fetchVideos(1, true);
          }}
        />
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-text-muted">
            {activeTab === "trending"
              ? "No trending videos yet"
              : activeTab === "for-you"
                ? "No videos to show yet — follow some creators or check Trending"
                : "Follow creators to see their videos here"}
          </p>
        </div>
      ) : (
        <FeedGrid videos={videos} sentinelRef={sentinelRef} isLoadingMore={isLoadingMore} />
      )}
    </>
  );
}

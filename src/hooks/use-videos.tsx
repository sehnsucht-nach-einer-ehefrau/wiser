"use client";

import { useState, useEffect } from "react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export function useVideos(channelId: string, page: number) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/videos?channelId=${channelId}&page=${page}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch videos");
        }

        const data = await response.json();
        setVideos(data.videos);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [channelId, page]);

  return { videos, isLoading, error, totalPages };
}

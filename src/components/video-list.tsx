// components/video-list.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { useVideos } from "@/hooks/use-videos";
import { channels } from "@/lib/channels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";

export default function VideoList() {
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0].id);
  const [currentPage, setCurrentPage] = useState(1);
  // Removed selectedVideoId state
  // const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const router = useRouter(); // Initialize router

  const { videos, isLoading, error, totalPages } = useVideos(
    selectedChannelId,
    currentPage
  );

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    setCurrentPage(1); // Reset to first page on channel change
    // Removed selectedVideoId state reset
    // setSelectedVideoId(null);
  };

  const handleSummarizeClick = (videoId: string) => {
    // Navigate to the summary page
    router.push(`/summary/${videoId}`);
    // Removed setting local state
    // setSelectedVideoId(videoId);
  };

  // Removed onCloseSummary handler
  // const handleCloseSummary = () => {
  //   setSelectedVideoId(null);
  // };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Removed selectedVideoId state reset
      // setSelectedVideoId(null);
      window.scrollTo(0, 0); // Scroll to top on page change
    }
  };

  return (
    <div className="space-y-8">
      {/* Channel Selector */}
      <div className="w-full flex justify-center">
        <Select value={selectedChannelId} onValueChange={handleChannelChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(9)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[225px] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video Grid */}
      {!isLoading && !error && videos.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="flex flex-col">
                <CardHeader>
                  {video.thumbnail && (
                    <CardHeader className="p-0">
                      <div
                        className="aspect-video bg-cover bg-center"
                        style={{ backgroundImage: `url(${video.thumbnail})` }}
                      />
                    </CardHeader>
                  )}
                  <CardTitle className="text-lg leading-tight">
                    {video.title}
                  </CardTitle>
                  <CardDescription className="text-xs pt-1">
                    Published:{" "}
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {video.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    size="sm"
                    onClick={() => handleSummarizeClick(video.id)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Summarize
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* No Videos Found State */}
      {!isLoading && !error && videos.length === 0 && (
        <p className="text-center text-muted-foreground">
          No videos found for this channel.
        </p>
      )}

      {/* Removed the conditional rendering of VideoSummary */}
      {/* {selectedVideoId && (
        <VideoSummary videoId={selectedVideoId} onClose={handleCloseSummary} />
      )} */}
    </div>
  );
}

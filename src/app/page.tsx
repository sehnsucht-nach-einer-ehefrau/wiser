// app/page.tsx
import { Suspense } from "react";
import VideoList from "@/components/video-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">WISER</h1>
      <p className="text-center mb-8 text-muted-foreground">
        Select a channel, browse videos, and generate article-style summaries
      </p>

      {/* Wrap VideoList in Suspense */}
      <Suspense fallback={<VideoListSkeleton />}>
        <VideoList />
      </Suspense>
    </main>
  );
}

// Keep the existing skeleton
function VideoListSkeleton() {
  return (
    <div className="space-y-8">
      {" "}
      {/* Added matching space-y */}
      <div className="w-full max-w-xs mx-auto">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {" "}
        {/* Adjusted grid */}
        {Array(9)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="flex flex-col space-y-3 border p-4 rounded-lg"
            >
              {" "}
              {/* Mimic card structure */}
              <Skeleton className="h-[225px] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-full mt-2" /> {/* Description lines */}
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-9 w-28 mt-4" /> {/* Button */}
            </div>
          ))}
      </div>
    </div>
  );
}

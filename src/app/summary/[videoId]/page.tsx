// app/summary/[videoId]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import VideoSummaryDisplay from "@/components/video-summary-display"; // We'll create this next
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SummaryPageProps {
  params: {
    videoId: string;
  };
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const { videoId } = params;

  return (
    <main className="container mx-auto py-8 px-4">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Videos
        </Link>
      </Button>
      <Suspense fallback={<SummarySkeleton />}>
        {/* Pass videoId to the component responsible for fetching and displaying */}
        <VideoSummaryDisplay videoId={videoId} />
      </Suspense>
    </main>
  );
}

// Skeleton component for the summary page
function SummarySkeleton() {
  return (
    <div className="space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <Skeleton className="h-8 w-3/4" /> {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" /> {/* Intro line 1 */}
        <Skeleton className="h-4 w-5/6" /> {/* Intro line 2 */}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-4 pt-4 border-t">
        <Skeleton className="h-6 w-1/3" /> {/* Conclusion Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-10 w-36" /> {/* Watch Button */}
    </div>
  );
}

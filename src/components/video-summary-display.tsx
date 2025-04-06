"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Volume2, Loader2 } from "lucide-react";

interface ArticleSection {
  title: string;
  content: string;
}

interface ArticleSummary {
  title: string;
  introduction: string;
  sections: ArticleSection[];
  conclusion: string;
}

interface VideoSummaryDisplayProps {
  videoId: string;
}

// Reusable Skeleton for the content part
function ContentSkeleton() {
  return (
    <div className="space-y-6 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
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

export default function VideoSummaryDisplay({
  videoId,
}: VideoSummaryDisplayProps) {
  const [article, setArticle] = useState<ArticleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check for videoId early
    if (!videoId) {
      setError("Video ID is missing in the URL.");
      setLoading(false);
      return; // Exit early if no videoId
    }

    // --- AbortController Setup ---
    const controller = new AbortController();
    const signal = controller.signal;
    // -----------------------------

    let isMounted = true; // Flag to prevent state updates on unmounted component

    const fetchSummary = async () => {
      // Reset state only when starting a new fetch for a valid videoId
      setLoading(true);
      setError(null);
      setArticle(null);
      setAudioUrl(null);

      console.log(`Fetching summary for videoId: ${videoId} (Effect Run)`);

      try {
        const response = await fetch(`/api/summarize?videoId=${videoId}`, {
          // Pass the signal to fetch
          signal,
        });

        // Check if the request was aborted after starting
        if (signal.aborted) {
          console.log(`Fetch aborted for videoId: ${videoId}`);
          return; // Don't proceed if aborted
        }

        const data = await response.json();

        if (!response.ok) {
          console.error(
            `Error response from /api/summarize (${response.status}):`,
            data
          );
          throw new Error(
            data.error || `Failed to get summary (HTTP ${response.status})`
          );
        }

        if (!data.article) {
          console.error("Summary data missing in API response:", data);
          throw new Error("Summary data is missing in the API response.");
        }

        // Only update state if the component is still mounted
        if (isMounted) {
          console.log("Successfully fetched summary:", data.article.title);
          setArticle(data.article);
        }
      } catch (err) {
        // Check if the error is due to abortion
        if (err instanceof Error && err.name === "AbortError") {
          console.log(`Fetch explicitly aborted for videoId: ${videoId}`);
        } else if (isMounted) {
          // Only set error if mounted and not an AbortError
          console.error("Error fetching or processing summary:", err);
          setError(
            err instanceof Error
              ? err.message
              : "An unknown error occurred while fetching the summary."
          );
        }
      } finally {
        // Only set loading to false if mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    // --- Cleanup Function ---
    return () => {
      isMounted = false; // Set flag on unmount
      console.log(`Cleaning up fetch for videoId: ${videoId}`);
      controller.abort(); // Abort the fetch request if it's still in progress

      // Clean up audio resources
      if (audioPlayer) {
        audioPlayer.pause();
        URL.revokeObjectURL(audioPlayer.src);
      }
    };
    // -----------------------
  }, [videoId]); // Dependency array

  // Function to generate text-to-speech for the article summary
  const generateSpeech = async () => {
    if (!article) return;

    setAudioLoading(true);
    setAudioError(null);

    try {
      // Create a concise text representation of the article for TTS
      const summaryText = `
        ${article.title}. 
        ${article.introduction}
        ${article.sections
          .map((section) => `${section.title}. ${section.content}`)
          .join(" ")}
        Conclusion. ${article.conclusion}
      `;

      // Call your API endpoint that will use Groq for TTS
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: summaryText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);

      // Create and configure audio player
      const audio = new Audio(url);
      setAudioPlayer(audio);
      setAudioUrl(url);
    } catch (err) {
      console.error("Error generating speech:", err);
      setAudioError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while generating speech"
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const playAudio = () => {
    if (audioPlayer) {
      audioPlayer.play();
    }
  };

  // --- Render logic ---
  if (loading) {
    return <ContentSkeleton />;
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="rounded-lg border bg-card text-card-foreground shadow-sm p-6"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Summary</AlertTitle>
        <AlertDescription>
          {error}
          <p className="mt-2 text-sm text-muted-foreground">
            This could be due to the video lacking a transcript, API issues, or
            other problems. Please try again later or select a different video.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!article) {
    return (
      <Alert className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Summary Not Available</AlertTitle>
        <AlertDescription>
          No summary could be generated for this video. This might happen if the
          process completed but returned no data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert">
          <h1>{article.title}</h1>
          <div className="mb-6">
            <p className="lead">{article.introduction}</p>
          </div>
          {article.sections.map((section, index) => (
            <section key={index} className="mb-6">
              <h2>{section.title}</h2>
              {section.content.split(/\r?\n/).map((paragraph, pIndex) => (
                <p key={pIndex}>{paragraph || "\u00A0"}</p>
              ))}
            </section>
          ))}
          <footer className="mt-6 border-t pt-4">
            <h2>Conclusion</h2>
            {article.conclusion.split(/\r?\n/).map((paragraph, pIndex) => (
              <p key={pIndex}>{paragraph || "\u00A0"}</p>
            ))}
          </footer>
        </article>
      </div>
      <div className="flex items-center gap-4 p-6 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
          }
        >
          Watch Original on YouTube
        </Button>

        {audioUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={playAudio}
            className="flex items-center gap-2"
          >
            <Volume2 className="h-4 w-4" />
            Play Audio Summary
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={generateSpeech}
            disabled={audioLoading}
            className="flex items-center gap-2"
          >
            {audioLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Audio...
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Generate Audio Summary
              </>
            )}
          </Button>
        )}

        {audioError && (
          <span className="text-sm text-destructive">Error: {audioError}</span>
        )}
      </div>
    </div>
  );
}

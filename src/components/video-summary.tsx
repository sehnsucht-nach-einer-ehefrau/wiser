"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

interface VideoSummaryProps {
  videoId: string;
  onClose: () => void;
}

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

export default function VideoSummary({ videoId, onClose }: VideoSummaryProps) {
  const [article, setArticle] = useState<ArticleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/summarize?videoId=${videoId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get summary");
        }

        const data = await response.json();
        setArticle(data.article);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [videoId]);

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Video Summary Article</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive">
            <p>{error}</p>
          </div>
        ) : article ? (
          <div className="prose prose-sm max-w-none">
            <h1 className="text-2xl font-bold mb-4">{article.title}</h1>

            <div className="mb-6">
              <p className="text-muted-foreground italic">
                Summary of YouTube video
              </p>
              <p>{article.introduction}</p>
            </div>

            {article.sections.map((section, index) => (
              <div key={index} className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
                <p>{section.content}</p>
              </div>
            ))}

            <div className="mt-6 border-t pt-4">
              <h2 className="text-xl font-semibold mb-2">Conclusion</h2>
              <p>{article.conclusion}</p>
            </div>
          </div>
        ) : (
          <p>No summary available.</p>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
          }
        >
          Watch on YouTube
        </Button>
      </CardFooter>
    </Card>
  );
}

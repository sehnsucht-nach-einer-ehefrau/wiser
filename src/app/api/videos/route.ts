import { type NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = 9; // Changed from 10 to 9 as requested

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get("channelId");
  const page = Number.parseInt(searchParams.get("page") || "1");
  const pageToken = searchParams.get("pageToken") || "";

  if (!channelId) {
    return NextResponse.json(
      { error: "Channel ID is required" },
      { status: 400 }
    );
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 }
    );
  }

  try {
    // Build the YouTube API URL
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${MAX_RESULTS}&key=${YOUTUBE_API_KEY}`;

    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    // Fetch videos from YouTube API
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to fetch videos from YouTube API"
      );
    }

    const data = await response.json();

    // Transform the response to our format
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

    // Calculate total pages (approximate)
    const totalResults = Math.min(data.pageInfo.totalResults, 200); // YouTube API limits to 200 results
    const totalPages = Math.ceil(totalResults / MAX_RESULTS);

    return NextResponse.json({
      videos,
      totalPages,
      nextPageToken: data.nextPageToken || null,
      prevPageToken: data.prevPageToken || null,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch videos",
      },
      { status: 500 }
    );
  }
}

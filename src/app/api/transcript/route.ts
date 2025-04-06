import { type NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching transcript for videoId: ${videoId}`); // Added log
    // fetchTranscript returns an array: { text: string, duration: number, offset: number }[]
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      // Handle cases where transcript is enabled but empty (rare)
      console.warn(`Transcript found but empty for videoId: ${videoId}`);
      // Return empty array, let summarizer handle it
      return NextResponse.json({ transcript: [] });
      // Alternatively, return an error:
      // return NextResponse.json({ error: "Transcript is empty" }, { status: 404 });
    }

    console.log(
      `Successfully fetched transcript for videoId: ${videoId} (${transcript.length} segments)`
    ); // Added log
    return NextResponse.json({ transcript: transcript }); // Correctly returns the array
  } catch (error: any) {
    // Catch specific error type if possible
    console.error(`Error fetching transcript for videoId: ${videoId}`, error);

    // Provide more specific error messages if possible based on 'error' content
    let errorMessage = "Failed to fetch transcript.";
    let status = 500;

    // youtube-transcript specific errors often include these messages
    if (
      error.message?.includes("disabled transcript") ||
      error.message?.includes("No transcript found")
    ) {
      errorMessage = "Transcript is disabled or unavailable for this video.";
      status = 404; // Not Found is more appropriate
    } else if (error.message?.includes("video is unavailable")) {
      errorMessage = "The video is unavailable.";
      status = 404;
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}

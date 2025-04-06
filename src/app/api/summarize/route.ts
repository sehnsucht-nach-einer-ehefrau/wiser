import { type NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { z } from "zod";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Added for check
const CHUNK_SIZE = 4000; // Size of transcript chunks to process (in words) - adjust if needed for token limits
const MAX_CHUNKS = 5; // Maximum number of chunks to process - limits processing for very long videos

// Define the Article schema for type safety
const ArticleSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
  conclusion: z.string(),
});

// Define the structure of a single transcript item from youtube-transcript
interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 }
    );
  }

  if (!GROQ_API_KEY) {
    console.error("Groq API key is not configured");
    return NextResponse.json(
      { error: "Groq API key is not configured" },
      { status: 500 }
    );
  }

  // Also check for YouTube API Key needed for video details
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured");
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 }
    );
  }

  try {
    // --- Step 1: Get the transcript ---
    const transcriptResponse = await fetch(
      `${request.nextUrl.origin}/api/transcript?videoId=${videoId}`
    );

    if (!transcriptResponse.ok) {
      let errorData;
      try {
        errorData = await transcriptResponse.json();
      } catch (e) {
        // Handle cases where the response is not valid JSON
        errorData = {
          error: `Failed to fetch transcript: ${transcriptResponse.statusText}`,
        };
      }
      console.error("Transcript fetch failed:", errorData);
      throw new Error(errorData?.error || "Failed to fetch transcript");
    }

    const transcriptData = await transcriptResponse.json();

    // ** FIX: Process the transcript array into a single string **
    if (
      !transcriptData.transcript ||
      !Array.isArray(transcriptData.transcript)
    ) {
      console.error(
        "Transcript data is not in the expected array format:",
        transcriptData
      );
      throw new Error("Transcript data is not in the expected format (array)");
    }

    const transcriptItems = transcriptData.transcript as TranscriptItem[];
    const fullTranscriptText = transcriptItems
      .map((item) => item.text)
      .join(" "); // Join parts with spaces

    if (!fullTranscriptText || fullTranscriptText.trim().length === 0) {
      console.warn("No transcript text available for video:", videoId);
      throw new Error("No transcript text available for this video");
    }
    // --- End Step 1 ---

    // --- Step 2: Get video details for the title ---
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoDetailsResponse.ok) {
      let errorData;
      try {
        errorData = await videoDetailsResponse.json();
      } catch (e) {
        errorData = {
          error: {
            message: `Failed to fetch video details: ${videoDetailsResponse.statusText}`,
          },
        };
      }
      console.error("Video details fetch failed:", errorData);
      throw new Error(
        errorData?.error?.message || "Failed to fetch video details"
      );
    }

    const videoDetails = await videoDetailsResponse.json();
    // Add better checking for item existence
    const videoTitle =
      videoDetails.items?.[0]?.snippet?.title || `Video ${videoId}`; // Fallback title
    // --- End Step 2 ---

    // --- Step 3: Chunk and Summarize ---
    const chunks = splitTranscript(fullTranscriptText, CHUNK_SIZE, MAX_CHUNKS);

    if (chunks.length === 0) {
      console.warn(
        "Transcript was too short or could not be chunked for video:",
        videoId
      );
      throw new Error("Transcript too short to process");
    }

    console.log(`Processing ${chunks.length} chunks for video ${videoId}`);

    // Initialize Groq client
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    // Process each chunk to get summaries
    const chunkSummaries = await Promise.all(
      chunks.map(async (chunk, index) => {
        console.log(`Summarizing chunk ${index + 1}/${chunks.length}...`);
        try {
          const completion = await groq.chat.completions.create({
            // Using a potentially faster/cheaper model for chunk summary might be an option
            // model: "llama3-8b-8192", // Example: Smaller model
            model: "llama3-70b-8192", // Use Llama3 70b
            messages: [
              {
                role: "system",
                content:
                  "You are a concise summarizer extracting key facts and main ideas from a transcript section.",
              },
              {
                role: "user",
                content: `Summarize the key points and main ideas from this transcript section (Part ${
                  index + 1
                } of ${chunks.length}). Be concise and factual.
                  Transcript section:
                  ${chunk}`,
              },
            ],
            temperature: 0.2, // Lower temperature for factual summary
          });
          return completion.choices[0]?.message?.content ?? ""; // Handle potential null/undefined
        } catch (error) {
          console.error(`Error summarizing chunk ${index + 1}:`, error);
          return `[Error summarizing chunk ${index + 1}]`; // Return error placeholder
        }
      })
    );

    // Filter out any potential errors from chunk summaries before final generation
    const validSummaries = chunkSummaries.filter(
      (summary) => summary && !summary.startsWith("[Error")
    );
    if (validSummaries.length === 0) {
      console.error("All chunk summaries failed for video:", videoId);
      throw new Error("Failed to generate summaries for video sections.");
    }

    console.log("Generating final article structure...");
    // Generate the final article based on the chunk summaries
    const finalCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Use Llama3 70b
      messages: [
        {
          role: "system",
          content: `You are a skilled content creator. Your task is to synthesize provided video section summaries into a coherent, well-structured article.
          You MUST respond with ONLY a valid JSON object adhering to this specific schema:
          {
            "title": "string",
            "introduction": "string",
            "sections": [ { "title": "string", "content": "string" } ],
            "conclusion": "string"
          }
          Do NOT include any explanatory text before or after the JSON object.
          Ensure the titles and content flow logically. Generate 3-5 meaningful sections.`,
        },
        {
          role: "user",
          content: `Create a well-structured article summarizing a YouTube video titled "${videoTitle}".
          Base the article on the following summaries from different parts of the video:

          ${validSummaries
            .map((summary, i) => `Summary of Part ${i + 1}:\n${summary}`)
            .join("\n\n---\n\n")}

          Article Requirements:
          1.  **Title:** Based on "${videoTitle}", make it engaging.
          2.  **Introduction:** Briefly introduce the video's main topic and scope based on the summaries.
          3.  **Sections (3-5):** Create distinct sections with clear titles, covering the core ideas presented in the summaries. Synthesize related points.
          4.  **Conclusion:** Summarize the key takeaways or final thoughts.
          5.  **Format:** Respond ONLY with the JSON object described in the system prompt.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5, // Slightly more creative for structuring
    });

    const articleJson = finalCompletion.choices[0]?.message?.content;

    if (!articleJson) {
      console.error(
        "Groq did not return content for the final article generation."
      );
      throw new Error("Failed to generate the final article structure.");
    }
    // --- End Step 3 ---

    // --- Step 4: Parse and Validate ---
    let article;
    try {
      // The response *should* be clean JSON because of response_format, but trim just in case.
      const parsedJson = JSON.parse(articleJson.trim());
      article = ArticleSchema.parse(parsedJson); // Validate against Zod schema
      console.log(
        `Successfully generated and parsed article for video ${videoId}`
      );
    } catch (e) {
      console.error("Error parsing or validating article JSON:", e);
      console.log("Raw response from Groq:", articleJson);

      // Fallback: Try to provide *something* usable if parsing fails
      article = {
        title: videoTitle + " - Summary",
        introduction: `This is a summary of the key points discussed in the video "${videoTitle}".`,
        sections: [
          {
            title: "Key Points",
            // Join valid summaries, avoiding raw JSON in case of error
            content: validSummaries.join("\n\n"),
          },
        ],
        conclusion: "Please refer to the original video for full details.",
      };
    }
    // --- End Step 4 ---

    return NextResponse.json({ article });
  } catch (error) {
    console.error(`Error in GET /api/summarize for video ${videoId}:`, error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during summarization.";
    // Provide a more specific error message if possible
    let status = 500;
    if (errorMessage.includes("transcript")) status = 502; // Bad Gateway if transcript fails upstream
    if (errorMessage.includes("Groq") || errorMessage.includes("LLM"))
      status = 503; // Service unavailable if LLM fails

    return NextResponse.json(
      { error: errorMessage },
      { status: status } // Use determined status
    );
  }
}

// Helper function to split transcript into manageable chunks by words
function splitTranscript(
  transcript: string,
  chunkWordCount: number,
  maxChunks: number
): string[] {
  // Basic split by space, may not be perfect for all languages/punctuation
  const words = transcript.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const totalWords = words.length;

  for (let i = 0; i < totalWords; i += chunkWordCount) {
    if (chunks.length >= maxChunks) {
      console.warn(
        `Reached max chunks (${maxChunks}). Transcript might be truncated.`
      );
      break;
    }
    const chunk = words.slice(i, i + chunkWordCount).join(" ");
    chunks.push(chunk);
  }

  return chunks;
}

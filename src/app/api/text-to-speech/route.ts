// app/api/text-to-speech/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text input is required" },
        { status: 400 }
      );
    }

    // Truncate text if it's too long (Groq might have limits)
    const truncatedText = text.length > 1100 ? text.substring(0, 1100) : text;

    // Call Groq API for text-to-speech
    const response = await groq.audio.speech.create({
      model: "playai-tts",
      voice: "Celeste-PlayAI",
      input: truncatedText,
      response_format: "wav", // Using mp3 for better browser compatibility
    });

    // Get audio data as array buffer
    const audioData = await response.arrayBuffer();

    // Return audio data with appropriate headers
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate speech",
      },
      { status: 500 }
    );
  }
}

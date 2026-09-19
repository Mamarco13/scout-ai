import { NextRequest, NextResponse } from "next/server";

const LAMBDA_URL =
  "https://5uvzdtgkjlj236p37w44jykzju0dsrqz.lambda-url.us-east-1.on.aws/";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Call AWS Lambda from the server side (avoids all browser CORS / preflight issues)
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query.trim() }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AWS Lambda error response:", response.status, errorText);
      return NextResponse.json(
        { error: `AWS Lambda error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API route search error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error connecting to AWS" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { MAX_JOIN_BODY_BYTES, JoinValidationError, parseJoinPayload } from "@/lib/newsletter-core";
import { subscriptionProvider } from "@/lib/newsletter";

export const runtime = "nodejs";

const genericError = () => NextResponse.json(
  { status: "error", message: "We couldn’t complete your request right now. Please try again." },
  { status: 400, headers: { "Cache-Control": "no-store" } },
);

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JOIN_BODY_BYTES) return genericError();

  let text: string;
  try {
    text = await request.text();
  } catch {
    return genericError();
  }
  if (new TextEncoder().encode(text).byteLength > MAX_JOIN_BODY_BYTES) return genericError();

  let input;
  try {
    input = parseJoinPayload(JSON.parse(text));
  } catch (error) {
    if (error instanceof JoinValidationError) return genericError();
    return genericError();
  }

  const result = await subscriptionProvider.subscribe(input);

  if (result.status !== "pending_confirmation") {
    return NextResponse.json(
      { status: "error", message: "We couldn’t complete your request right now. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: "pending_confirmation", message: "Check your inbox to confirm your place in The City." },
    { headers: { "Cache-Control": "no-store" } },
  );
}

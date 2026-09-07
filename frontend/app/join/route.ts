import { NextResponse } from "next/server";
import { subscriptionProvider } from "@/lib/newsletter";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown; consent?: unknown; country?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const result = await subscriptionProvider.subscribe({
    email,
    consent: true,
    country: typeof body.country === "string" ? body.country : undefined,
    language: typeof body.language === "string" ? body.language : undefined,
  });

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "subscription_unavailable", message: "The city list is not open yet." },
      { status: 503 }
    );
  }
  if (result.status === "error") {
    return NextResponse.json({ error: "subscription_failed" }, { status: 502 });
  }
  return NextResponse.json({ status: "subscribed" });
}

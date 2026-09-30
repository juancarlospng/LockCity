import { NextResponse } from "next/server";
import { commerce } from "@/lib/commerce";
import { fetchWooMedia } from "@/lib/media-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let product;
  try {
    product = await commerce.getProductBySlug(slug);
  } catch {
    return NextResponse.json({ error: "image_unavailable" }, { status: 502 });
  }
  const source = product?.sourceImages[0]?.src;
  const configuredStore = process.env.WC_STORE_URL;
  if (!source || !configuredStore) return NextResponse.json({ error: "image_not_found" }, { status: 404 });

  try {
    const response = await fetchWooMedia(source, configuredStore);
    if (!response) return NextResponse.json({ error: "image_unavailable" }, { status: 502 });
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "image_unavailable" }, { status: 502 });
  }
}

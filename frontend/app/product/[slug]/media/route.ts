import { NextResponse } from "next/server";
import { commerce } from "@/lib/commerce";

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

  let imageUrl: URL;
  let storeUrl: URL;
  try {
    imageUrl = new URL(source);
    storeUrl = new URL(configuredStore);
  } catch {
    return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  }
  if (
    imageUrl.origin !== storeUrl.origin ||
    !imageUrl.pathname.startsWith("/wp-content/uploads/") ||
    imageUrl.username ||
    imageUrl.password
  ) {
    return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  }

  try {
    const response = await fetch(imageUrl, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return NextResponse.json({ error: "image_unavailable" }, { status: 502 });
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(contentType)) {
      return NextResponse.json({ error: "image_unavailable" }, { status: 415 });
    }
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

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Same-origin proxy to the public WooCommerce Store API. The Store API is
// customer-facing by design; no admin credential is ever involved here.
// Cart/session headers (nonce, cart-token, cookies) are preserved so a
// real WooCommerce cart can be synced later.
// NOTE: mounted at /store (not /api) — the /api prefix is reserved for the
// backend service by the platform ingress.

const storeUrl = process.env.WC_STORE_URL;

function notConfigured() {
  return NextResponse.json(
    { error: "configuration", message: "The store connection is not configured." },
    { status: 503 }
  );
}

async function proxy(req: NextRequest, path: string[]) {
  if (!storeUrl) return notConfigured();

  const upstream = new URL(`/wp-json/wc/store/v1/${path.join("/")}`, storeUrl);
  upstream.search = req.nextUrl.search;

  const headers = new Headers();
  for (const name of ["content-type", "nonce", "cart-token", "cookie"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await req.arrayBuffer();

  const response = await fetch(upstream, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const output = new NextResponse(response.body, { status: response.status });
  for (const name of [
    "content-type",
    "set-cookie",
    "nonce",
    "cart-token",
    "x-wp-total",
    "x-wp-totalpages",
  ]) {
    const value = response.headers.get(name);
    if (value) output.headers.set(name, value);
  }
  return output;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!storeUrl) return notConfigured();
  try {
    // Read-only image proxy: only this store's uploads, no arbitrary hosts or redirects.
    if (path.length === 1 && path[0] === "media") {
      const src = new URL(req.nextUrl.searchParams.get("src") ?? "", storeUrl);
      const base = new URL(storeUrl);
      if (src.origin !== base.origin || !src.pathname.startsWith("/wp-content/uploads/") || src.username || src.password) {
        return NextResponse.json({ error: "invalid_image" }, { status: 400 });
      }
      const media = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(15000), next: { revalidate: 3600 } });
      if (!media.ok) return NextResponse.json({ error: "woocommerce" }, { status: media.status });
      const type = media.headers.get("content-type") ?? "";
      if (!/^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(type)) return NextResponse.json({ error: "invalid_image" }, { status: 415 });
      return new NextResponse(media.body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
    }
    if (path[0] === "products") {
      const upstream = new URL(`/wp-json/wc/store/v1/${path.map(encodeURIComponent).join("/")}`, storeUrl);
      upstream.search = req.nextUrl.search;
      const response = await fetch(upstream, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) return NextResponse.json({ error: "woocommerce", upstream_status: response.status }, { status: response.status });
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== "object") return NextResponse.json({ error: "woocommerce" }, { status: 502 });
      const output = NextResponse.json(data);
      for (const name of ["x-wp-total", "x-wp-totalpages"]) {
        const value = response.headers.get(name);
        if (value) output.headers.set(name, value);
      }
      return output;
    }
    return proxy(req, path);
  } catch {
    return NextResponse.json({ error: "network", message: "Could not reach the store." }, { status: 502 });
  }
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

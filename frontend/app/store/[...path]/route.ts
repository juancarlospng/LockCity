import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Same-origin proxy to the public WooCommerce Store API. The Store API is
// customer-facing by design; no admin credential is ever involved here.
// Cart/session headers (nonce, cart-token, cookies) are preserved so a
// real WooCommerce cart can be synced later.
// NOTE: mounted at /store (not /api) — the /api prefix is reserved for the
// backend service by the platform ingress.

const storeUrl = process.env.NEXT_PUBLIC_WC_STORE_URL;

function notConfigured() {
  return NextResponse.json(
    { error: "store_unavailable", message: "The store is not open yet." },
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
  return proxy(req, (await ctx.params).path);
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

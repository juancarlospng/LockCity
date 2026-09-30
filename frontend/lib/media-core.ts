const LOCK_CITY_MEDIA_HOSTS = new Set([
  "commerce.lockcityclothes.com",
  "lockcityclothes.com",
]);

function safeHttpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Invalid media URL");
  }
  return url;
}

export function wooMediaCandidates(source: string, configuredStore: string): URL[] {
  const image = safeHttpsUrl(source);
  const store = safeHttpsUrl(configuredStore);
  if (!image.pathname.startsWith("/wp-content/uploads/")) throw new Error("Invalid media path");

  const isKnownLockCityPair = LOCK_CITY_MEDIA_HOSTS.has(image.hostname)
    && LOCK_CITY_MEDIA_HOSTS.has(store.hostname);
  if (image.origin !== store.origin && !isKnownLockCityPair) throw new Error("Invalid media origin");

  const candidates = [image];
  if (isKnownLockCityPair) {
    for (const hostname of LOCK_CITY_MEDIA_HOSTS) {
      const alternate = new URL(image);
      alternate.hostname = hostname;
      if (!candidates.some((candidate) => candidate.href === alternate.href)) candidates.push(alternate);
    }
  }
  return candidates;
}

export async function fetchWooMedia(
  source: string,
  configuredStore: string,
  request: typeof fetch = fetch,
): Promise<Response | undefined> {
  for (const candidate of wooMediaCandidates(source, configuredStore)) {
    let response: Response;
    try {
      response = await request(candidate, {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && /^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(contentType)) return response;
  }
  return undefined;
}

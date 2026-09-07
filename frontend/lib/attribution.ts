// First-touch attribution: UTMs, promoter id, referral code and initial
// referrer are captured on landing and persist through product → cart →
// checkout. Attached automatically to every analytics event; later sent
// to WooCommerce order meta and the Supabase attribution table.

const KEY = "lc-attribution";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  promoter_id?: string;
  coupon?: string;
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
}

export function captureAttribution() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return; // first-touch wins
  const q = new URLSearchParams(window.location.search);
  const data: Attribution = {
    utm_source: q.get("utm_source") ?? undefined,
    utm_medium: q.get("utm_medium") ?? undefined,
    utm_campaign: q.get("utm_campaign") ?? undefined,
    promoter_id: q.get("promoter") ?? q.get("ref") ?? undefined,
    coupon: q.get("coupon") ?? undefined,
    referrer: document.referrer || undefined,
    landing_path: window.location.pathname,
    captured_at: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

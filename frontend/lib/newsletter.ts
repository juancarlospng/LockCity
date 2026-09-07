// JOIN THE CITY — subscription service abstraction.
// The lifecycle/email provider (Klaviyo is the leading candidate) plugs
// in here without the UI changing. Until a provider is configured the
// Null provider returns `unavailable` and the UI shows an honest state —
// no fabricated confirmations.

export interface SubscriptionRequest {
  email: string;
  consent: boolean;
  country?: string;
  language?: string;
}

export type SubscriptionResult =
  | { status: "subscribed" }
  | { status: "unavailable" }
  | { status: "error" };

export interface SubscriptionProvider {
  subscribe(req: SubscriptionRequest): Promise<SubscriptionResult>;
}

class NullSubscriptionProvider implements SubscriptionProvider {
  async subscribe() {
    return { status: "unavailable" } as SubscriptionResult;
  }
}

// Future: class KlaviyoProvider implements SubscriptionProvider { ... }
// Server-side only, using KLAVIYO_API_KEY + KLAVIYO_LIST_ID env vars.
export const subscriptionProvider: SubscriptionProvider =
  new NullSubscriptionProvider();

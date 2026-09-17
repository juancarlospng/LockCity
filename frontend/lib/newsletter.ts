import "server-only";
import {
  BrevoDoubleOptInProvider,
  parseBrevoConfig,
  type SubscriptionRequest,
  type SubscriptionResult,
} from "./newsletter-core";

export interface SubscriptionProvider {
  subscribe(req: SubscriptionRequest): Promise<SubscriptionResult>;
}

class ServerSubscriptionProvider implements SubscriptionProvider {
  async subscribe(request: SubscriptionRequest): Promise<SubscriptionResult> {
    const config = parseBrevoConfig(process.env);
    if (!config) {
      console.error("[newsletter] Double opt-in configuration is incomplete.");
      return { status: "error", reason: "configuration" };
    }
    const result = await new BrevoDoubleOptInProvider(config).subscribe(request);
    if (result.status === "error") {
      console.error("[newsletter] Double opt-in request failed.", { reason: result.reason });
    }
    return result;
  }
}

export const subscriptionProvider: SubscriptionProvider =
  new ServerSubscriptionProvider();

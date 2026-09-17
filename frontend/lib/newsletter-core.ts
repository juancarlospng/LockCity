export const BREVO_DOI_ENDPOINT = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
export const DEFAULT_DOI_REDIRECT_URL = "https://lock-city.vercel.app/join/confirmed";
export const MAX_JOIN_BODY_BYTES = 4096;
export const MAX_EMAIL_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JOIN_FIELDS = new Set(["email", "consent", "website"]);

export interface SubscriptionRequest {
  email: string;
  consent: true;
}

export type SubscriptionResult =
  | { status: "pending_confirmation" }
  | { status: "error"; reason: "configuration" | "provider" | "doi_template" };

export interface BrevoConfig {
  apiKey: string;
  listId: number;
  templateId: number;
  redirectionUrl: string;
}

export class JoinValidationError extends Error {
  constructor(public readonly reason: "invalid_payload" | "invalid_email" | "consent_required" | "honeypot") {
    super(reason);
    this.name = "JoinValidationError";
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

export function parseJoinPayload(value: unknown): SubscriptionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new JoinValidationError("invalid_payload");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !JOIN_FIELDS.has(key))) throw new JoinValidationError("invalid_payload");
  if (typeof body.website !== "undefined" && typeof body.website !== "string") throw new JoinValidationError("invalid_payload");
  if (typeof body.website === "string" && body.website.trim()) throw new JoinValidationError("honeypot");
  if (typeof body.email !== "string") throw new JoinValidationError("invalid_email");
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new JoinValidationError("invalid_email");
  if (body.consent !== true) throw new JoinValidationError("consent_required");
  return { email, consent: true };
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function absoluteRedirect(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseBrevoConfig(env: Record<string, string | undefined>): BrevoConfig | undefined {
  const apiKey = env.BREVO_API_KEY?.trim();
  const listId = positiveInteger(env.BREVO_LIST_ID);
  const templateId = positiveInteger(env.BREVO_DOI_TEMPLATE_ID);
  const redirectionUrl = absoluteRedirect(env.BREVO_DOI_REDIRECT_URL?.trim() || DEFAULT_DOI_REDIRECT_URL);
  if (!apiKey || !listId || !templateId || !redirectionUrl) return undefined;
  return { apiKey, listId, templateId, redirectionUrl };
}

export function buildDoubleOptInPayload(email: string, config: BrevoConfig) {
  return {
    email: normalizeEmail(email),
    includeListIds: [config.listId],
    templateId: config.templateId,
    redirectionUrl: config.redirectionUrl,
  };
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class BrevoDoubleOptInProvider {
  constructor(private readonly config: BrevoConfig, private readonly fetcher: Fetcher = fetch) {}

  async subscribe(request: SubscriptionRequest): Promise<SubscriptionResult> {
    let response: Response;
    try {
      response = await this.fetcher(BREVO_DOI_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": this.config.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildDoubleOptInPayload(request.email, this.config)),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return { status: "error", reason: "provider" };
    }
    if (response.ok) return { status: "pending_confirmation" };

    const detail = await response.text().catch(() => "");
    const doiTemplateError = /template/i.test(detail) && /double.?opt.?in|doi/i.test(detail);
    return { status: "error", reason: doiTemplateError ? "doi_template" : "provider" };
  }
}

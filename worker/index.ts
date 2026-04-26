type Env = {
  TURNSTILE_SECRET_KEY: string;
  PAYPAL_DONATION_URL: string;
  FRONTEND_ORIGIN: string;
  HANDOFF_SECRET: string;
};

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

const rateMap = new Map<string, number[]>();
const encoder = new TextEncoder();

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(normalized + pad);
}

async function hmacSign(content: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(content));
  const bytes = new Uint8Array(sig);
  let result = "";
  bytes.forEach((b) => {
    result += String.fromCharCode(b);
  });
  return base64UrlEncode(result);
}

async function createSignedToken(payload: Record<string, unknown>, secret: string) {
  const json = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(json);
  const signature = await hmacSign(payloadPart, secret);
  return `${payloadPart}.${signature}`;
}

async function verifySignedToken(token: string, secret: string) {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    return null;
  }
  const expected = await hmacSign(payloadPart, secret);
  if (expected !== signature) {
    return null;
  }
  try {
    const payloadText = base64UrlDecode(payloadPart);
    return JSON.parse(payloadText) as { exp?: number };
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(origin ? { "access-control-allow-origin": origin } : {}),
    },
  });
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 20;
  const recent = (rateMap.get(ip) ?? []).filter((ts) => now - ts < windowMs);
  recent.push(now);
  rateMap.set(ip, recent);
  return recent.length > maxRequests;
}

function buildPayPalRedirectUrl(baseUrl: string, frontendOrigin: string): string {
  const redirectUrl = new URL(baseUrl);
  const returnUrl = `${frontendOrigin}/thank-you`;
  if (!redirectUrl.searchParams.has("return")) {
    redirectUrl.searchParams.set("return", returnUrl);
  }
  if (!redirectUrl.searchParams.has("cancel_return")) {
    redirectUrl.searchParams.set("cancel_return", returnUrl);
  }
  if (!redirectUrl.searchParams.has("rm")) {
    redirectUrl.searchParams.set("rm", "2");
  }
  return redirectUrl.toString();
}

async function verifyTurnstile(token: string, env: Env, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  if (ip) {
    body.append("remoteip", ip);
  }
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as TurnstileVerifyResponse;
  return Boolean(data.success);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const requestIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const allowedOrigin = env.FRONTEND_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": allowedOrigin,
          "access-control-allow-methods": "POST, GET, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    if (url.pathname === "/api/create-handoff" && request.method === "POST") {
      if (origin !== allowedOrigin) {
        return jsonResponse({ error: "Origin not allowed." }, 403, allowedOrigin);
      }
      if (isRateLimited(requestIp)) {
        return jsonResponse({ error: "Too many requests. Try again later." }, 429, allowedOrigin);
      }

      const payload = (await request.json()) as {
        token?: string;
        robuxAmount?: number;
        suggestedDonation?: number;
      };

      if (!payload.token || !payload.robuxAmount || !payload.suggestedDonation) {
        return jsonResponse({ error: "Invalid request body." }, 400, allowedOrigin);
      }

      const captchaOk = await verifyTurnstile(payload.token, env, requestIp);
      if (!captchaOk) {
        return jsonResponse({ error: "Captcha validation failed." }, 401, allowedOrigin);
      }

      const signed = await createSignedToken(
        {
          exp: Math.floor(Date.now() / 1000) + 300,
          robuxAmount: payload.robuxAmount,
          suggestedDonation: payload.suggestedDonation,
        },
        env.HANDOFF_SECRET,
      );

      return jsonResponse(
        {
          redirectUrl: `${url.origin}/r/${signed}`,
        },
        200,
        allowedOrigin,
      );
    }

    if (url.pathname.startsWith("/r/") && request.method === "GET") {
      const token = decodeURIComponent(url.pathname.slice(3));
      const verified = await verifySignedToken(token, env.HANDOFF_SECRET);
      if (!verified || !verified.exp || Date.now() / 1000 > verified.exp) {
        return new Response("Invalid or expired handoff.", { status: 401 });
      }
      return Response.redirect(
        buildPayPalRedirectUrl(env.PAYPAL_DONATION_URL, env.FRONTEND_ORIGIN),
        302,
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};

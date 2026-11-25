import { authJson } from "./auth-http";

/**
 * Validates that state-changing requests originate from the same host.
 * Checks the Origin, Referer, and Sec-Fetch-Site headers against the Host/X-Forwarded-Host.
 *
 * @param {Request} request
 * @returns {{ ok: boolean, response?: import("next/server").NextResponse }}
 */
export function verifyCsrfOrigin(request) {
  if (!request || !request.headers) {
    return { ok: true };
  }

  // If Sec-Fetch-Site is cross-site, reject immediately
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return {
      ok: false,
      response: authJson(
        { error: "Cross-origin request blocked by CSRF policy." },
        403,
      ),
    };
  }

  const origin = request.headers.get("origin");
  const rawHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const host = rawHost ? rawHost.split(",")[0].trim().toLowerCase() : null;

  if (origin) {
    if (origin === "null") {
      return {
        ok: false,
        response: authJson(
          { error: "Cross-origin request blocked by CSRF policy." },
          403,
        ),
      };
    }

    try {
      const originUrl = new URL(origin);
      if (!host) {
        return {
          ok: false,
          response: authJson(
            { error: "Unable to verify request host for origin check." },
            400,
          ),
        };
      }

      if (originUrl.host.toLowerCase() !== host) {
        return {
          ok: false,
          response: authJson(
            { error: "Cross-origin request blocked by CSRF policy." },
            403,
          ),
        };
      }
    } catch {
      return {
        ok: false,
        response: authJson({ error: "Invalid Origin header." }, 400),
      };
    }
  }

  // If Origin is not present, check Referer if provided
  const referer = request.headers.get("referer");
  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host.toLowerCase() !== host) {
        return {
          ok: false,
          response: authJson(
            { error: "Cross-origin request blocked by CSRF policy." },
            403,
          ),
        };
      }
    } catch {
      return {
        ok: false,
        response: authJson({ error: "Invalid Referer header." }, 400),
      };
    }
  }

  return { ok: true };
}

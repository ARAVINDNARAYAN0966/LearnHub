import "server-only";

import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

export function authJson(body, status = 200, additionalHeaders = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...additionalHeaders },
  });
}

export async function parseAuthJsonBody(request) {
  const maximumBytes = 8192;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return {
      response: authJson({ error: "Request body is too large." }, 413),
    };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  const chunks = [];
  let totalBytes = 0;
  let rawBody;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return {
          response: authJson({ error: "Request body is too large." }, 413),
        };
      }
      chunks.push(value);
    }

    const bodyBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    rawBody = new TextDecoder().decode(bodyBytes);
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  } finally {
    reader.releaseLock();
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  return { body, response: null };
}

function redactDiagnosticMessage(message) {
  let safeMessage = message;

  for (const value of [
    process.env.MONGODB_URI,
    process.env.SESSION_SECRET,
  ]) {
    if (value) {
      safeMessage = safeMessage.split(value).join("[REDACTED]");
    }
  }

  return safeMessage
    .replace(/\b(?:mongodb(?:\+srv)?|https?):\/\/[^\s"'<>]+/gi, "[REDACTED_URI]")
    .replace(
      /\b(password(?:hash)?|passwd|pwd|token|secret|authorization|cookie)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(/\bBearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

export function logAuthFailure(operation, error) {
  unstable_rethrow(error);
  const name = error instanceof Error ? error.name : "UnknownError";

  if (process.env.NODE_ENV !== "development") {
    console.error(`${operation} failed (${name})`);
    return;
  }

  const details = {
    name,
    code:
      typeof error?.code === "number"
        ? error.code
        : typeof error?.code === "string"
          ? redactDiagnosticMessage(error.code)
          : null,
    codeName:
      typeof error?.codeName === "string"
        ? redactDiagnosticMessage(error.codeName)
        : null,
  };

  if (
    error?.name === "MongooseServerSelectionError" &&
    typeof error.message === "string"
  ) {
    details.message = redactDiagnosticMessage(error.message);
  }

  console.error(`${operation} failed: ${JSON.stringify(details)}`);
}

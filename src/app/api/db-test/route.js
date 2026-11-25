import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";

function getSensitiveValues(uri) {
  const values = uri ? [uri] : [];
  const schemeIndex = uri.search(/mongodb(?:\+srv)?:\/\//i);
  if (schemeIndex < 0) {
    return values;
  }

  const authorityStart = uri.indexOf("://", schemeIndex) + 3;
  const remainder = uri.slice(authorityStart);
  const authorityEnd = remainder.search(/[/?#\s]/);
  const authority = authorityEnd < 0 ? remainder : remainder.slice(0, authorityEnd);
  const atIndex = authority.lastIndexOf("@");
  if (atIndex < 0) {
    return values;
  }

  const userInfo = authority.slice(0, atIndex);
  const separator = userInfo.indexOf(":");
  const credentials =
    separator < 0
      ? [userInfo]
      : [userInfo.slice(0, separator), userInfo.slice(separator + 1)];

  for (const credential of credentials) {
    if (!credential) continue;
    values.push(credential);
    try {
      const decoded = decodeURIComponent(credential);
      if (decoded) values.push(decoded);
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
    }
  }

  return [...new Set(values)];
}

function redactSensitiveMessage(message) {
  let safeMessage = message;
  for (const value of getSensitiveValues(process.env.MONGODB_URI || "")) {
    safeMessage = safeMessage.split(value).join("[REDACTED]");
  }

  return safeMessage
    .replace(/\bMONGODB_URI\s*=\s*[^\s"'<>]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, "[REDACTED_CONNECTION_URI]")
    .replace(
      /\b(user(?:name)?|password|passwd|pwd)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /\b(user(?:name)?|password|passwd|pwd)\s+["'][^"']*["']/gi,
      "$1 [REDACTED]",
    );
}

function collectErrorDetails(error) {
  const details = [];
  const visited = new Set();
  const pending = [error];

  while (pending.length > 0 && details.length < 12) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);
    details.push({
      name: typeof current.name === "string" ? current.name : "UnknownError",
      code:
        typeof current.code === "number" || typeof current.code === "string"
          ? current.code
          : null,
      codeName: typeof current.codeName === "string" ? current.codeName : null,
      message: typeof current.message === "string" ? current.message : "",
    });

    if (current.cause) pending.push(current.cause);
    if (current.reason instanceof Error) pending.push(current.reason);

    const servers = current.reason?.servers;
    if (servers instanceof Map) {
      for (const server of servers.values()) {
        if (server?.error) pending.push(server.error);
      }
    }
  }

  return details;
}

function classifyConnectionFailure(details) {
  const codes = new Set(details.map(({ code }) => String(code || "").toUpperCase()));
  const names = new Set(details.map(({ name }) => name.toLowerCase()));
  const messages = details.map(({ message }) => message).join(" ").toLowerCase();

  if (
    codes.has("18") ||
    (codes.has("8000") &&
      details.some(({ codeName }) => codeName === "AtlasError") &&
      /authentication failed|bad auth/.test(messages)) ||
    /authentication failed|bad auth/.test(messages)
  ) {
    return "authentication";
  }

  if ([...codes].some((code) => /^(ERR_SSL|ERR_TLS|CERT_)/.test(code))) {
    return "tls-handshake";
  }

  if (
    ["ENOTFOUND", "EAI_AGAIN", "ENODATA", "ESERVFAIL"].some((code) =>
      codes.has(code),
    )
  ) {
    return "dns";
  }

  if (
    /(?:ip address|source ip).{0,80}(?:not allowed|not authorized|not in (?:the )?access list|not whitelisted)/i.test(
      messages,
    )
  ) {
    return "atlas-ip-access-restriction";
  }

  if (
    codes.has("ETIMEDOUT") ||
    names.has("mongonetworktimeouterror") ||
    /timed out|timeout/.test(messages)
  ) {
    return "network-timeout";
  }

  if (
    ["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"].some((code) =>
      codes.has(code),
    )
  ) {
    return "network-connection";
  }

  if (/replicasetnoprimary|no primary/.test(messages)) {
    return "replica-set-no-primary";
  }

  if (names.has("mongooseServerselectionerror")) {
    return "server-selection-ambiguous";
  }

  return "other";
}

function safeDiagnostic(error) {
  const details = collectErrorDetails(error);
  const [primary] = details;
  const category = classifyConnectionFailure(details);

  return {
    category,
    name: primary?.name || "UnknownError",
    code:
      typeof primary?.code === "string"
        ? redactSensitiveMessage(primary.code)
        : primary?.code ?? null,
    codeName: primary?.codeName
      ? redactSensitiveMessage(primary.codeName)
      : null,
    causes: details.slice(1, 6).map(({ name, code, codeName }) => ({
      name,
      code: typeof code === "string" ? redactSensitiveMessage(code) : code,
      codeName: codeName ? redactSensitiveMessage(codeName) : null,
    })),
    message:
      primary?.message
        ? redactSensitiveMessage(primary.message).slice(0, 500)
        : "Unknown MongoDB error",
    nextChecks: {
      "tls-handshake":
        "DNS and TCP succeeded, but TLS negotiation failed before MongoDB authentication. Check for TLS interception or outbound security appliances and confirm Atlas endpoint health.",
      "server-selection-ambiguous":
        "Client error is inconclusive; check DNS, outbound network, Atlas IP access list, and cluster state.",
    }[category],
  };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectToDatabase();
    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `MongoDB connection test failed: ${JSON.stringify(safeDiagnostic(error))}`,
      );
    }

    return NextResponse.json(
      { success: false, message: "MongoDB connection failed" },
      { status: 500 },
    );
  }
}

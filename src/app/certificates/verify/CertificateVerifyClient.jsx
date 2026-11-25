"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function formatDate(date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

export default function CertificateVerifyClient() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [inputVal, setInputVal] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchedId, setSearchedId] = useState("");

  const verifyId = useCallback(async (idToVerify) => {
    const clean = idToVerify.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setSearchedId(clean);
    setResult(null);

    try {
      const res = await fetch(`/api/certificates/${clean}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setResult({ ok: res.ok && data.valid, data });
    } catch {
      setResult({
        ok: false,
        data: { error: "Network error. Please try again." },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const clean = initialId.trim().toUpperCase();
    if (!clean) return;

    let cancelled = false;
    fetch(`/api/certificates/${clean}`, { cache: "no-store" })
      .then((res) =>
        res.json().then((data) => ({ ok: res.ok && data.valid, data })),
      )
      .then((res) => {
        if (!cancelled) {
          setSearchedId(clean);
          setResult(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchedId(clean);
          setResult({
            ok: false,
            data: { error: "Network error. Please try again." },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialId]);

  function handleSubmit(e) {
    e.preventDefault();
    if (inputVal.trim()) {
      verifyId(inputVal);
    }
  }

  return (
    <div>
      {/* Search Input Box */}
      <form
        onSubmit={handleSubmit}
        className="cert-result-card"
        style={{ marginTop: 0 }}
      >
        <label
          htmlFor="cert-id-input"
          style={{
            display: "block",
            fontSize: 11,
            textTransform: "uppercase",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--ink-muted, #726b77)",
            marginBottom: 4,
          }}
        >
          Certificate Identifier
        </label>
        <div className="cert-verify-input-group">
          <input
            id="cert-id-input"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. LH-INTROW-C867D949"
            className="cert-verify-input"
            required
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="button button-primary"
            style={{ padding: "0 24px", minHeight: 44, whiteSpace: "nowrap" }}
          >
            {loading ? "Verifying..." : "Verify Credential"}
          </button>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-muted, #726b77)",
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          Format: Starts with <code style={{ fontFamily: "var(--font-geist-mono, monospace)" }}>LH-</code> followed by course code and credential hash.
        </p>
      </form>

      {/* Verification State / Result */}
      {loading && (
        <div
          className="admin-course-state"
          style={{ marginTop: 24 }}
          role="status"
          aria-live="polite"
        >
          <span className="admin-loading-spinner" aria-hidden="true" />
          <p>Verifying credential with LearnHub official records...</p>
        </div>
      )}

      {!loading && result && (
        <div style={{ marginTop: 24 }}>
          {result.ok && result.data?.certificate ? (
            <div
              className="cert-result-card"
              style={{
                borderColor: "rgba(16, 185, 129, 0.4)",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.08)",
              }}
              role="region"
              aria-label="Verified Certificate Information"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--line, #e9e7e5)",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#059669",
                    fontWeight: 800,
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✓
                </span>
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#059669",
                      display: "block",
                    }}
                  >
                    VERIFIED OFFICIAL CREDENTIAL
                  </span>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: "2px 0 0" }}>
                    Authentic Certificate of Completion
                  </h2>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginTop: 20,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Recipient
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: "2px 0 0" }}>
                    {result.data.certificate.recipientName}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Certificate ID
                  </span>
                  <p style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700, color: "#b45309", margin: "2px 0 0" }}>
                    {result.data.certificate.certificateId}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Verified Course
                  </span>
                  <p style={{ fontWeight: 600, margin: "2px 0 0" }}>
                    {result.data.certificate.courseTitle}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Instructor
                  </span>
                  <p style={{ fontWeight: 600, margin: "2px 0 0" }}>
                    {result.data.certificate.instructorName}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Date of Completion
                  </span>
                  <p style={{ fontWeight: 600, margin: "2px 0 0" }}>
                    {formatDate(result.data.certificate.issuedAt)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted, #726b77)", fontWeight: 600 }}>
                    Issuing Authority
                  </span>
                  <p style={{ fontWeight: 600, margin: "2px 0 0" }}>
                    LearnHub Verified Education Platform
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid var(--line, #e9e7e5)",
                }}
              >
                <Link
                  href={`/certificates/${result.data.certificate.certificateId}`}
                  className="button button-primary text-sm py-2 px-4"
                >
                  View Full Certificate ↗
                </Link>
                <a
                  href={`/api/certificates/${result.data.certificate.certificateId}/download`}
                  className="button button-outline text-sm py-2 px-4"
                  download
                >
                  Download Official PDF ⬇
                </a>
              </div>
            </div>
          ) : (
            <div
              className="cert-result-card"
              style={{
                borderColor: "rgba(239, 68, 68, 0.4)",
                textAlign: "center",
                padding: "32px 24px",
              }}
              role="alert"
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#dc2626",
                  fontWeight: 800,
                  fontSize: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                ✕
              </span>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#dc2626",
                    display: "block",
                  }}
                >
                  INVALID CREDENTIAL
                </span>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 8px" }}>
                  Certificate Not Found
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-muted, #726b77)",
                    maxWidth: 440,
                    margin: "0 auto",
                    lineHeight: 1.5,
                  }}
                >
                  No certificate record was found matching{" "}
                  <code style={{ fontFamily: "var(--font-geist-mono, monospace)", color: "#dc2626", fontWeight: 700 }}>
                    {searchedId}
                  </code>
                  . Please verify the ID for typographical errors and try again.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

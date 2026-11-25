import { Suspense } from "react";
import Link from "next/link";
import CertificateVerifyClient from "./CertificateVerifyClient";

export const metadata = {
  title: "Verify Certificate",
  description: "Verify the authenticity of an official LearnHub certificate of course completion.",
};

export default function CertificateVerifyPage() {
  return (
    <main className="certificate-verify-wrap">
      <div>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <Link
              href="/"
              className="text-link"
              style={{ fontSize: 13, textDecoration: "none" }}
            >
              ← Back to LearnHub
            </Link>
          </div>
          <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
            OFFICIAL CREDENTIAL VERIFICATION
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px" }}>
            Verify a Certificate
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-muted, #726b77)",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Confirm the authenticity of any LearnHub course completion credential. Enter the unique certificate ID found on the certificate.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="admin-course-state" role="status" aria-live="polite">
              <span className="admin-loading-spinner" aria-hidden="true" />
              <p>Loading verification portal...</p>
            </div>
          }
        >
          <CertificateVerifyClient />
        </Suspense>
      </div>
    </main>
  );
}

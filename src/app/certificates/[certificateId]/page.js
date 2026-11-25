import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Certificate from "../../../models/Certificate";
import { connectToDatabase } from "../../../lib/mongodb";
import PrintCertificateButton from "../../../components/PrintCertificateButton";

export async function generateMetadata({ params }) {
  await connection();
  const { certificateId } = await params;
  return {
    title: `Certificate ${certificateId}`,
    description: "Official LearnHub Certificate of Course Completion",
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function CertificatePage({ params }) {
  return (
    <Suspense
      fallback={
        <main className="certificate-page-wrap min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <div className="max-w-4xl mx-auto text-center py-24 text-zinc-500">
            Loading certificate...
          </div>
        </main>
      }
    >
      <CertificateDetails params={params} />
    </Suspense>
  );
}

async function CertificateDetails({ params }) {
  await connection();
  const { certificateId } = await params;
  const cleanId = typeof certificateId === "string" ? certificateId.trim().toUpperCase() : "";

  await connectToDatabase();
  const cert = await Certificate.findOne({ certificateId: cleanId }).lean();
  if (!cert) {
    return (
      <main className="certificate-page-wrap min-h-screen py-16 px-4 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg">
          <span className="text-4xl" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="text-xl font-bold mt-4 text-zinc-900 dark:text-zinc-100">
            Certificate Not Found
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            The certificate ID{" "}
            <code className="font-mono font-bold">
              {cleanId || "unknown"}
            </code>{" "}
            could not be found or verified in our official records.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/certificates/verify"
              className="button button-primary text-sm py-2 px-4"
            >
              Search &amp; Verify Credential
            </Link>
            <Link
              href="/dashboard"
              className="button button-outline text-sm py-2 px-4"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="certificate-page-wrap min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors py-2"
          >
            ← Back to Dashboard
          </Link>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}
          >
            <a
              href={`/api/certificates/${cert.certificateId}/download`}
              className="button button-primary cursor-pointer text-sm py-2 px-4 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity"
              download={`learnhub-certificate-${cert.certificateId}.pdf`}
            >
              Download PDF ⬇
            </a>
            <PrintCertificateButton />
            <Link
              href={`/certificates/verify?id=${cert.certificateId}`}
              className="button button-outline text-sm py-2 px-4 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Verify Credential ✓
            </Link>
          </div>
        </div>

        {/* Certificate Card */}
        <div className="certificate-card">
          <div className="certificate-top-bar">
            <span className="certificate-top-label">
              Official LearnHub Credential
            </span>
            <span className="certificate-top-id">
              {cert.certificateId}
            </span>
          </div>

          <div className="certificate-header">
            <span className="certificate-brand">✳ LearnHub</span>
            <p className="certificate-title-sub">
              Certificate of Course Completion
            </p>
          </div>

          <p
            style={{
              fontSize: 13,
              fontFamily: "var(--font-dm-serif, serif)",
              fontStyle: "italic",
              color: "var(--ink-muted, #726b77)",
              margin: "8px 0 4px",
            }}
          >
            This is proudly presented to
          </p>

          <h1 className="certificate-recipient">{cert.recipientName}</h1>

          <p
            style={{
              fontSize: 13,
              color: "var(--ink-muted, #726b77)",
              maxWidth: 500,
              margin: "0 auto 12px",
              lineHeight: 1.5,
            }}
          >
            for successfully fulfilling all lessons, assignments, and verified requirements of:
          </p>

          <h2 className="certificate-course">{cert.courseTitle}</h2>

          <div className="certificate-meta-grid">
            <div>
              <p
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted, #726b77)",
                  margin: 0,
                }}
              >
                Instructor
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--ink, #17172f)",
                  marginTop: 4,
                }}
              >
                {cert.instructorName}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted, #726b77)",
                  margin: 0,
                }}
              >
                Date Issued
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--ink, #17172f)",
                  marginTop: 4,
                }}
              >
                {formatDate(cert.issuedAt || cert.createdAt)}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 11,
              color: "var(--ink-muted, #726b77)",
            }}
          >
            Verified credential ID:{" "}
            <span
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontWeight: 700,
              }}
            >
              {cert.certificateId}
            </span>{" "}
            · Issued by LearnHub Platform
          </div>
        </div>
      </div>
    </main>
  );
}

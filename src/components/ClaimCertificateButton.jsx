"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClaimCertificateButton({
  courseId,
  buttonText = "View Certificate",
  className = "button button-primary",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/courses/${courseId}/certificate`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to retrieve certificate.");
        return;
      }

      if (data?.certificate?.certificateId) {
        router.push(`/certificates/${data.certificate.certificateId}`);
      } else {
        setError("Certificate not found.");
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className={className}
      >
        {loading ? "Retrieving certificate..." : buttonText}
        {!loading && <span aria-hidden="true"> ↗</span>}
      </button>
      {error && (
        <span className="text-xs text-red-500 font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

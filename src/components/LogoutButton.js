"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({
  className = "nav-login nav-logout",
  children = "Log out",
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      window.dispatchEvent(new Event("learnhub:auth-changed"));
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="logout-control">
      <button
        className={className}
        type="button"
        onClick={handleLogout}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing out..." : children}
      </button>
      {error && (
        <span className="logout-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

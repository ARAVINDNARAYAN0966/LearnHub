"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({ error, reset }) {
  useEffect(() => {
    // Log error summary safely without leaking sensitive details
    if (process.env.NODE_ENV === "development") {
      console.error("Root application error:", error);
    } else {
      console.error(
        `Application error occurred${error?.digest ? ` (digest: ${error.digest})` : ""}`,
      );
    }
  }, [error]);

  return (
    <main className="page-container flex-1 flex items-center justify-center py-20 px-4">
      <div
        className="empty-state max-w-md w-full mx-auto my-8 p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-center"
        role="alert"
      >
        <span aria-hidden="true" className="text-4xl block mb-2">
          ⚠️
        </span>
        <span className="eyebrow">APPLICATION ERROR</span>
        <h1 className="text-2xl font-bold mt-2 mb-3 text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm mx-auto leading-relaxed">
          An unexpected error occurred while loading this page. Please try again
          or return to the homepage.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            className="button button-primary text-xs"
          >
            Try Again ↻
          </button>
          <Link href="/" className="button button-outline text-xs">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

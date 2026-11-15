import Link from "next/link";

export default function Logo({ light = false }) {
  return (
    <Link
      href="/"
      className={`brand${light ? " brand-light" : ""}`}
      aria-label="LearnHub home"
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M5 8.5c4.1-1.6 7.8-1 11 1.8v14c-3.2-2.8-6.9-3.4-11-1.8v-14Z"
            fill="currentColor"
          />
          <path
            d="M27 8.5c-4.1-1.6-7.8-1-11 1.8v14c3.2-2.8 6.9-3.4 11-1.8v-14Z"
            fill="currentColor"
            opacity=".58"
          />
        </svg>
      </span>
      <span>learn<span className="brand-accent">hub</span></span>
    </Link>
  );
}

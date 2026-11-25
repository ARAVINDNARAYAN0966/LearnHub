import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <main className="page-container flex-1 flex items-center justify-center py-20 px-4">
      <div className="empty-state max-w-md w-full mx-auto my-8 p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-center">
        <span aria-hidden="true" className="text-4xl block mb-2">
          🔍
        </span>
        <span className="eyebrow">404 ERROR</span>
        <h1 className="text-2xl font-bold mt-2 mb-3 text-zinc-900 dark:text-zinc-100">
          Page Not Found
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm mx-auto leading-relaxed">
          The page or lesson you were looking for doesn’t exist, has been moved,
          or is temporarily unavailable.
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
          <Link href="/courses" className="button button-primary text-xs">
            Explore Courses ↗
          </Link>
          <Link href="/" className="button button-outline text-xs">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

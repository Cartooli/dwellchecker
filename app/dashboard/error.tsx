"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container">
      <h1 className="page-title">Something went wrong</h1>
      <p className="page-sub">
        We hit an unexpected error loading this page.{" "}
        {error.digest && <span>Reference: {error.digest}</span>}
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

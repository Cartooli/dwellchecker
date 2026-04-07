import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="container">
      <section className="notfound">
        <div className="eyebrow">404</div>
        <h1 className="balance">That page isn't here.</h1>
        <p className="lead">
          The link may be stale, or the page may never have existed. Head back to the dashboard
          and pick up where you left off.
        </p>
        <div className="btn-row">
          <Link href="/" className="btn btn-primary">
            Return home
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

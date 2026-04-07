import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Property not found",
};

export default function PropertyNotFound() {
  return (
    <main className="container">
      <section className="notfound">
        <div className="eyebrow">Not found</div>
        <h1 className="balance">That property isn't in your account.</h1>
        <p className="lead">
          It may have been removed, or the link may be wrong. You can return to your dashboard to
          see everything you're tracking.
        </p>
        <div className="btn-row">
          <Link href="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

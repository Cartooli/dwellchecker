"use client";

import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

export default function PropertyInviteForm({ propertyId }: { propertyId: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Invite failed");
      }
      setMessage("Invite sent. They’ll see this property after they sign in with that email.");
      setEmail("");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} style={{ marginTop: 12 }}>
      <div className="section-title" style={{ fontSize: 14 }}>
        Share read-only
      </div>
      <p className="page-sub" style={{ fontSize: 13, marginBottom: 8 }}>
        Invite someone by email. They must sign in with that email to view this property.
      </p>
      <label htmlFor={`invite-${propertyId}`}>Email</label>
      <input
        id={`invite-${propertyId}`}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="friend@example.com"
        required
      />
      <button className="btn btn-ghost" type="submit" disabled={busy} aria-busy={busy}>
        {busy && <Spinner />}
        {busy ? "Sending…" : "Send invite"}
      </button>
      {message && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{message}</p>}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
    </form>
  );
}

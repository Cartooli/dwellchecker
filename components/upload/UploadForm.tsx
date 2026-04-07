"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus("Uploading…");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/properties/${propertyId}/uploads`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "Upload failed");
      const json = await res.json();
      setStatus(`Processing job ${json.jobId}…`);
      // Wait briefly for background processing then refresh.
      setTimeout(() => {
        router.push(`/dashboard/properties/${propertyId}`);
        router.refresh();
      }, 2500);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>Inspection file (PDF, text)</label>
      <input type="file" name="file" required accept=".pdf,.txt,.json" />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Working…" : "Upload & analyze"}
      </button>
      {status && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{status}</p>}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
    </form>
  );
}

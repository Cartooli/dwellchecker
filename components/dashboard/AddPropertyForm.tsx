"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";

async function parseJsonSafely(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function AddPropertyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      street1: String(fd.get("street1") ?? ""),
      city: String(fd.get("city") ?? ""),
      state: String(fd.get("state") ?? "").toUpperCase(),
      postalCode: String(fd.get("postalCode") ?? ""),
    };
    try {
      const res = await fetch("/api/properties/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseJsonSafely(res);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not add property right now. Please try again.");
      }
      if (!json?.propertyId) {
        throw new Error("Property was created, but no property id was returned.");
      }
      router.push(`/dashboard/properties/${json.propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add property right now.");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>Street</label>
      <input name="street1" required placeholder="10 Main St" />
      <label>City</label>
      <input name="city" required placeholder="Winchester" />
      <label>State</label>
      <input name="state" required maxLength={2} placeholder="MA" />
      <label>Postal code</label>
      <input name="postalCode" required placeholder="01890" />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy && <Spinner />}
        {busy ? "Adding…" : "Add property"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

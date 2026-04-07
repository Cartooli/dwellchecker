import { getPropertyDetail } from "@/lib/domain/property";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const REC_LABEL: Record<string, string> = {
  PROCEED: "Proceed",
  PROCEED_WITH_CONDITIONS: "Proceed with conditions",
  NEGOTIATE: "Negotiate",
  WALK: "Walk away",
  INSUFFICIENT_DATA: "Insufficient data",
};

const SEV_TAG: Record<string, string> = {
  LOW: "tag tag-low",
  MODERATE: "tag tag-mod",
  HIGH: "tag tag-high",
  CRITICAL: "tag tag-critical",
};

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  let property;
  try {
    property = await getPropertyDetail(propertyId);
  } catch {
    property = null;
  }
  if (!property) notFound();

  const profile = property.profiles[0];
  const score = profile?.currentScore ?? 0;
  const recommendation = profile?.recommendation ?? "INSUFFICIENT_DATA";
  const summary = (profile?.summaryJson as { summary?: string } | null)?.summary;
  const capLow =
    (profile?.summaryJson as { capitalExposureLow?: number } | null)?.capitalExposureLow ?? 0;
  const capHigh =
    (profile?.summaryJson as { capitalExposureHigh?: number } | null)?.capitalExposureHigh ?? 0;

  return (
    <main className="container">
      <h1 className="page-title">
        {property.street1}, {property.city}, {property.state} {property.postalCode}
      </h1>
      <p className="page-sub">Condition profile · {property.inspections.length} inspection(s) on file</p>

      <div className="banner">
        <div className="score-ring" style={{ ["--p" as never]: score }}>
          <div className="score-ring-inner">
            <div className="num">{score}</div>
            <div className="lbl">Score</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="rec">{REC_LABEL[recommendation]}</div>
          <p style={{ color: "var(--text-dim)", margin: "8px 0 12px", lineHeight: 1.55 }}>
            {summary ?? "Upload an inspection report to generate a recommendation."}
          </p>
          {capHigh > 0 && (
            <div style={{ fontSize: 13, color: "var(--text-mute)" }}>
              Estimated near-term capital exposure: ${capLow.toLocaleString()}–$
              {capHigh.toLocaleString()}
            </div>
          )}
        </div>
        <Link href={`/dashboard/properties/${property.id}/upload`} className="btn btn-primary">
          Upload report
        </Link>
      </div>

      <div className="section-title">Defects</div>
      {property.defects.length === 0 ? (
        <p className="page-sub">No defects on record yet.</p>
      ) : (
        <div className="defect-list">
          {property.defects.map((d) => (
            <div className="defect" key={d.id}>
              <h4>{d.title}</h4>
              <p>{d.description}</p>
              <div className="meta">
                <span className={SEV_TAG[d.severity]}>{d.severity}</span>
                <span>{d.category}</span>
                {d.estimatedCostLow != null && d.estimatedCostHigh != null && (
                  <span>
                    ${d.estimatedCostLow.toLocaleString()}–${d.estimatedCostHigh.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

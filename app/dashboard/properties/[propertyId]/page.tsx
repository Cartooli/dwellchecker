import type { CSSProperties } from "react";
import { auth } from "@clerk/nextjs/server";
import { getPropertyDetailForViewer } from "@/lib/domain/property";
import { userCanWriteProperty } from "@/lib/auth/property-access";
import { logger } from "@/lib/logging/logger";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyInviteForm from "@/components/dashboard/PropertyInviteForm";

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
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const { propertyId } = await params;
  let property;
  try {
    property = await getPropertyDetailForViewer(propertyId, userId);
  } catch (err) {
    logger.error("property-detail-failed", {
      propertyId,
      err: err instanceof Error ? err.message : String(err),
    });
    property = null;
  }
  if (!property) notFound();

  const canWrite = await userCanWriteProperty(userId, property.id);
  const readOnlyBorrowed = !canWrite;

  const profile = property.profiles[0];
  const score = profile?.currentScore ?? 0;
  const recommendation = profile?.recommendation ?? "INSUFFICIENT_DATA";
  const summaryData = profile?.summaryJson as Record<string, unknown> | null;
  const summary = typeof summaryData?.summary === "string" ? summaryData.summary : undefined;
  const capLow = typeof summaryData?.capitalExposureLow === "number" ? summaryData.capitalExposureLow : 0;
  const capHigh = typeof summaryData?.capitalExposureHigh === "number" ? summaryData.capitalExposureHigh : 0;

  return (
    <main className="container">
      <h1 className="page-title">
        {property.street1}, {property.city}, {property.state} {property.postalCode}
      </h1>
      <p className="page-sub">Condition profile · {property.inspections.length} inspection(s) on file</p>
      {readOnlyBorrowed && (
        <p className="page-sub" style={{ color: "var(--text-dim)" }}>
          Read-only — shared with you. Uploading and rescoring are available to the owner.
        </p>
      )}

      <div className="banner">
        <div className="score-ring" style={{ "--p": score } as CSSProperties}>
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
        {canWrite ? (
          <Link href={`/dashboard/properties/${property.id}/upload`} className="btn btn-primary">
            Upload report
          </Link>
        ) : null}
      </div>

      {canWrite ? <PropertyInviteForm propertyId={property.id} /> : null}

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

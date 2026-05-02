import { auth } from "@/lib/auth/session";
import { listPropertiesForViewer } from "@/lib/domain/property";
import { logger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  let properties: Awaited<ReturnType<typeof listPropertiesForViewer>> = [];
  try {
    properties = await listPropertiesForViewer(userId, { take: 25 });
  } catch (err) {
    logger.error("compare-query-failed", { err: err instanceof Error ? err.message : String(err) });
    properties = [];
  }

  return (
    <main className="container">
      <h1 className="page-title">Compare</h1>
      <p className="page-sub">
        Side-by-side condition snapshot across the properties you're tracking.
      </p>

      {properties.length === 0 ? (
        <p className="page-sub">Nothing to compare yet.</p>
      ) : (
        <div className="defect-list">
          {properties.map((p) => {
            const profile = p.profiles?.[0];
            const score = profile?.currentScore ?? 0;
            const shared = p.ownerUserId !== userId;
            return (
              <div className="defect" key={p.id}>
                <h4>
                  {p.street1}, {p.city}, {p.state}
                  {shared && (
                    <span className="ghost-tag" style={{ marginLeft: 8 }}>
                      Shared with you
                    </span>
                  )}
                </h4>
                <div className="meta">
                  <span>Score {score}</span>
                  <span>{profile?.recommendation ?? "INSUFFICIENT_DATA"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

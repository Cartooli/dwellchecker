import { auth } from "@/lib/auth/session";
import Link from "next/link";
import AddPropertyForm from "@/components/dashboard/AddPropertyForm";
import { listPropertiesForViewer } from "@/lib/domain/property";
import { logger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  let properties: Awaited<ReturnType<typeof listPropertiesForViewer>> = [];
  try {
    properties = await listPropertiesForViewer(userId);
  } catch (err) {
    logger.error("dashboard-query-failed", { err: err instanceof Error ? err.message : String(err) });
    properties = [];
  }

  return (
    <main className="container">
      <h1 className="page-title">Your properties</h1>
      <p className="page-sub">Track condition risk across every property you're evaluating.</p>

      <div className="dash-grid">
        <div>
          <div className="section-title">Add a property</div>
          <AddPropertyForm />
        </div>
        <div>
          <div className="section-title">Recent</div>
          {properties.length === 0 ? (
            <div className="defect-list">
              <div className="defect ghost" aria-hidden>
                <h4>14 Linden Ave, Winchester, MA</h4>
                <p>NEGOTIATE · score 58</p>
                <span className="ghost-tag">Sample · yours appear here</span>
              </div>
              <div className="defect ghost" aria-hidden>
                <h4>22 Oak Hill Rd, Lexington, MA</h4>
                <p>PROCEED_WITH_CONDITIONS · score 74</p>
                <span className="ghost-tag">Sample · yours appear here</span>
              </div>
            </div>
          ) : (
            <div className="defect-list">
              {properties.map((p) => {
                const profile = p.profiles?.[0];
                const shared = p.ownerUserId !== userId;
                return (
                  <Link key={p.id} href={`/dashboard/properties/${p.id}`} className="defect">
                    <h4>
                      {p.street1}, {p.city}, {p.state} {p.postalCode}
                      {shared && (
                        <span className="ghost-tag" style={{ marginLeft: 8 }}>
                          Shared with you
                        </span>
                      )}
                    </h4>
                    <p>
                      {profile?.recommendation ?? "INSUFFICIENT_DATA"} · score{" "}
                      {profile?.currentScore ?? "—"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logging/logger";
import Link from "next/link";
import AddPropertyForm from "@/components/dashboard/AddPropertyForm";

export const dynamic = "force-dynamic";

type PropertyWithProfiles = Awaited<ReturnType<typeof prisma.property.findMany<{
  include: { profiles: { orderBy: { createdAt: "desc" }; take: 1 } };
}>>>;

export default async function DashboardPage() {
  let properties: PropertyWithProfiles = [];
  try {
    properties = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { profiles: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
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
                return (
                  <Link key={p.id} href={`/dashboard/properties/${p.id}`} className="defect">
                    <h4>
                      {p.street1}, {p.city}, {p.state} {p.postalCode}
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

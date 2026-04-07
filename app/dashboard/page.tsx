import { prisma } from "@/lib/db/client";
import Link from "next/link";
import AddPropertyForm from "@/components/dashboard/AddPropertyForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let properties: Awaited<ReturnType<typeof prisma.property.findMany>> = [];
  try {
    properties = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { profiles: { orderBy: { createdAt: "desc" }, take: 1 } } as never,
    });
  } catch {
    properties = [];
  }

  return (
    <main className="container">
      <h1 className="page-title">Your properties</h1>
      <p className="page-sub">Track condition risk across every property you're evaluating.</p>

      <div className="section-title">Add a property</div>
      <AddPropertyForm />

      <div className="section-title">Recent</div>
      {properties.length === 0 ? (
        <p className="page-sub">No properties yet. Add one above to begin.</p>
      ) : (
        <div className="defect-list">
          {properties.map((p: any) => {
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
    </main>
  );
}

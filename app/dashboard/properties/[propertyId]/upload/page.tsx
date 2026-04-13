import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import UploadForm from "@/components/upload/UploadForm";
import { userCanWriteProperty } from "@/lib/auth/property-access";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }
  const { propertyId } = await params;
  if (!(await userCanWriteProperty(userId, propertyId))) {
    notFound();
  }

  return (
    <main className="container">
      <h1 className="page-title">Upload inspection report</h1>
      <p className="page-sub">
        We'll extract findings, normalize them into structured defects, and update your
        recommendation.
      </p>
      <UploadForm propertyId={propertyId} />
    </main>
  );
}

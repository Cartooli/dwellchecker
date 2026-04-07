import UploadForm from "@/components/upload/UploadForm";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
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

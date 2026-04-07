import SampleVerdict from "@/components/marketing/SampleVerdict";

export default function HomePage() {
  return (
    <main>
      <section className="hero container hero-grid">
        <div>
          <div className="eyebrow">Buyer-first property intelligence</div>
          <h1 className="balance">Know what's wrong with the property. Before you buy.</h1>
          <p className="lead">
            Condition scores condition risk, interprets your inspection report, and gives you one
            clear answer: proceed, negotiate, or walk. No jargon. No agent spin. Just what matters.
          </p>
          <div className="btn-row">
            <a href="/dashboard" className="btn btn-primary">Open dashboard →</a>
            <a href="/dashboard" className="btn btn-ghost">Add a property</a>
          </div>
        </div>
        <SampleVerdict />
      </section>
    </main>
  );
}

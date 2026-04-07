export default function HomePage() {
  return (
    <main>
      <section className="hero container">
        <div className="eyebrow">Buyer-first property intelligence</div>
        <h1>Know what's wrong with the property — before you buy.</h1>
        <p className="lead">
          Dwellchecker scores condition risk, interprets your inspection report, and gives you a
          clear answer: proceed, negotiate, or walk. No jargon. No agent spin. Just what matters.
        </p>
        <div className="btn-row">
          <a href="/dashboard" className="btn btn-primary">Open dashboard →</a>
          <a href="/dashboard" className="btn btn-ghost">Add a property</a>
        </div>

        <div className="grid-3">
          <div className="card">
            <h3>Pre-inspection risk score</h3>
            <p>
              Get a baseline read on a listing's likely problem areas before you spend money on a
              formal inspection.
            </p>
          </div>
          <div className="card">
            <h3>Inspection interpretation</h3>
            <p>
              Upload the PDF and see normalized defects with severity, urgency, and a near-term
              capital exposure range.
            </p>
          </div>
          <div className="card">
            <h3>Decisive recommendation</h3>
            <p>
              Every property gets one of five clear states — from Proceed to Walk — with the
              evidence behind it.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

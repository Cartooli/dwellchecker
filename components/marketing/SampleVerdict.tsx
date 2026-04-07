export default function SampleVerdict() {
  return (
    <aside className="specimen" aria-label="Sample property verdict">
      <div className="specimen-header">
        <div className="specimen-addr">
          14 Linden Ave, Winchester, MA
          <span className="specimen-sample">Sample</span>
        </div>
        <div className="specimen-rec">Negotiate</div>
      </div>
      <div className="specimen-row">
        <div className="score-ring" style={{ ["--p" as never]: 58 }}>
          <div className="score-ring-inner">
            <div className="num">58</div>
            <div className="lbl">Score</div>
          </div>
        </div>
        <div className="specimen-summary">
          Two high-severity findings on the roof and electrical panel. Estimated near-term capital
          exposure: <strong>$11,500–$26,000</strong>.
        </div>
      </div>
      <div className="specimen-defects">
        <div className="specimen-defect">
          <span className="tag tag-high">HIGH</span>
          <div>
            <strong>Roof covering at end of life</strong>
            <span>Asphalt shingles, advanced wear · $9,000–$18,000</span>
          </div>
        </div>
        <div className="specimen-defect">
          <span className="tag tag-high">HIGH</span>
          <div>
            <strong>Outdated electrical panel</strong>
            <span>Federal Pacific, recommend replacement · $2,500–$8,000</span>
          </div>
        </div>
        <div className="specimen-defect">
          <span className="tag tag-mod">MOD</span>
          <div>
            <strong>HVAC nearing service life</strong>
            <span>Furnace 18 years old · monitor closely</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

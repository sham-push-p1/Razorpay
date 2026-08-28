interface Props {
  onClose: () => void;
}

export default function PiiInspectorModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--wide">
        <div className="modal-badge-row">
          <span className="badge badge-pass">🔒 PCI-DSS & GDPR PRIVACY GUARANTEE</span>
        </div>

        <h3>PII Minimization & Zero-Data-Leakage Proof</h3>
        <p className="modal-sub">
          Inspect how sensitive payment identifiers are tokenized and irreversibly hashed before entering the ML feature pipeline.
        </p>

        <div className="pii-comparison-table-wrapper">
          <table className="pii-table">
            <thead>
              <tr>
                <th>Data Field</th>
                <th>Raw Client Input (Ingestion Edge)</th>
                <th>Shield AI Pipeline Representation</th>
                <th>Compliance Standard</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Primary Account (PAN)</strong></td>
                <td><code className="text-red">4111 2222 3333 4242</code></td>
                <td><code className="text-green mono">•••• •••• •••• 4242 (Token: tok_98a2f)</code></td>
                <td><span className="badge badge-type">PCI-DSS 4.0</span></td>
              </tr>
              <tr>
                <td><strong>Customer IP Address</strong></td>
                <td><code className="text-red">103.21.144.12</code></td>
                <td><code className="text-green mono">sha256(ip + salt): IP-8F2B9A1C</code></td>
                <td><span className="badge badge-type">GDPR Recital 26</span></td>
              </tr>
              <tr>
                <td><strong>Device Fingerprint</strong></td>
                <td><code className="text-red">UserAgent + CanvasFP Raw</code></td>
                <td><code className="text-green mono">sha256(fingerprint): DEV-A4C91E</code></td>
                <td><span className="badge badge-type">ISO/IEC 27001</span></td>
              </tr>
              <tr>
                <td><strong>Cardholder Name</strong></td>
                <td><code className="text-red">Rahul Sharma</code></td>
                <td><code className="text-green mono">R**** S***** (Hashed)</code></td>
                <td><span className="badge badge-type">RBI Data Masking</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pii-callout-box">
          <span className="pii-callout-icon">🛡️</span>
          <div>
            <strong>Zero Raw PII Storage Guarantee</strong>
            <p>Neither the SQLite datastore, in-memory HotStore, nor the ML XGBoost gradient boosted trees ever access or persist raw PANs or customer identities.</p>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            ✓ Close Privacy Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

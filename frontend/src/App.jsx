import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { ArrowRight, Camera, Check, CircleAlert, Clock3, ExternalLink, History, Link2, LoaderCircle, LockKeyhole, ScanLine, ShieldCheck, Sparkles, Trash2, Upload, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const USER_KEY = 'sentinel-browser-user-id';

function getUserId() {
  try {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  } catch {
    return 'session-' + Math.random().toString(36).slice(2);
  }
}

const userHeaders = () => ({ 'X-Sentinel-User': getUserId() });
const riskClass = (level) => (level || 'moderate').toLowerCase();

function Header() {
  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="Sentinel home"><span>SENTINEL</span><i /> <small>AI SECURITY</small></Link>
      <nav>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/scan-url">Scan URL</NavLink>
        <NavLink to="/scan-qr">Scan QR</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/model">Model</NavLink>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>SENTINEL <i>·</i> AI SECURITY</span>
      <span>Pause. Scan. Proceed.</span>
      <span>URL-pattern analysis is an indicator, not a guarantee.</span>
    </footer>
  );
}

function Layout({ children, wide = false }) {
  return (
    <div className="app">
      <Header />
      <main className={wide ? 'page-main page-main-wide' : 'page-main'}>{children}</main>
      <Footer />
    </div>
  );
}

function Home() {
  return (
    <Layout wide>
      <section className="home-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(239,226,207,.94) 0%, rgba(239,226,207,.84) 42%, rgba(239,226,207,.05) 75%), url('/images/home-beige.png')" }}>
        <div className="home-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> DIGITAL CLARITY, BEFORE THE CLICK</p>
          <h1>Know what’s<br />behind <em>the link.</em></h1>
          <p className="home-subtitle">Intelligent protection, before the click.</p>
          <p className="home-description">A considered way to check suspicious links and QR codes. Let SENTINEL assess the URL before you decide to trust it.</p>
          <div className="home-actions">
            <Link className="button button-dark" to="/scan-url"><Link2 size={17} /> SCAN URL <ArrowRight size={16} /></Link>
            <Link className="button button-light" to="/scan-qr"><ScanLine size={17} /> SCAN QR <ArrowRight size={16} /></Link>
          </div>
          <p className="formal-title">SMART PHISHING &amp; MALICIOUS URL DETECTOR</p>
        </div>
        <div className="home-photo-caption"><span>01 / DIGITAL AWARENESS</span><span>Smarter checks. Safer choices.</span></div>
      </section>
      <section className="home-intro">
        <div>
          <p className="eyebrow">A MORE THOUGHTFUL FIRST STEP</p>
          <h2>Every link deserves<br /><em>a closer look.</em></h2>
        </div>
        <p>Suspicious links can be carefully disguised. SENTINEL uses a trained machine-learning model to examine URL patterns, estimate phishing risk, and explain the visible warning signs — without opening the destination.</p>
      </section>
      <section className="promise-strip">
        <span><ShieldCheck size={17} /> URL-only ML analysis</span>
        <span><LockKeyhole size={17} /> The destination is not opened</span>
        <span><History size={17} /> Saved scan history</span>
      </section>
    </Layout>
  );
}

function ResultCard({ result, onReset }) {
  if (!result) return null;
  const cls = riskClass(result.riskLevel);
  const realCheck = result.realCheck || {};

  return (
    <section className="result-card" aria-live="polite">
      <div className="result-top">
        <div>
          <p className="eyebrow">SENTINEL SECURITY ASSESSMENT</p>
          <h2>{result.riskLevel === 'LOW' ? 'Lower risk detected' : result.riskLevel === 'MODERATE' ? 'Review this link carefully' : 'High risk detected'}</h2>
          <p className="result-host">{result.hostname}</p>
          <p className="result-verdict">{result.verdict}</p>
        </div>
        <div className={`score-ring ${cls}`}><strong>{result.riskScore}%</strong><span>PHISHING RISK</span></div>
      </div>

      <div className="score-track"><span className={cls} style={{ width: `${result.riskScore}%` }} /></div>

      <div className="result-stats">
        <div><span>RISK LEVEL</span><strong className={`risk-text ${cls}`}>{result.riskLevel}</strong></div>
        <div><span>MODEL CONFIDENCE</span><strong>{result.confidence ?? '—'}%</strong></div>
        <div><span>MODEL</span><strong>{result.model || 'Random Forest'}</strong></div>
      </div>

      {realCheck && (
        <div className="verification-box">
          <p className="eyebrow">REAL VERIFICATION</p>
          <div className="verification-grid">
            <span>DNS resolved</span><strong>{realCheck.dnsResolved ? 'Yes' : 'No'}</strong>
            <span>Reachable</span><strong>{realCheck.reachable ? 'Yes' : 'No'}</strong>
            <span>HTTPS valid</span><strong>{realCheck.tlsValid ? 'Yes' : 'No'}</strong>
            <span>HTTP status</span><strong>{realCheck.httpStatus ?? 'Unavailable'}</strong>
            <span>Final URL</span><strong>{realCheck.finalUrl || result.url}</strong>
            {realCheck.redirectedTo ? <><span>Redirect</span><strong>{realCheck.redirectedTo}</strong></> : null}
            {realCheck.error ? <><span>Note</span><strong>{realCheck.error}</strong></> : null}
          </div>
        </div>
      )}

      <div className="signals-heading">
        <div>
          <p className="eyebrow">OBSERVED CHARACTERISTICS</p>
          <h3>Why it may need attention</h3>
        </div>
        <span className="muted-small">URL pattern indicators</span>
      </div>

      <ul className="reason-list">
        {(result.reasons || []).map((reason, i) => (
          <li key={i}><span><CircleAlert size={15} /></span>{reason}</li>
        ))}
      </ul>

      <div className="recommendation">
        <ShieldCheck size={20} />
        <div>
          <strong>Before you proceed</strong>
          <p>
            {result.riskScore >= 65
              ? 'Avoid entering passwords, payment details, or personal information. Verify the sender and domain independently.'
              : result.riskScore >= 30
                ? 'Treat the link cautiously. Confirm the domain with the organization through a trusted channel before sharing sensitive information.'
                : 'No strong phishing pattern was detected, but a low score cannot guarantee a website is safe.'}
          </p>
        </div>
      </div>

      <p className="result-disclaimer">This prediction is based on URL characteristics and a live basic connectivity check. It is not a full domain reputation lookup and should be treated as a signal, not a guarantee.</p>
      <button className="button button-dark reset-button" onClick={onReset}>SCAN ANOTHER <ArrowRight size={16} /></button>
    </section>
  );
}

function useScan() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const analyzeUrl = useCallback(async (url) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(`${API}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...userHeaders() },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed.');
      if (!data.scan?.realCheck) {
        throw new Error('The backend is outdated. Restart the SENTINEL API, then scan again.');
      }
      if (requestId.current === currentRequestId) setResult(data.scan);
    } catch (e) {
      if (requestId.current === currentRequestId) {
        setError(e.message || 'Could not connect to the SENTINEL API.');
      }
    } finally {
      if (requestId.current === currentRequestId) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    requestId.current += 1;
    setLoading(false);
    setResult(null);
    setError('');
  }, []);

  return { loading, result, error, analyzeUrl, reset };
}

function UrlScanPage() {
  const [url, setUrl] = useState('');
  const scan = useScan();

  function submit(e) {
    e.preventDefault();
    let parsed;
    try {
      parsed = new URL(url.trim().includes('://') ? url.trim() : `https://${url.trim()}`);
    } catch {
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) return;
    scan.analyzeUrl(parsed.href);
  }

  return (
    <Layout wide>
      <section className="scan-hero url-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(29,22,16,.93) 0%, rgba(29,22,16,.78) 42%, rgba(29,22,16,.12) 100%), url('/images/url-editorial.png')" }}>
        <div className="scan-hero-copy">
          <p className="eyebrow eyebrow-light"><span className="eyebrow-line" /> URL SCAN / 01</p>
          <h1>Not every link<br />is what it <em>seems.</em></h1>
          <p>Smart Phishing &amp; Malicious URL Detector</p>
          <form className="url-form" onSubmit={submit}>
            <Link2 size={20} />
            <input aria-label="Website URL" type="text" value={url} onChange={e => { setUrl(e.target.value); scan.reset(); }} placeholder="Paste a website URL…" maxLength={2048} required />
            <button disabled={scan.loading}>{scan.loading ? <LoaderCircle className="spin" size={17} /> : 'SCAN URL'} <ArrowRight size={16} /></button>
          </form>
          <p className="scan-note"><LockKeyhole size={14} /> The destination is never opened automatically.</p>
        </div>
        <div className="image-label">SENTINEL / URL INTELLIGENCE</div>
      </section>

      {scan.error && <div className="notice error" role="alert">{scan.error}</div>}
      {scan.loading && <div className="loading-panel"><LoaderCircle className="spin" /> Extracting URL characteristics and checking the host in real time…</div>}
      <ResultCard result={scan.result} onReset={() => { scan.reset(); setUrl(''); }} />
      <div className="scan-bottom"><span>01 / URL STRUCTURE</span><span>02 / MODEL INFERENCE</span><span>03 / RISK ASSESSMENT</span></div>
    </Layout>
  );
}

// Bulletproof multi-engine QR decoder using Native BarcodeDetector + multi-pass jsQR
async function decodeQrFromImage(file) {
  if (!file) throw new Error('No image file selected.');

  const img = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not open the selected image file.'));
    };
    image.src = objectUrl;
  });

  // Strategy 1: Native BarcodeDetector (Supported in modern Chrome/Edge/Chromium)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {}
  }

  // Strategy 2: jsQR with multiple scales and contrast binarization passes
  function scanCanvas(w, h, binarize = false) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      if (binarize) {
        let total = 0;
        const totalPixels = w * h;
        for (let i = 0; i < data.length; i += 4) {
          total += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }
        const threshold = (total / totalPixels) * 0.93;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          const val = gray >= threshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      const code = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
      return code?.data || null;
    } catch {
      return null;
    }
  }

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const maxDim = Math.max(origW, origH);

  // Pass 1: Original size
  let found = scanCanvas(origW, origH, false);
  if (found) return found;

  // Pass 2: High-contrast binarized (handles glare / shadows / camera noise)
  found = scanCanvas(origW, origH, true);
  if (found) return found;

  // Pass 3: 1000px downscaled (fixes phone cameras > 12MP)
  if (maxDim > 1000) {
    const ratio = 1000 / maxDim;
    const w = Math.round(origW * ratio);
    const h = Math.round(origH * ratio);
    found = scanCanvas(w, h, false);
    if (found) return found;
    found = scanCanvas(w, h, true);
    if (found) return found;
  }

  // Pass 4: 650px scale (handles dense / smaller QR codes)
  if (maxDim > 650) {
    const ratio = 650 / maxDim;
    const w = Math.round(origW * ratio);
    const h = Math.round(origH * ratio);
    found = scanCanvas(w, h, false);
    if (found) return found;
    found = scanCanvas(w, h, true);
    if (found) return found;
  }

  // Pass 5: 800px upscale if small crop
  if (maxDim < 800) {
    const ratio = 800 / maxDim;
    const w = Math.round(origW * ratio);
    const h = Math.round(origH * ratio);
    found = scanCanvas(w, h, false);
    if (found) return found;
  }

  return null;
}

function normalizeQrUrl(rawDecoded) {
  if (!rawDecoded || !rawDecoded.trim()) {
    throw new Error('The scanned QR code is empty.');
  }
  let raw = rawDecoded.trim();
  if (!raw.includes('://')) {
    raw = `https://${raw}`;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`The QR code decoded to "${rawDecoded}", which is not a valid web URL.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error(`The QR code decoded to "${rawDecoded}". SENTINEL only scans web (HTTP/HTTPS) URLs.`);
  }
  return parsed.href;
}

function QrScanPage() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const scannerRef = useRef(null);
  const resultRef = useRef(null);
  const scan = useScan();

  // Scroll to results automatically when scanning or results arrive
  useEffect(() => {
    if (scan.result || scan.loading || scan.error) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scan.result, scan.loading, scan.error]);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    let scanner;

    (async () => {
      try {
        scanner = new Html5Qrcode('sentinel-qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
          async (decoded) => {
            if (cancelled) return;
            setQrValue(decoded);
            setCameraError('');
            setCameraOpen(false);
            try {
              const validUrl = normalizeQrUrl(decoded);
              scan.analyzeUrl(validUrl);
            } catch (err) {
              setCameraError(err.message || 'This QR code does not contain a valid HTTP or HTTPS URL.');
            }
          },
          () => {}
        );
      } catch {
        if (!cancelled) {
          setCameraError('Camera unavailable. Allow camera access in browser permissions or upload a QR image instead.');
          setCameraOpen(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        (async () => {
          try { if (current.isScanning) await current.stop(); } catch {}
          try { current.clear(); } catch {}
        })();
      }
    };
  }, [cameraOpen]);

  async function uploadFile(file) {
    if (!file) return;
    setCameraError('');
    setFileBusy(true);
    setCameraOpen(false);

    // Show image preview in the workspace
    const previewUrl = URL.createObjectURL(file);
    setUploadedPreview(previewUrl);

    try {
      const decoded = await decodeQrFromImage(file);
      if (!decoded) {
        throw new Error('Could not detect a QR code in this image. Please ensure the QR code is clearly visible, or try using camera mode.');
      }

      setQrValue(decoded);
      const validUrl = normalizeQrUrl(decoded);
      scan.analyzeUrl(validUrl);
    } catch (e) {
      setCameraError(e.message || 'Could not decode QR code from this image.');
    } finally {
      setFileBusy(false);
    }
  }

  return (
    <Layout wide>
      <section
        className="qr-hero"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #efe2cf 0%, #efe2cf 46%, rgba(239,226,207,.92) 58%, rgba(239,226,207,.08) 84%), url('/images/qr-camera.png')",
        }}
      >
        <div className="qr-hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> QR SCAN / 02</p>
          <h1>Pause. Scan.<br /><em>Proceed.</em></h1>
          <p>Read the code. Check the destination. Choose with confidence.</p>
          <div className="qr-hero-actions">
            <button className="button button-dark" onClick={() => { setCameraError(''); setCameraOpen(v => !v); }}>
              <Camera size={17} />{cameraOpen ? 'CLOSE CAMERA' : 'OPEN CAMERA'} <ArrowRight size={16} />
            </button>
            <label className="button button-light upload-button">
              <Upload size={17} /> UPLOAD QR IMAGE
              <input type="file" accept="image/*" onChange={e => uploadFile(e.target.files?.[0])} disabled={fileBusy} />
            </label>
          </div>
          <p className="scan-note"><LockKeyhole size={14} /> Decoded links are analyzed, never opened.</p>
        </div>
        <div className="image-label image-label-light">SENTINEL / QR INTELLIGENCE</div>
      </section>

      <section className="qr-workspace">
        <div className="qr-instructions">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>One scan before<br /><em>you trust it.</em></h2>
          <ol>
            <li><span>01</span> Read the QR code with your camera or upload an image.</li>
            <li><span>02</span> SENTINEL extracts the encoded URL.</li>
            <li><span>03</span> The same ML model and real host check estimate its phishing risk.</li>
          </ol>
        </div>
        <div className="qr-camera-panel">
          <div id="sentinel-qr-reader" className={cameraOpen ? 'qr-reader' : 'qr-reader-hidden'} />
          {!cameraOpen && !uploadedPreview && (
            <div className="camera-placeholder">
              <div className="camera-frame"><ScanLine size={40} /></div>
              <strong>Ready when you are</strong>
              <span>Open the camera or upload a QR image to begin.</span>
            </div>
          )}
          {!cameraOpen && uploadedPreview && (
            <div className="uploaded-preview-box">
              <img src={uploadedPreview} alt="Uploaded QR preview" className="uploaded-preview-img" />
              <span>Selected QR Image</span>
            </div>
          )}
          {(cameraError || fileBusy) && (
            <p className={cameraError ? 'qr-error' : 'scan-note qr-busy-note'} role="status">
              {fileBusy ? <><LoaderCircle size={15} className="spin" /> Reading and analyzing QR code…</> : cameraError}
            </p>
          )}
          {qrValue && (
            <div className="decoded-qr-badge">
              <Check size={16} />
              <div>
                <small>DECODED QR DESTINATION</small>
                <strong>{qrValue}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Immediate Result Card Section - Positioned right below workspace just like URL Scan */}
      <div ref={resultRef} className="qr-result-section">
        {scan.error && <div className="notice error" role="alert">{scan.error}</div>}
        {scan.loading && (
          <div className="loading-panel">
            <LoaderCircle className="spin" />
            <span>Analyzing the decoded QR destination with the ML model and real-time host check…</span>
          </div>
        )}
        <ResultCard
          result={scan.result}
          onReset={() => {
            scan.reset();
            setQrValue('');
            setCameraError('');
            setUploadedPreview(null);
          }}
        />
      </div>

      <figure className="qr-reference-strip">
        <img src="/images/qr-realworld.jpg" alt="A person scanning a printed QR code with a smartphone on a warm wooden table" />
        <figcaption><span>SCAN WITH INTENTION</span><span>Always check the destination before opening it.</span></figcaption>
      </figure>
    </Layout>
  );
}

function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await fetch(`${API}/api/scans?limit=100`, { headers: userHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load scan history.');
      setScans(d.scans || []);
    } catch (e) {
      setError(e.message || 'Backend unavailable.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function clear() {
    if (!window.confirm('Clear all saved SENTINEL scan history?')) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/scans`, { method: 'DELETE', headers: userHeaders() });
      if (!r.ok) throw new Error();
      setScans([]);
    } catch {
      setError('Could not clear scan history.');
    } finally {
      setBusy(false);
    }
  }

  const countHigh = scans.filter(s => s.riskLevel === 'HIGH').length;
  const countLow = scans.filter(s => s.riskLevel === 'LOW').length;

  return (
    <Layout>
      <section className="page-heading">
        <p className="eyebrow">YOUR ACTIVITY / ARCHIVE</p>
        <h1>A record of<br /><em>every check.</em></h1>
        <p>Past URL and QR scans saved privately for this browser.</p>
      </section>

      {error && <div className="notice error">{error}</div>}

      <div className="history-stats">
        <div><span>TOTAL SCANS</span><strong>{scans.length}</strong></div>
        <div><span>LOWER RISK</span><strong>{countLow}</strong></div>
        <div><span>HIGH RISK</span><strong>{countHigh}</strong></div>
      </div>

      <div className="history-toolbar">
        <p>{scans.length} saved {scans.length === 1 ? 'assessment' : 'assessments'}</p>
        <div>
          <button className="button button-light" onClick={load}><Clock3 size={15} /> REFRESH</button>
          <button className="button button-light" onClick={clear} disabled={busy}><Trash2 size={15} /> CLEAR HISTORY</button>
        </div>
      </div>

      {!scans.length ? (
        <div className="empty-state">
          <History size={28} />
          <h3>Your archive is quiet.</h3>
          <p>Once you scan a URL or QR code, the assessment will appear here.</p>
          <Link className="text-link" to="/scan-url">Start your first scan <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <div className="history-list">
          {scans.map(s => (
            <article className="history-row" key={s.id}>
              <div className="history-row-icon"><Link2 size={19} /></div>
              <div className="history-row-main">
                <strong>{s.hostname}</strong>
                <small>{s.url}</small>
                <span>{s.createdAt ? new Date(`${s.createdAt.replace(' ', 'T')}Z`).toLocaleString() : 'Date unavailable'}</span>
              </div>
              <span className={`risk-pill ${riskClass(s.riskLevel)}`}>{s.riskLevel}</span>
              <strong className="history-score">{s.riskScore}%</strong>
            </article>
          ))}
        </div>
      )}
    </Layout>
  );
}

function ModelPage() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/model-info`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Model metrics unavailable.');
        setInfo(d);
      })
      .catch(e => setError(e.message));
  }, []);

  const pct = v => typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—';

  return (
    <Layout>
      <section className="page-heading">
        <p className="eyebrow">MODEL NOTES / TRANSPARENCY</p>
        <h1>Intelligence,<br /><em>made explainable.</em></h1>
        <p>SENTINEL extracts lexical characteristics from the URL and uses a trained Random Forest classifier to estimate phishing risk.</p>
      </section>

      {error && <div className="notice">{error} The deployment build trains the model from the public UCI dataset.</div>}

      {info && (
        <>
          <div className="model-summary">
            <span className="model-badge"><Sparkles size={17} /> TRAINED MODEL</span>
            <h2>{info.model}</h2>
            <p>{info.dataset}</p>
            <a href={info.datasetSource} target="_blank" rel="noreferrer">Dataset source: UCI Machine Learning Repository <ExternalLink size={14} /></a>
          </div>

          <div className="metric-grid">
            {[['Accuracy', pct(info.accuracy)], ['Precision', pct(info.precision)], ['Recall', pct(info.recall)], ['F1 score', pct(info.f1)], ['ROC AUC', pct(info.rocAuc)], ['URL features', info.featureCount]].map(([label, value]) => (
              <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>

          <p className="model-footnote">
            Evaluation is measured on a held-out split from the downloaded dataset. These scores do not guarantee real-world detection performance; URL-only models can miss new or carefully disguised attacks. {info.rowsUsed?.toLocaleString()} rows used; {info.trainRows?.toLocaleString()} for training and {info.testRows?.toLocaleString()} for testing.
          </p>

          <div className="confusion-card">
            <h3>Confusion matrix</h3>
            <p>Rows are actual classes; columns are predicted classes. Class 1 means phishing.</p>
            <div className="matrix-grid">
              <span />
              <strong>Predicted legitimate</strong>
              <strong>Predicted phishing</strong>
              <strong>Actual legitimate</strong>
              <span>{info.confusionMatrix?.[0]?.[0] ?? '—'}</span>
              <span>{info.confusionMatrix?.[0]?.[1] ?? '—'}</span>
              <strong>Actual phishing</strong>
              <span>{info.confusionMatrix?.[1]?.[0] ?? '—'}</span>
              <span>{info.confusionMatrix?.[1]?.[1] ?? '—'}</span>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function NotFound() {
  return (
    <Layout>
      <section className="page-heading">
        <p className="eyebrow">404 / NOT FOUND</p>
        <h1>This page<br /><em>isn't here.</em></h1>
        <Link className="button button-dark" to="/">Return home <ArrowRight size={16} /></Link>
      </section>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan-url" element={<UrlScanPage />} />
      <Route path="/scan-qr" element={<QrScanPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/model" element={<ModelPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ScanSearch, ArrowRight, Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScanForm({ onScan, loading = false }) {
  const [url, setUrl] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    let scanner;

    async function start() {
      try {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
          async (decodedText) => {
            if (cancelled || processingRef.current) return;
            let parsed;
            try {
              parsed = new URL(decodedText.trim());
            } catch {
              setCameraError('This QR code does not contain a valid website URL.');
              return;
            }
            if (!['http:', 'https:'].includes(parsed.protocol)) {
              setCameraError('Please scan a QR code containing an HTTP or HTTPS URL.');
              return;
            }
            processingRef.current = true;
            setUrl(parsed.href);
            setCameraError('');
            setCameraOpen(false);
            onScanRef.current?.(parsed.href);
            processingRef.current = false;
          },
          () => {}
        );
      } catch {
        if (!cancelled) {
          setCameraError('Could not open the camera. Allow camera permission and try again.');
          setCameraOpen(false);
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (scannerRef.current === scanner) scannerRef.current = null;
      if (scanner) {
        (async () => {
          try { if (scanner.isScanning) await scanner.stop(); } catch {}
          try { scanner.clear(); } catch {}
        })();
      }
    };
  }, [cameraOpen]);

  function submit(event) {
    event.preventDefault();
    setCameraError('');
    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      setCameraError('Enter a valid URL, such as https://example.com.');
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      setCameraError('Only HTTP and HTTPS website URLs are supported.');
      return;
    }
    onScanRef.current?.(parsed.href);
  }

  return (
    <section id="scanner" className="scanner-panel">
      <div className="scan-columns">
        <div className="qr-side">
          <div className="scanner-title"><span className="scanner-icon"><Camera size={21} /></span><h3>Scan a QR code</h3></div>
          <p>Use your camera to read a QR code containing a website URL.</p>
          {cameraOpen && <div className="qr-reader-container"><div id="qr-reader" /></div>}
          {cameraError && <p className="qr-error" role="alert">{cameraError}</p>}
          <button type="button" className="secondary-button" disabled={loading} onClick={() => { setCameraError(''); setCameraOpen((open) => !open); }}>
            {cameraOpen ? <CameraOff size={17} /> : <Camera size={17} />}
            {cameraOpen ? 'Stop camera' : 'Open QR camera'}
          </button>
        </div>
        <div className="url-side">
          <div className="scanner-title"><span className="scanner-icon"><ScanSearch size={21} /></span><h3>Analyze a URL</h3></div>
          <p>Paste a full URL to check for common phishing signals.</p>
          <form onSubmit={submit}>
            <label className="url-label" htmlFor="url-input">Website URL</label>
            <div className="url-input-row">
              <input id="url-input" type="url" value={url} onChange={(e) => { setUrl(e.target.value); setCameraError(''); }} placeholder="https://example.com/login" required disabled={loading} />
              <button className="primary-button" type="submit" disabled={loading || !url.trim()}>
                {loading ? 'Analyzing…' : <>Analyze <ArrowRight size={17} /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="scanner-footnote"><span>✓ URL checks only</span><span>✓ Does not open the scanned page</span><span>✓ Scan history saved to SQLite</span></div>
    </section>
  );
}

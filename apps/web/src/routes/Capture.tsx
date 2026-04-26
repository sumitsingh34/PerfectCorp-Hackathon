import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, RefreshCw, ArrowRight } from "lucide-react";
import FaceGuide from "@/components/FaceGuide";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { sha256 } from "@/lib/cache";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export default function Capture() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSelfie = useSession((s) => s.setSelfie);

  // Start (or restart) the camera whenever we're in live mode (no preview yet).
  // When the user taps Retake, `preview` flips back to null and this effect
  // re-runs, getting a fresh stream and re-binding it to the (newly mounted)
  // <video> element.
  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    let local: MediaStream | null = null;
    (async () => {
      try {
        local = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1600 } },
          audio: false,
        });
        if (cancelled) { local.getTracks().forEach((t) => t.stop()); return; }
        setStream(local);
        if (videoRef.current) videoRef.current.srcObject = local;
      } catch {
        // Camera unavailable — file picker fallback only.
      }
    })();
    return () => {
      cancelled = true;
      local?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [preview]);

  async function snap() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the snapshot so the photo matches what the user saw.
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return;
    await commit(blob);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await commit(f);
  }

  async function commit(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const buf = await blob.arrayBuffer();
      const hash = await sha256(buf);
      const base64 = await blobToBase64(blob);
      const url = URL.createObjectURL(blob);
      const { width, height } = await imageDimensions(url);
      if (Math.min(width, height) < 480) {
        setError("This image is a bit small. Try a higher-resolution selfie for accurate analysis.");
      }
      setPreview(url);
      setSelfie({
        previewUrl: url,
        hash,
        base64,
        contentType: blob.type || "image/jpeg",
        width, height,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that image.");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setPreview(null);
    setError(null);
    useSession.getState().setSelfie(null);
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/" />
        <h2 className="display text-3xl">Snap a selfie</h2>
      </div>
      <p className="text-sm text-white/80">
        Look straight on, soft front lighting, no glasses if possible.
      </p>

      <div className="mt-5 relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-ink-900 shadow-soft">
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted
                   className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]" />
            <FaceGuide />
          </>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-glow-300">{error}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {preview ? (
          <>
            <button onClick={retry} className="btn-ghost">
              <RefreshCw className="h-4 w-4" /> Retake
            </button>
            <button onClick={() => nav("/analyzing")} className="btn-primary" disabled={busy}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              <Upload className="h-4 w-4" /> Upload
            </button>
            <button onClick={snap} className="btn-primary" disabled={!stream}>
              <Camera className="h-4 w-4" /> Snap
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pick} />
          </>
        )}
      </div>
    </section>
  );
}

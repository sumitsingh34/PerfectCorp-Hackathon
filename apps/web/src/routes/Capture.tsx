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

type Box = { x: number; y: number; width: number; height: number };

// deno-lint-ignore no-explicit-any
type FaceDetectorCtor = new (opts?: { fastMode?: boolean }) => {
  detect: (src: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

async function detectFaceBox(source: HTMLCanvasElement | HTMLImageElement): Promise<Box | null> {
  // deno-lint-ignore no-explicit-any
  const Ctor = (globalThis as any).FaceDetector as FaceDetectorCtor | undefined;
  if (!Ctor) return null;
  try {
    const det = new Ctor({ fastMode: true });
    const faces = await det.detect(source);
    if (!faces.length) return null;
    // Pick the largest face if multiple.
    const f = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b,
    );
    return { x: f.boundingBox.x, y: f.boundingBox.y, width: f.boundingBox.width, height: f.boundingBox.height };
  } catch {
    return null;
  }
}

/**
 * YouCam's `error_src_face_too_small` triggers when the detected face
 * occupies less than ~25% of the image's shorter side. This recrops so
 * the face fills the upload, regardless of camera framing.
 */
async function cropForUpload(srcCanvas: HTMLCanvasElement): Promise<Blob> {
  const { width: W, height: H } = srcCanvas;
  const face = await detectFaceBox(srcCanvas);

  let cropX: number, cropY: number, cropW: number, cropH: number;
  if (face) {
    // Pad ~80% of the face box on each side to keep some context (hair, neck).
    const pad = Math.max(face.width, face.height) * 0.8;
    cropX = Math.max(0, face.x - pad);
    cropY = Math.max(0, face.y - pad);
    const x2 = Math.min(W, face.x + face.width + pad);
    const y2 = Math.min(H, face.y + face.height + pad);
    cropW = x2 - cropX;
    cropH = y2 - cropY;
  } else {
    // Center-crop matching the FaceGuide oval's footprint.
    cropW = W * 0.65;
    cropH = H * 0.80;
    cropX = (W - cropW) / 2;
    cropY = (H - cropH) * 0.42; // ellipse sits slightly above center
  }

  // YouCam rejects too-small images (`error_below_min_image_size`) and we
  // also don't want to ship enormous payloads. Upscale to clear the floor,
  // then clamp to the ceiling.
  const MIN_EDGE = 1024;
  const MAX_EDGE = 1600;
  let scale = 1;
  const shortIn = Math.min(cropW, cropH);
  const longIn = Math.max(cropW, cropH);
  if (shortIn * scale < MIN_EDGE) scale = MIN_EDGE / shortIn;
  if (longIn * scale > MAX_EDGE) scale = MAX_EDGE / longIn;
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  return await new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      0.92,
    ),
  );
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image decode failed"));
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")?.drawImage(img, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
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
    const cropped = await cropForUpload(canvas);
    await commit(cropped);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Run the same face-aware crop on uploaded files so YouCam's
    // `error_src_face_too_small` doesn't trip on landscape/group photos.
    try {
      const c = await blobToCanvas(f);
      const cropped = await cropForUpload(c);
      await commit(cropped);
    } catch {
      await commit(f);
    }
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

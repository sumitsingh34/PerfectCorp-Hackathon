import { useEffect, useRef, useState } from "react";

export type FaceCheckLevel = "off" | "bad" | "warn" | "good";

export type FaceCheck = {
  /** True if the browser supports the FaceDetector API. */
  hasDetector: boolean;
  /** Stoplight color for the ring. */
  level: FaceCheckLevel;
  /** Short message shown to the user above the camera. */
  hint: string;
  /** True only when every check passes — used to gate the Snap button. */
  ok: boolean;
};

// deno-lint-ignore no-explicit-any
type FaceDetectorCtor = new (opts?: { fastMode?: boolean }) => {
  detect: (src: CanvasImageSource) => Promise<
    Array<{
      boundingBox: DOMRectReadOnly;
      landmarks?: Array<{ type: string; locations: Array<{ x: number; y: number }> }>;
    }>
  >;
};

/**
 * Polls the video element with FaceDetector and returns live framing feedback.
 * Falls back gracefully when the API isn't available (Safari / Firefox) — the
 * caller can still take the photo, the cropping pass will do its best.
 */
export function useLiveFaceCheck(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
): FaceCheck {
  const [check, setCheck] = useState<FaceCheck>({
    hasDetector: true,
    level: "off",
    hint: "Looking for your face…",
    ok: false,
  });
  const detectorRef = useRef<InstanceType<FaceDetectorCtor> | null>(null);

  useEffect(() => {
    // deno-lint-ignore no-explicit-any
    const Ctor = (globalThis as any).FaceDetector as FaceDetectorCtor | undefined;
    if (!Ctor) {
      setCheck({
        hasDetector: false,
        level: "off",
        hint: "Fill the oval with your face, look straight ahead.",
        ok: true,
      });
      return;
    }
    if (!active) return;

    detectorRef.current ??= new Ctor({ fastMode: true });

    let disposed = false;
    let timer: number | null = null;

    const tick = async () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) {
        timer = window.setTimeout(tick, 250);
        return;
      }
      try {
        const faces = await detectorRef.current!.detect(v);
        if (disposed) return;
        const W = v.videoWidth;
        const H = v.videoHeight;
        if (!faces.length) {
          setCheck({ hasDetector: true, level: "bad", hint: "We can't see your face yet.", ok: false });
        } else {
          const f = faces.reduce((a, b) =>
            a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b,
          );
          const bb = f.boundingBox;
          const cx = bb.x + bb.width / 2;
          const cy = bb.y + bb.height / 2;
          const shortSide = Math.min(W, H);
          const faceShortFrac = Math.min(bb.width, bb.height) / shortSide;
          const dxFromCenter = Math.abs(cx - W / 2) / W;
          // FaceGuide oval sits slightly above center (~45% of frame height).
          const dyFromGuideCenter = Math.abs(cy - H * 0.45) / H;

          // Yaw heuristic from eye landmarks when present.
          let yawHint = "";
          const eyeMarks =
            f.landmarks?.flatMap((l) =>
              l.type === "eye" ? l.locations : [],
            ) ?? [];
          if (eyeMarks.length >= 2) {
            const eyeDist = Math.hypot(
              eyeMarks[0].x - eyeMarks[1].x,
              eyeMarks[0].y - eyeMarks[1].y,
            );
            // Frontal face: eye distance ~38–55% of face width. Below that → turned.
            if (eyeDist / bb.width < 0.32) yawHint = "Look straight at the camera.";
          }

          // Build status from worst-failing check.
          let level: FaceCheckLevel = "good";
          let hint = "Looking great — tap Snap.";
          let ok = true;

          if (faceShortFrac < 0.20) {
            level = "bad";
            hint = "Move closer — your face is a bit small.";
            ok = false;
          } else if (faceShortFrac < 0.28) {
            level = "warn";
            hint = "A little closer.";
            ok = false;
          } else if (faceShortFrac > 0.75) {
            level = "warn";
            hint = "Step back a touch.";
            ok = false;
          } else if (dxFromCenter > 0.18) {
            level = "warn";
            hint = "Center your face in the oval.";
            ok = false;
          } else if (dyFromGuideCenter > 0.18) {
            // Face above guide → raise phone (so face moves down in frame).
            // Face below guide → lower phone.
            level = "warn";
            hint = cy < H * 0.45 ? "Raise your phone a bit." : "Lower your phone a bit.";
            ok = false;
          } else if (yawHint) {
            level = "warn";
            hint = yawHint;
            ok = false;
          }

          setCheck({ hasDetector: true, level, hint, ok });
        }
      } catch {
        // Ignore detection blips; try again on the next tick.
      }
      timer = window.setTimeout(tick, 220);
    };

    tick();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [videoRef, active]);

  return check;
}

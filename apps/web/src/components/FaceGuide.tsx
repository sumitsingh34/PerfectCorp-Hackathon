/** Decorative circular face-guide overlay shown over the camera feed. */
export default function FaceGuide() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 300 400" className="h-[78%] w-auto opacity-70">
        <defs>
          <radialGradient id="g" cx="50%" cy="40%" r="55%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(11,7,16,0.85)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="300" height="400" fill="url(#g)" />
        <ellipse cx="150" cy="180" rx="86" ry="116" fill="none" stroke="white" strokeOpacity="0.55" strokeDasharray="6 8" strokeWidth="2" />
      </svg>
    </div>
  );
}

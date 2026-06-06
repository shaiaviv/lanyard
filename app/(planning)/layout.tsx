export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  // Planning is the DESKTOP experience — full-width (unlike the mobile-width Field screens).
  // A generous max keeps line lengths sane on ultra-wide monitors without narrow gutters.
  return (
    <div className="min-h-screen bg-surface" style={{ background: '#0C1220' }}>
      <div className="w-full max-w-[1600px] mx-auto min-h-screen">{children}</div>
    </div>
  );
}

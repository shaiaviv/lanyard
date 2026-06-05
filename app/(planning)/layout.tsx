export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base" style={{ background: '#07090F' }}>
      <div className="max-w-[960px] mx-auto min-h-screen bg-surface" style={{ background: '#0C1220' }}>
        {children}
      </div>
    </div>
  );
}

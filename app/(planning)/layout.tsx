export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-[960px] mx-auto min-h-screen bg-white">
        {children}
      </div>
    </div>
  );
}

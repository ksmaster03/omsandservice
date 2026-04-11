export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy text-white p-6">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-brand-lg bg-brand-red font-display font-black text-2xl mb-4">
          NBA
        </div>
        <h1 className="font-display font-black text-2xl mb-2">Customer PWA</h1>
        <p className="text-sm text-white/70 mb-4">แอปลูกค้า NBA Sport — แจ้งซ่อม, ดูประกัน, ต่อประกัน</p>
        <div className="bg-white/10 rounded-brand p-4 text-xs text-white/80 text-left">
          <div className="font-bold text-brand-gold mb-2">Sprint 5+ milestones</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>LINE Login + Home + Equipment list</li>
            <li>Ticket create + map picker + photo/video</li>
            <li>Tracking timeline + rating</li>
            <li>Warranty + PM + notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

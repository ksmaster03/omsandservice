export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-brand-lg bg-brand-gold text-brand-navy font-display font-black text-2xl mb-4">
          <span className="material-symbols-outlined !text-3xl">build</span>
        </div>
        <h1 className="font-display font-black text-2xl mb-2">Tech App</h1>
        <p className="text-sm text-white/70 mb-4">แอปสำหรับช่าง NBA Sport — รับงาน, GPS, อัพเดตสถานะ</p>
        <div className="bg-white/10 rounded-brand p-4 text-xs text-white/80 text-left">
          <div className="font-bold text-brand-gold mb-2">Sprint 7+ milestones</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Tech login + รับงาน</li>
            <li>GPS ping ทุก 30 วินาที</li>
            <li>Stage update (en_route → arrived → repairing → closed)</li>
            <li>Google Maps deep link นำทาง</li>
            <li>Photo upload + complete form</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

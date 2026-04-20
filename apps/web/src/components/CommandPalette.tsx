import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useAuth } from '../store/auth';

type CommandItem = {
  label: string;
  keywords?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  group: string;
  adminOnly?: boolean;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (path: string) => () => {
    navigate(path);
    setOpen(false);
  };

  const commands: CommandItem[] = [
    // ── Navigation
    { label: 'Dashboard', keywords: 'home หน้าหลัก', icon: 'dashboard', action: go('/'), group: 'นำทาง' },
    { label: 'Sales Pipeline', keywords: 'leads คัดกรอง', icon: 'filter_alt', action: go('/leads'), group: 'นำทาง' },
    { label: 'Demos', keywords: 'demo เดโม่', icon: 'event', action: go('/demos'), group: 'นำทาง' },
    { label: 'Quotations', keywords: 'quote ใบเสนอราคา', icon: 'request_quote', action: go('/quotations'), group: 'นำทาง' },
    { label: 'Sales Orders', keywords: 'order ขาย', icon: 'receipt_long', action: go('/sales-orders'), group: 'นำทาง' },
    { label: 'Installations', keywords: 'ติดตั้ง', icon: 'local_shipping', action: go('/installations'), group: 'นำทาง' },
    { label: 'Customer Assets', keywords: 'asset เครื่อง', icon: 'inventory_2', action: go('/customer-assets'), group: 'นำทาง' },
    { label: 'PM Schedules', keywords: 'pm บำรุงรักษา', icon: 'build', action: go('/pm-schedules'), group: 'นำทาง' },
    { label: 'Service Tickets', keywords: 'ticket แจ้งซ่อม', icon: 'confirmation_number', action: go('/tickets'), group: 'นำทาง' },
    { label: 'Renewals', keywords: 'ต่ออายุ warranty', icon: 'autorenew', action: go('/renewals'), group: 'นำทาง' },
    { label: 'RMA / Returns', keywords: 'คืน return', icon: 'assignment_return', action: go('/rmas'), group: 'นำทาง' },
    { label: 'Service Agreements', keywords: 'สัญญา', icon: 'handshake', action: go('/service-agreements'), group: 'นำทาง' },
    { label: 'Reports', keywords: 'รายงาน analytics', icon: 'analytics', action: go('/reports'), group: 'นำทาง' },
    { label: 'Stock', keywords: 'สต๊อก คลัง', icon: 'warehouse', action: go('/stock'), group: 'นำทาง' },
    { label: 'Feedback', keywords: 'แจ้งปัญหา', icon: 'feedback', action: go('/feedback'), group: 'นำทาง' },

    // ── Master data
    { label: 'Customers', keywords: 'ลูกค้า', icon: 'groups', action: go('/customers'), group: 'ข้อมูลหลัก' },
    { label: 'Products', keywords: 'สินค้า product', icon: 'fitness_center', action: go('/products'), group: 'ข้อมูลหลัก' },
    { label: 'Spare Parts', keywords: 'อะไหล่ spare', icon: 'settings_suggest', action: go('/spare-parts'), group: 'ข้อมูลหลัก' },

    // ── Admin
    { label: 'WMS Integration', icon: 'hub', action: go('/wms'), group: 'ระบบ', adminOnly: true },
    { label: 'Users', keywords: 'user ผู้ใช้', icon: 'manage_accounts', action: go('/users'), group: 'ระบบ', adminOnly: true },
    { label: 'Settings', keywords: 'ตั้งค่า config', icon: 'settings', action: go('/settings'), group: 'ระบบ', adminOnly: true },

    // ── Actions
    { label: 'Log out', keywords: 'ออกจากระบบ signout', icon: 'logout', action: () => { setOpen(false); logout(); navigate('/login'); }, group: 'การกระทำ' },
  ];

  const visible = commands.filter((c) => !c.adminOnly || isAdmin);
  const grouped = visible.reduce<Record<string, CommandItem[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Command menu"
        shouldFilter
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-brand-lg shadow-brand-lg border border-gray-200 overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-3">
          <span className="material-symbols-outlined !text-[20px] text-gray-600" aria-hidden="true">search</span>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="ค้นหาหน้า / คำสั่ง..."
            className="flex-1 py-3 text-sm outline-none placeholder:text-gray-600"
          />
          <kbd className="text-[10px] font-mono text-gray-600 border border-gray-300 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <Command.List className="max-h-[360px] overflow-y-auto p-1">
          <Command.Empty className="py-8 text-center text-sm text-gray-700">
            ไม่พบคำสั่ง
          </Command.Empty>
          {Object.entries(grouped).map(([group, items]) => (
            <Command.Group key={group} heading={group} className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-2 py-1.5">
              {items.map((item) => (
                <Command.Item
                  key={item.label}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={item.action}
                  className="flex items-center gap-2 px-2 py-2 rounded-brand cursor-pointer text-sm text-gray-900 aria-selected:bg-brand-red/10 aria-selected:text-brand-red"
                >
                  <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-3 py-2 text-[11px] text-gray-600">
          <div className="flex items-center gap-2">
            <kbd className="font-mono border border-gray-300 rounded px-1.5 py-0.5">↑↓</kbd>
            <span>นำทาง</span>
            <kbd className="font-mono border border-gray-300 rounded px-1.5 py-0.5">↵</kbd>
            <span>เลือก</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="font-mono border border-gray-300 rounded px-1.5 py-0.5">Cmd</kbd>
            <span>+</span>
            <kbd className="font-mono border border-gray-300 rounded px-1.5 py-0.5">K</kbd>
            <span className="ml-1">เปิด</span>
          </div>
        </div>
      </Command>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import LanguageSwitcher from './LanguageSwitcher';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import api from '../lib/api';

const navItems: Array<{
  to: string;
  labelKey: string;
  icon: string;
  sectionKey: string;
  adminOnly?: boolean;
}> = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'dashboard', sectionKey: 'nav.sectionOverview' },
  { to: '/leads', labelKey: 'nav.salesPipeline', icon: 'filter_alt', sectionKey: 'nav.sectionSales' },
  { to: '/demos', labelKey: 'nav.demos', icon: 'event', sectionKey: 'nav.sectionSales' },
  { to: '/quotations', labelKey: 'nav.quotations', icon: 'request_quote', sectionKey: 'nav.sectionSales' },
  { to: '/sales-orders', labelKey: 'nav.salesOrders', icon: 'receipt_long', sectionKey: 'nav.sectionSales' },
  { to: '/stock', labelKey: 'nav.stock', icon: 'warehouse', sectionKey: 'nav.sectionSales' },
  { to: '/installations', labelKey: 'nav.installations', icon: 'local_shipping', sectionKey: 'nav.sectionAfterSales' },
  { to: '/customer-assets', labelKey: 'nav.assets', icon: 'inventory_2', sectionKey: 'nav.sectionAfterSales' },
  { to: '/pm-schedules', labelKey: 'nav.pmSchedules', icon: 'build', sectionKey: 'nav.sectionAfterSales' },
  { to: '/tickets', labelKey: 'nav.tickets', icon: 'confirmation_number', sectionKey: 'nav.sectionAfterSales' },
  { to: '/renewals', labelKey: 'nav.renewals', icon: 'autorenew', sectionKey: 'nav.sectionAfterSales' },
  { to: '/rmas', labelKey: 'nav.rmas', icon: 'assignment_return', sectionKey: 'nav.sectionAfterSales' },
  { to: '/service-agreements', labelKey: 'nav.serviceAgreements', icon: 'handshake', sectionKey: 'nav.sectionAfterSales' },
  { to: '/reports', labelKey: 'nav.reports', icon: 'analytics', sectionKey: 'nav.sectionInsights' },
  { to: '/customers', labelKey: 'nav.customers', icon: 'groups', sectionKey: 'nav.sectionMasterData' },
  { to: '/products', labelKey: 'nav.products', icon: 'fitness_center', sectionKey: 'nav.sectionMasterData' },
  { to: '/spare-parts', labelKey: 'nav.spareParts', icon: 'settings_suggest', sectionKey: 'nav.sectionMasterData' },
  { to: '/wms', labelKey: 'nav.wmsIntegration', icon: 'hub', sectionKey: 'nav.sectionSystem', adminOnly: true },
  { to: '/users', labelKey: 'nav.users', icon: 'manage_accounts', sectionKey: 'nav.sectionSystem', adminOnly: true },
  { to: '/feedback', labelKey: 'nav.feedback', icon: 'feedback', sectionKey: 'nav.sectionSystem' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings', sectionKey: 'nav.sectionSystem', adminOnly: true },
];

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  // Close profile dropdown on ESC
  useEffect(() => {
    if (!profileDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileDropdown(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [profileDropdown]);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    phone: '',
    email: user?.email ?? '',
    newPassword: '',
  });
  const [profileError, setProfileError] = useState<string | null>(null);

  const profileMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (profileForm.name && profileForm.name !== user?.name) payload.name = profileForm.name;
      if (profileForm.phone) payload.phone = profileForm.phone;
      if (profileForm.newPassword) payload.password = profileForm.newPassword;
      if (Object.keys(payload).length === 0) return;
      await api.patch('/auth/me', payload);
    },
    onSuccess: () => {
      setProfileOpen(false);
      setProfileError(null);
      if (profileForm.name) {
        // Optimistic update display name
        useAuth.setState((s) => ({
          user: s.user ? { ...s.user, name: profileForm.name } : null,
        }));
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? t('customers.updateFailed');
      setProfileError(msg);
    },
  });

  function openProfileEdit() {
    setProfileForm({
      name: user?.name ?? '',
      phone: '',
      email: user?.email ?? '',
      newPassword: '',
    });
    setProfileError(null);
    setProfileDropdown(false);
    setProfileOpen(true);
  }

  // Close drawer when route changes
  const handleNavClick = () => setMobileOpen(false);

  const groupedNav = navItems
    .filter((item) => !item.adminOnly || isAdmin)
    .reduce<Record<string, typeof navItems>>((acc, item) => {
      const section = t(item.sectionKey);
      (acc[section] ??= []).push(item);
      return acc;
    }, {});

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-brand-lg bg-brand-red text-white flex items-center justify-center font-display font-black text-sm">
            TT
          </div>
          <div>
            <div className="font-display font-black text-sm text-gray-900">TOPTIER</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-wider">Order & Service Mgmt</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {Object.entries(groupedNav).map(([section, items]) => (
          <div key={section} className="mb-1">
            <div className="px-4 py-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              {section}
            </div>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-brand text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-red/10 text-brand-red'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className={`material-symbols-outlined !text-[22px]`} aria-hidden="true">
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3 text-[10px] text-gray-600">
        Toptier OSM
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar (≥ lg) */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay + drawer (< lg) */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
      >
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar: mobile = hamburger + NBA logo; all = user profile right */}
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Left: hamburger (mobile only) + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-1.5 -ml-1.5 rounded hover:bg-gray-100"
            >
              <span className="material-symbols-outlined !text-[24px] text-gray-700" aria-hidden="true">
                menu
              </span>
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-brand bg-brand-red flex items-center justify-center font-display font-black text-[10px] text-white">
                TT
              </div>
              <div className="font-display font-black text-sm text-gray-900">TOPTIER</div>
            </div>
          </div>

          {/* Right: language + user profile */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdown((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileDropdown}
              aria-label={`Profile menu ${user?.name ?? ''}`}
              className="flex items-center gap-2 px-2 py-1.5 min-h-[40px] rounded-brand hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            >
              <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0] ?? '?'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-gray-900">{user?.name}</div>
                <div className="text-[10px] text-gray-600">{user?.role}</div>
              </div>
              <span className="material-symbols-outlined !text-[16px] text-gray-600" aria-hidden="true">expand_more</span>
            </button>

            {/* Dropdown */}
            {profileDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileDropdown(false)} />
                <div role="menu" aria-label="Profile menu" className="absolute right-0 top-full mt-1 w-48 bg-white rounded-brand-lg shadow-brand-lg border border-gray-200 z-40 py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openProfileEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">edit</span>
                    {t('common.edit')} Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdown(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-red hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">logout</span>
                    {t('auth.logout')}
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Profile edit modal */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={`${t('common.edit')} Profile`}
        footer={
          <>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => profileMut.mutate()}
              disabled={profileMut.isPending}
            >
              {profileMut.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      >
        <div className="text-xs text-gray-700 mb-3 bg-gray-50 rounded-brand p-2">
          {user?.email} · {user?.role}
        </div>
        <Input
          id="pf-name"
          label={t('common.name')}
          value={profileForm.name}
          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
        />
        <Input
          id="pf-phone"
          label={t('common.phone')}
          value={profileForm.phone}
          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
          placeholder="08xxxxxxxx"
        />
        <Input
          id="pf-pw"
          label="New password (leave blank to keep current)"
          type="password"
          value={profileForm.newPassword}
          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
        />
        {profileError && (
          <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2 mt-2">{profileError}</div>
        )}
      </Modal>
    </div>
  );
}

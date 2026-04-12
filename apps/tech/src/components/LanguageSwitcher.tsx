import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith('en') ? 'en' : 'th';

  function set(lang: 'th' | 'en') {
    void i18n.changeLanguage(lang);
  }

  const base = 'px-2 py-0.5 rounded text-[10px] font-bold';
  const activeCls = dark ? 'bg-white/30 text-white' : 'bg-brand-navy text-white';
  const inactiveCls = dark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-brand-navy';

  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={() => set('th')} className={`${base} ${current === 'th' ? activeCls : inactiveCls}`}>
        TH
      </button>
      <button onClick={() => set('en')} className={`${base} ${current === 'en' ? activeCls : inactiveCls}`}>
        EN
      </button>
    </div>
  );
}

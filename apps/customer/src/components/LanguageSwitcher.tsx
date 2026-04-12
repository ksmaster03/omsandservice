import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith('en') ? 'en' : 'th';

  const baseStyle = dark
    ? 'bg-white/10 text-white/70 hover:bg-white/20'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  const activeStyle = dark ? 'bg-white text-brand-navy' : 'bg-brand-navy text-white';

  return (
    <div className="inline-flex rounded-brand overflow-hidden text-[11px] font-bold">
      <button
        onClick={() => void i18n.changeLanguage('th')}
        className={`px-2.5 py-1 ${current === 'th' ? activeStyle : baseStyle}`}
      >
        TH
      </button>
      <button
        onClick={() => void i18n.changeLanguage('en')}
        className={`px-2.5 py-1 ${current === 'en' ? activeStyle : baseStyle}`}
      >
        EN
      </button>
    </div>
  );
}

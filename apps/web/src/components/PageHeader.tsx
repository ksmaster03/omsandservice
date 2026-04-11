interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between px-6 py-5 bg-white border-b border-gray-200">
      <div>
        <h1 className="font-display font-black text-xl text-brand-navy">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

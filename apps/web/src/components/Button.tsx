import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'red' | 'navy' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const sizeClass = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
};

const variantClass = {
  red: 'bg-brand-red text-white hover:bg-brand-red-dark',
  navy: 'bg-brand-navy text-white hover:bg-brand-navy2',
  outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

export default function Button({ variant = 'red', size = 'md', className, ...rest }: Props) {
  return (
    <button
      className={twMerge(clsx(base, sizeClass[size], variantClass[variant], className))}
      {...rest}
    />
  );
}

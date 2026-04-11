import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, id, ...rest }, ref) => {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full px-3 py-2 border rounded-brand text-sm focus:outline-none ${
          error
            ? 'border-brand-red focus:border-brand-red'
            : 'border-gray-300 focus:border-brand-navy'
        }`}
        {...rest}
      />
      {error && <div className="text-[11px] text-brand-red mt-1">{error}</div>}
    </div>
  );
});
Input.displayName = 'Input';

export default Input;

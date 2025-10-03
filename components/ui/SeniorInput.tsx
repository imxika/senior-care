import { InputHTMLAttributes, forwardRef } from 'react';

interface SeniorInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const SeniorInput = forwardRef<HTMLInputElement, SeniorInputProps>(
  ({
    label,
    error,
    helperText,
    fullWidth = true,
    className = '',
    ...props
  }, ref) => {
    const baseInputStyles = 'rounded-xl border-2 px-6 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const textStyles = 'text-[var(--font-size-senior-base)] font-medium';
    const focusStyles = 'focus:outline-none focus:ring-4 focus:ring-[var(--senior-primary)] focus:ring-opacity-30';

    const borderStyles = error
      ? 'border-[var(--senior-danger)] focus:border-[var(--senior-danger)]'
      : 'border-gray-300 focus:border-[var(--senior-primary)]';

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthStyle} ${className}`}>
        {label && (
          <label className="block mb-2 text-[var(--font-size-senior-base)] font-bold text-gray-700">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={`${baseInputStyles} ${textStyles} ${focusStyles} ${borderStyles} ${widthStyle}`}
          {...props}
        />

        {error && (
          <p className="mt-2 text-[var(--font-size-senior-sm)] text-[var(--senior-danger)] font-medium">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-2 text-[var(--font-size-senior-sm)] text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

SeniorInput.displayName = 'SeniorInput';

export default SeniorInput;

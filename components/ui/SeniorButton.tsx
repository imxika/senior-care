import { ButtonHTMLAttributes, forwardRef } from 'react';

interface SeniorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'base' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  fullWidth?: boolean;
}

const SeniorButton = forwardRef<HTMLButtonElement, SeniorButtonProps>(
  ({
    children,
    size = 'base',
    variant = 'primary',
    fullWidth = false,
    className = '',
    ...props
  }, ref) => {
    const baseStyles = 'font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'min-h-[var(--size-senior-btn-sm)] text-[var(--font-size-senior-sm)] px-6',
      base: 'min-h-[var(--size-senior-btn-base)] text-[var(--font-size-senior-base)] px-8',
      lg: 'min-h-[var(--size-senior-btn-lg)] text-[var(--font-size-senior-lg)] px-10',
    };

    const variantStyles = {
      primary: 'bg-[var(--senior-primary)] hover:bg-[#3A7BC8] text-white',
      success: 'bg-[var(--senior-success)] hover:bg-[#6DB31A] text-white',
      warning: 'bg-[var(--senior-warning)] hover:bg-[#E59512] text-white',
      danger: 'bg-[var(--senior-danger)] hover:bg-[#B00116] text-white',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

SeniorButton.displayName = 'SeniorButton';

export default SeniorButton;

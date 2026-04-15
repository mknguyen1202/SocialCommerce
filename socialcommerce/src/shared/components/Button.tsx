import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-brand-primary)',
    color: '#fff',
    border: '1px solid var(--color-brand-primary)',
  },
  secondary: {
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#fff',
    border: '1px solid var(--color-danger)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 'var(--font-size-sm)', borderRadius: 'var(--radius-md)' },
  md: { height: 36, padding: '0 14px', fontSize: 'var(--font-size-base)', borderRadius: 'var(--radius-lg)' },
  lg: { height: 44, padding: '0 18px', fontSize: 'var(--font-size-md)', borderRadius: 'var(--radius-lg)' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  style,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  ...rest
}) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
    }
    onMouseDown?.(e);
  };
  const resetPress = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.transform = '';
    onMouseUp?.(e as React.MouseEvent<HTMLButtonElement>);
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.transform = '';
    onMouseLeave?.(e);
  };

  return (
    <button
      disabled={disabled || isLoading}
      onMouseDown={handleMouseDown}
      onMouseUp={resetPress}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
        fontFamily: 'inherit',
        border: 'none',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast)',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {isLoading ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

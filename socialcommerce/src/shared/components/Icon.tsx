import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface IconProps {
  /** A lucide-react icon component (e.g. `Bell`, `Menu`) */
  icon: LucideIcon;
  /** Pixel size for width and height. Default: 18 */
  size?: number;
  /** SVG stroke width. Default: 1.75 — matches GitHub/Reddit line weight */
  strokeWidth?: number;
  /** Icon color; defaults to `currentColor` so it inherits from parent. */
  color?: string;
  /** When provided, renders `role="img"` + `aria-label`. Omit for decorative icons (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Thin, a11y-aware wrapper around lucide-react icons.
 * Enforces consistent stroke width and sizing across the app.
 * Use the `iconRegistry` barrel for icon references instead of importing
 * directly from lucide-react so swaps stay grep-able.
 */
export const Icon: React.FC<IconProps> = ({
  icon: LucideComponent,
  size = 18,
  strokeWidth = 1.75,
  color = 'currentColor',
  label,
  className,
  style,
}) => {
  if (label) {
    return (
      <LucideComponent
        role="img"
        aria-label={label}
        width={size}
        height={size}
        strokeWidth={strokeWidth}
        color={color}
        className={className}
        style={style}
      />
    );
  }

  return (
    <LucideComponent
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={style}
    />
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  label: string;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  label,
  children,
  placement = 'right',
  delay = 400,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!targetRef.current) return;
      const rect = targetRef.current.getBoundingClientRect();
      const gap = 8;
      let top = 0;
      let left = 0;
      if (placement === 'right') { top = rect.top + rect.height / 2; left = rect.right + gap; }
      if (placement === 'left')  { top = rect.top + rect.height / 2; left = rect.left - gap; }
      if (placement === 'top')   { top = rect.top - gap; left = rect.left + rect.width / 2; }
      if (placement === 'bottom'){ top = rect.bottom + gap; left = rect.left + rect.width / 2; }
      setCoords({ top, left });
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const transformMap: Record<TooltipPlacement, string> = {
    right:  'translateY(-50%)',
    left:   'translateY(-50%) translateX(-100%)',
    top:    'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
  };

  return (
    <>
      {React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>, {
        ref: (el: HTMLElement | null) => { targetRef.current = el; },
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })}
      {visible &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: transformMap[placement],
              zIndex: 'var(--z-tooltip)' as unknown as number,
              background: 'var(--color-surface-0)',
              color: 'var(--color-text-primary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
};

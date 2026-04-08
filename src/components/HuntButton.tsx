import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type HuntButtonTone =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'disabled';

export type HuntButtonSize = 'small' | 'medium' | 'large' | 'pill';
export type HuntButtonIconPosition = 'leading' | 'trailing';

export type HuntButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> & {
  icon?: ReactNode;
  iconPosition?: HuntButtonIconPosition;
  size?: HuntButtonSize;
  tone?: HuntButtonTone;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SIZE_CLASSES: Record<HuntButtonSize, string> = {
  small: 'gap-[6px] rounded-[20px] px-[14px] py-[10px] text-[14px]',
  medium: 'gap-[8px] rounded-[20px] px-[18px] py-[12px] text-[16px]',
  large: 'h-[44px] gap-[10px] rounded-[40px] px-[18px] py-[12px] text-[20px]',
  pill: 'h-10 w-10 rounded-[20px] p-3 text-[14px]',
};

const TONE_CLASSES: Record<HuntButtonTone, string> = {
  primary:
    'bg-hunt-blueInk text-white hover:bg-hunt-blueInkHover focus:bg-hunt-blueInkHover',
  secondary:
    'bg-hunt-blueStrong text-hunt-text hover:bg-hunt-blue focus:bg-hunt-blue',
  destructive:
    'bg-hunt-destructive text-white hover:bg-hunt-destructiveHover focus:bg-hunt-destructiveHover',
  disabled: 'bg-hunt-shell text-hunt-border',
};

export function HuntButton({
  children,
  className,
  disabled,
  icon,
  iconPosition = 'trailing',
  size = 'small',
  tone = 'primary',
  type = 'button',
  ...props
}: HuntButtonProps) {
  const isDisabled = disabled || tone === 'disabled';
  const hasLabel =
    children !== undefined && children !== null && children !== '';
  const isIconOnly = size === 'pill' || !hasLabel;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold leading-none shadow-[0px_4px_4px_rgba(0,0,0,0.25)] transition-colors duration-150',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        isDisabled && 'cursor-not-allowed',
        !isDisabled &&
          'focus:outline-none focus:ring-2 focus:ring-hunt-blue/30',
        isIconOnly && 'gap-0',
        className,
      )}
      {...props}
    >
      {isIconOnly ? icon : null}
      {!isIconOnly && icon && iconPosition === 'leading' ? icon : null}
      {hasLabel ? <span className='whitespace-nowrap'>{children}</span> : null}
      {!isIconOnly && icon && iconPosition === 'trailing' ? icon : null}
    </button>
  );
}

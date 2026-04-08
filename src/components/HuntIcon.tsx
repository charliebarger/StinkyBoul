import type { HTMLAttributes } from 'react';

import AddIcon from './icons/add.svg?react';
import EditIcon from './icons/edit.svg?react';
import PauseIcon from './icons/pause.svg?react';
import PlayIcon from './icons/play.svg?react';
import SyncIcon from './icons/sync.svg?react';

export type HuntIconName = 'add' | 'pause' | 'play' | 'sync' | 'edit' | 'trash';

export type HuntIconTone =
  | 'inherit'
  | 'default'
  | 'secondary'
  | 'disabled'
  | 'destructive';

export type HuntIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: HuntIconName;
  size?: number;
  tone?: HuntIconTone;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function iconToneClass(tone: HuntIconTone) {
  switch (tone) {
    case 'default':
      return 'text-white';
    case 'secondary':
      return 'text-hunt-text';
    case 'disabled':
      return 'text-hunt-border';
    case 'destructive':
      return 'text-hunt-destructive';
    default:
      return '';
  }
}

function ImportedIcon({ name }: { name: HuntIconName }) {
  switch (name) {
    case 'add':
      return <AddIcon />;
    case 'pause':
      return <PauseIcon />;
    case 'play':
      return <PlayIcon />;
    case 'sync':
      return <SyncIcon />;
    case 'edit':
      return <EditIcon />;
    case 'trash':
      return null;
  }
}

export function HuntIcon({
  className,
  name,
  size = 16,
  tone = 'inherit',
  ...props
}: HuntIconProps) {
  return (
    <span
      aria-hidden='true'
      className={cx(
        'inline-flex shrink-0 items-center justify-center',
        iconToneClass(tone),
        className,
      )}
      style={{ height: size, width: size }}
      {...props}
    >
      {name === 'trash' ? (
        <svg
          viewBox='0 0 16 16'
          className='h-full w-full fill-none stroke-current stroke-[1.8]'
        >
          <path d='M6.9 4.9h4.2' strokeLinecap='round' />
          <path d='M4.7 6.6h6.6' strokeLinecap='round' />
          <path
            d='m5.3 6.6.4 5.4c.1.6.5 1 1.1 1h4.4c.6 0 1-.4 1.1-1l.4-5.4'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path d='M7.6 8.1v3.3m2.8-3.3v3.3' strokeLinecap='round' />
        </svg>
      ) : (
        <ImportedIcon name={name} />
      )}
    </span>
  );
}

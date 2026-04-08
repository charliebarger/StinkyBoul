import type { HTMLAttributes } from 'react';

import AddIcon from './icons/add.svg?react';
import DragHandleIcon from './icons/drag-handler.svg?react';
import EditIcon from './icons/edit.svg?react';
import PauseIcon from './icons/pause.svg?react';
import PlayIcon from './icons/play.svg?react';
import SyncIcon from './icons/sync.svg?react';
import TrashcanIcon from './icons/trashcan.svg?react';

export type HuntIconName =
  | 'add'
  | 'drag-handle'
  | 'pause'
  | 'play'
  | 'sync'
  | 'edit'
  | 'trash';

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

function usesCurrentColor(name: HuntIconName) {
  return name === 'drag-handle' || name === 'trash';
}

function iconToneClass(name: HuntIconName, tone: HuntIconTone) {
  if (usesCurrentColor(name)) {
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

  switch (tone) {
    case 'secondary':
      return 'brightness-0 saturate-100';
    case 'disabled':
      return 'brightness-0 saturate-100 opacity-35';
    default:
      return '';
  }
}

function ImportedIcon({ name }: { name: HuntIconName }) {
  switch (name) {
    case 'add':
      return <AddIcon />;
    case 'drag-handle':
      return <DragHandleIcon className='h-full w-full [&_path]:fill-current' />;
    case 'pause':
      return <PauseIcon />;
    case 'play':
      return <PlayIcon />;
    case 'sync':
      return <SyncIcon />;
    case 'edit':
      return <EditIcon />;
    case 'trash':
      return <TrashcanIcon className='h-full w-full [&_path]:fill-current' />;
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
        iconToneClass(name, tone),
        className,
      )}
      style={{ height: size, width: size }}
      {...props}
    >
      <ImportedIcon name={name} />
    </span>
  );
}

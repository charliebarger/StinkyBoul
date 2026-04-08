import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, HTMLAttributes } from 'react';

import { HuntIcon } from './HuntIcon';

type HuntCodeState =
  | 'default'
  | 'editing'
  | 'dragging'
  | 'success'
  | 'failure'
  | 'trying';

export type HuntCodeProps = HTMLAttributes<HTMLDivElement> & {
  state?: HuntCodeState;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  indexLabel?: string;
  desktopSegments?: readonly string[];
  mobileCode?: string;
  onCodeChange?: (nextValue: {
    desktopSegments: readonly string[];
    mobileCode: string;
  }) => void;
  onDelete?: () => void;
};

const DEFAULT_SEGMENTS = ['E', 'M', '012', 'O1', 'R'] as const;
const DEFAULT_SEGMENT_LENGTHS = DEFAULT_SEGMENTS.map(
  (segment) => segment.length,
);
const FULL_HUNT_CODE_LENGTH = DEFAULT_SEGMENT_LENGTHS.reduce(
  (total, segmentLength) => total + segmentLength,
  0,
);

const STATE_LABELS: Record<HuntCodeState, string> = {
  default: 'Default',
  editing: 'Editing',
  dragging: 'Dragging',
  success: 'Success',
  failure: 'Failure',
  trying: 'Trying',
};

const SURFACE_VARIANTS: Record<HuntCodeState, string> = {
  default: 'shadow-none',
  editing: 'shadow-hunt',
  dragging: 'shadow-hunt',
  success: 'shadow-none',
  failure: 'shadow-none',
  trying: 'shadow-hunt',
};

const LEFT_PANEL_VARIANTS: Record<HuntCodeState, string> = {
  default: 'bg-white',
  editing: 'bg-hunt-blue',
  dragging: 'bg-hunt-blue',
  success: 'bg-hunt-success',
  failure: 'bg-hunt-failure',
  trying: 'bg-hunt-blue',
};

const BODY_VARIANTS: Record<HuntCodeState, string> = {
  default: 'bg-white',
  editing: 'bg-white',
  dragging: 'bg-hunt-blue',
  success: 'bg-white',
  failure: 'bg-white',
  trying: 'bg-white',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function resolveDesktopSegmentValues(
  desktopSegments?: readonly string[],
  mobileCode?: string,
) {
  if (desktopSegments) {
    return DEFAULT_SEGMENT_LENGTHS.map((segmentLength, index) =>
      (desktopSegments[index] ?? '').slice(0, segmentLength),
    );
  }

  let cursor = 0;
  const source = mobileCode ?? '';

  return DEFAULT_SEGMENT_LENGTHS.map((segmentLength) => {
    const nextSegment = source.slice(cursor, cursor + segmentLength);
    cursor += segmentLength;
    return nextSegment;
  });
}

function flattenDesktopSegmentValues(segments: readonly string[]) {
  return segments.join('');
}

function sanitizeHuntCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase().slice(0, FULL_HUNT_CODE_LENGTH);
}

function splitHuntCodeIntoSegments(value: string) {
  const sanitizedValue = sanitizeHuntCode(value);
  let cursor = 0;

  return DEFAULT_SEGMENT_LENGTHS.map((segmentLength) => {
    const nextSegment = sanitizedValue.slice(cursor, cursor + segmentLength);
    cursor += segmentLength;
    return nextSegment;
  });
}

function InfoChip({
  label,
}: {
  label: string;
}) {
  return (
    <span
      aria-hidden='true'
      className='flex h-[25px] w-[25px] items-center justify-center rounded-full border border-hunt-blueInk bg-hunt-blueStrong text-[12px] font-bold leading-none text-hunt-blueInk'
    >
      {label}
    </span>
  );
}

function DragHandleGlyph({ dragging = false }: { dragging?: boolean }) {
  return (
    <span
      aria-label='Drag handle'
      className={cx(
        'inline-flex items-center justify-center rounded-[8px] px-[6px] py-[5px] transition-colors duration-150 group-hover/drag:bg-slate-100',
        dragging && 'bg-slate-200',
      )}
    >
      <HuntIcon
        className='text-slate-500'
        name='drag-handle'
        size={24}
      />
    </span>
  );
}

function StatusGlyph({
  indexLabel,
  state,
}: {
  indexLabel: string;
  state: HuntCodeState;
}) {
  if (state === 'success') {
    return (
      <span
        aria-label='Success status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center rounded-full bg-hunt-successInk text-white'
      >
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          className='h-4 w-4 fill-none stroke-current stroke-[2.75]'
        >
          <path
            d='M4.5 10.5 8 14l7.5-8'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
    );
  }

  if (state === 'failure') {
    return (
      <span
        aria-label='Failure status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center rounded-full bg-hunt-failureInk text-white'
      >
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          className='h-4 w-4 fill-none stroke-current stroke-[2.75]'
        >
          <path d='m5.5 5.5 9 9m0-9-9 9' strokeLinecap='round' />
        </svg>
      </span>
    );
  }

  if (state === 'trying') {
    return (
      <span
        aria-label='Trying status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center'
      >
        <span
          aria-hidden='true'
          className='h-[17px] w-[17px] rounded-full border-2 border-hunt-border border-r-hunt-blueInk border-t-hunt-blueInk animate-hunt-spin'
        />
      </span>
    );
  }

  if (state === 'editing' || state === 'dragging') {
    return <DragHandleGlyph dragging={state === 'dragging'} />;
  }

  return <InfoChip label={indexLabel} />;
}

function DeleteButton({
  onDelete,
  dragging = false,
}: {
  onDelete?: () => void;
  dragging?: boolean;
}) {
  return (
    <button
      type='button'
      aria-label='Delete hunt code'
      onClick={onDelete}
      className={cx(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center text-hunt-border transition-colors duration-150',
        'hover:text-hunt-failureInk focus:text-hunt-failureInk',
        'focus:outline-none focus:ring-2 focus:ring-hunt-failureInk/20',
        dragging && 'text-slate-500',
      )}
    >
      <HuntIcon className='text-current' name='trash' size={18} />
    </button>
  );
}

interface InputBoxProps {
  ariaLabel: string;
  maxLength: number;
  onChange?: (value: string) => void;
  inputRef?: (node: HTMLInputElement | null) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  value: string;
}

function InputBox({
  ariaLabel,
  inputRef,
  maxLength,
  onChange,
  onPaste,
  readOnly = false,
  value,
}: InputBoxProps) {
  return (
    <input
      ref={inputRef}
      type='text'
      maxLength={maxLength}
      aria-label={ariaLabel}
      autoComplete='off'
      readOnly={readOnly}
      spellCheck={false}
      tabIndex={readOnly ? -1 : undefined}
      className={cx(
        'h-[34px] w-full min-w-0 appearance-none rounded-[6px] border border-hunt-border bg-hunt-panel px-[4px] text-center text-[14px] font-medium leading-[1.1] text-hunt-text outline-none',
        !readOnly &&
          'focus:border-hunt-blueInk focus:ring-2 focus:ring-hunt-blue/70',
        readOnly && 'pointer-events-none cursor-default select-none',
      )}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      onPaste={onPaste}
    />
  );
}

function FullInputBox({
  onChange,
  readOnly = false,
  value,
}: {
  onChange?: (value: string) => void;
  readOnly?: boolean;
  value: string;
}) {
  return (
    <input
      type='text'
      maxLength={FULL_HUNT_CODE_LENGTH}
      aria-label='Hunt code'
      autoComplete='off'
      readOnly={readOnly}
      spellCheck={false}
      tabIndex={readOnly ? -1 : undefined}
      className={cx(
        'h-[34px] w-full min-w-0 appearance-none rounded-[8px] border border-hunt-border bg-hunt-panel px-[12px] text-[14px] font-medium tracking-[0.08em] text-hunt-text outline-none',
        !readOnly &&
          'focus:border-hunt-blueInk focus:ring-2 focus:ring-hunt-blue/70',
        readOnly && 'pointer-events-none cursor-default select-none',
      )}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export function HuntCode({
  className,
  dragHandleProps,
  state = 'default',
  indexLabel = '1',
  desktopSegments,
  mobileCode,
  onCodeChange,
  onDelete,
  ...props
}: HuntCodeProps) {
  const isDragging = state === 'dragging';
  const showsExpandedField = state === 'editing' || state === 'dragging';
  const isEditing = state === 'editing';
  const isEditable = state === 'default' || isEditing;
  const showsDeleteAction = state === 'editing' || state === 'dragging';
  const a11yLabel = `${STATE_LABELS[state]} hunt code`;
  const desktopInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [desktopValues, setDesktopValues] = useState(() =>
    resolveDesktopSegmentValues(desktopSegments, mobileCode),
  );
  const { className: dragHandleClassName, ...restDragHandleProps } =
    dragHandleProps ?? {};

  useEffect(() => {
    setDesktopValues(resolveDesktopSegmentValues(desktopSegments, mobileCode));
  }, [desktopSegments, mobileCode]);

  function emitChange(nextDesktopValues: readonly string[]) {
    onCodeChange?.({
      desktopSegments: nextDesktopValues,
      mobileCode: flattenDesktopSegmentValues(nextDesktopValues),
    });
  }

  function handleFullCodeChange(nextValue: string) {
    const nextDesktopValues = splitHuntCodeIntoSegments(nextValue);
    setDesktopValues(nextDesktopValues);
    emitChange(nextDesktopValues);
  }

  function handleDesktopSegmentChange(index: number, nextValue: string) {
    const maxLength = DEFAULT_SEGMENT_LENGTHS[index];
    const trimmedValue = nextValue.slice(0, maxLength);

    setDesktopValues((currentValues) => {
      const nextDesktopValues = currentValues.map((value, valueIndex) =>
        valueIndex === index ? trimmedValue : value,
      );

      emitChange(nextDesktopValues);
      return nextDesktopValues;
    });

    if (trimmedValue.length === maxLength) {
      desktopInputRefs.current[index + 1]?.focus();
    }
  }

  function handleDesktopPaste(
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    const pastedText = event.clipboardData.getData('text').replace(/\s+/g, '');

    if (!pastedText) {
      return;
    }

    event.preventDefault();

    let cursor = 0;
    let lastFilledIndex = index;

    setDesktopValues((currentValues) =>
      {
        const nextDesktopValues = currentValues.map((currentValue, valueIndex) => {
        if (valueIndex < index) {
          return currentValue;
        }

        const segmentLength = DEFAULT_SEGMENT_LENGTHS[valueIndex];
        const nextSegmentValue = pastedText.slice(
          cursor,
          cursor + segmentLength,
        );

        if (!nextSegmentValue) {
          return currentValue;
        }

        cursor += segmentLength;
        lastFilledIndex = valueIndex;
        return nextSegmentValue;
      });

        emitChange(nextDesktopValues);
        return nextDesktopValues;
      },
    );

    requestAnimationFrame(() => {
      desktopInputRefs.current[lastFilledIndex]?.focus();
    });
  }

  return (
    <div
      aria-label={a11yLabel}
      className={cx(isDragging && 'py-1', 'w-full', className)}
      data-state={state}
      {...props}
    >
      <div
        className={cx(
          'flex items-center justify-start',
          isDragging && 'rotate-[2deg]',
        )}
      >
        <div
          className={cx(
            'flex w-full items-stretch overflow-hidden rounded-[10px] border-2 border-hunt-border bg-hunt-shell',
            SURFACE_VARIANTS[state],
          )}
        >
          <div
            className={cx(
              'flex w-[50px] shrink-0 items-center justify-center border-r-2 border-hunt-border',
              LEFT_PANEL_VARIANTS[state],
              isDragging && 'shadow-[-19px_0_4px_rgba(0,0,0,0.12)]',
            )}
          >
            <div
              className={cx(
                'flex h-full w-full items-center justify-center',
                dragHandleProps &&
                  'group/drag touch-none cursor-grab active:cursor-grabbing',
                dragHandleClassName,
              )}
              {...restDragHandleProps}
            >
              <span className='sr-only'>Priority {indexLabel}</span>
              <StatusGlyph indexLabel={indexLabel} state={state} />
            </div>
          </div>

          <div
            className={cx(
              'flex flex-1 items-center gap-3 p-[14px]',
              BODY_VARIANTS[state],
            )}
          >
            {showsExpandedField ? (
              <div className='min-w-0 flex-1'>
                <FullInputBox
                  onChange={isEditable ? handleFullCodeChange : undefined}
                  readOnly={!isEditable}
                  value={flattenDesktopSegmentValues(desktopValues)}
                />
              </div>
            ) : (
              <div
                className='grid min-w-0 flex-1 gap-[8px]'
                style={{ gridTemplateColumns: '1fr 1fr 3fr 2fr 1fr' }}
              >
                {desktopValues.map((segment, index) => (
                  <InputBox
                    key={`${index}-${DEFAULT_SEGMENT_LENGTHS[index]}`}
                    ariaLabel={`Code segment ${index + 1}`}
                    inputRef={(node) => {
                      desktopInputRefs.current[index] = node;
                    }}
                    maxLength={DEFAULT_SEGMENT_LENGTHS[index]}
                    onChange={
                      isEditable
                        ? (nextValue) =>
                            handleDesktopSegmentChange(index, nextValue)
                        : undefined
                    }
                    onPaste={
                      isEditable
                        ? (event) => handleDesktopPaste(index, event)
                        : undefined
                    }
                    readOnly={!isEditable}
                    value={segment}
                  />
                ))}
              </div>
            )}

            {showsDeleteAction ? (
              <DeleteButton dragging={isDragging} onDelete={onDelete} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

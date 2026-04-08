import { useRef, useState } from 'react';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { HuntButton } from './HuntButton';
import { HuntCode } from './HuntCode';
import { HuntIcon } from './HuntIcon';

type HuntCodeSeed = {
  desktopSegments: readonly string[];
  id: number;
  mobileCode: string;
};

type ProgramStatus =
  | 'waiting'
  | 'running'
  | 'trying-next'
  | 'success'
  | 'complete'
  | 'error';

type AutofillResult = {
  reason: 'filled' | 'invalid-code' | 'missing-inputs' | 'missing-target';
  success: boolean;
};

const LOGO_URL =
  'https://www.figma.com/api/mcp/asset/8172062c-88a5-4100-9194-275d1cc4d327';
const BACKGROUND_ART_URL =
  'https://www.figma.com/api/mcp/asset/a7ef81f0-2b60-4429-80c6-7a43dd61e6ff';
const FIELD_SUFFIXES = [
  'code_species',
  'code_speciessubtype',
  'code_huntlocation',
  'code_dateperiod',
  'code_weapon',
] as const;
const HUNT_CODE_SEGMENT_LENGTHS = [1, 1, 3, 2, 1] as const;
const INITIAL_CODES: HuntCodeSeed[] = [
  {
    id: 1,
    desktopSegments: ['E', 'M', '012', 'O1', 'A'],
    mobileCode: 'EM012O1A',
  },
  {
    id: 2,
    desktopSegments: ['E', 'F', '042', 'O1', 'A'],
    mobileCode: 'EF042O1A',
  },
  {
    id: 3,
    desktopSegments: ['E', 'M', '012', 'O1', 'R'],
    mobileCode: 'EM012O1R',
  },
  {
    id: 4,
    desktopSegments: ['E', 'M', '012', 'O1', 'R'],
    mobileCode: 'EM012O1R',
  },
];
const EMPTY_CODE: Omit<HuntCodeSeed, 'id'> = {
  desktopSegments: ['', '', '', '', ''],
  mobileCode: '',
};
const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  waiting: 'Waiting for page to load...',
  running: 'Running code {x}...',
  'trying-next': 'Code {x} failed. Trying next code...',
  success: 'Code {x} succeeded. Submitting tag...',
  complete: 'All codes have been evaluated. No tags drawn.',
  error: 'An error occurred while running the program.',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function flattenDesktopSegments(segments: readonly string[]) {
  return segments.join('').replace(/\s+/g, '').toUpperCase();
}

function parseHuntCode(code: string) {
  const sanitizedCode = code.replace(/\s+/g, '').toUpperCase();

  if (sanitizedCode.length !== 8) {
    return null;
  }

  let cursor = 0;

  return HUNT_CODE_SEGMENT_LENGTHS.map((segmentLength) => {
    const nextSegment = sanitizedCode.slice(cursor, cursor + segmentLength);
    cursor += segmentLength;
    return nextSegment;
  });
}

function formatProgramStatus(status: ProgramStatus, code?: string) {
  return PROGRAM_STATUS_LABELS[status].replace('{x}', code ?? '{x}');
}

async function getActiveTabId() {
  if (
    typeof chrome === 'undefined' ||
    !chrome.tabs?.query ||
    !chrome.scripting?.executeScript
  ) {
    return null;
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return activeTab?.id ?? null;
}

async function executeOnTab<T, A extends unknown[]>(
  tabId: number,
  func: (...args: A) => T,
  args: A,
) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return result?.result as T;
}

async function waitForActivePageReady(tabId: number) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const readyState = await executeOnTab(
      tabId,
      () => document.readyState,
      [],
    );

    if (readyState === 'interactive' || readyState === 'complete') {
      return true;
    }

    await sleep(200);
  }

  return false;
}

async function autofillCodeOnPage(
  tabId: number,
  code: string,
  choiceIndex: number,
) {
  return executeOnTab<AutofillResult, [string, number]>(
    tabId,
    (nextCode, nextChoiceIndex) => {
      const suffixes = [
        'code_species',
        'code_speciessubtype',
        'code_huntlocation',
        'code_dateperiod',
        'code_weapon',
      ] as const;
      const segmentLengths = [1, 1, 3, 2, 1] as const;
      const sanitizedCode = nextCode.replace(/\s+/g, '').toUpperCase();

      if (sanitizedCode.length !== 8) {
        return { reason: 'invalid-code', success: false };
      }

      const speciesInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[id$=".code_species"]'),
      );
      const prefixes = Array.from(
        new Set(
          speciesInputs
            .map((input) => input.id.replace(/\.code_species$/, ''))
            .filter(Boolean),
        ),
      );
      const targetPrefix = prefixes[nextChoiceIndex];

      if (!targetPrefix) {
        return { reason: 'missing-target', success: false };
      }

      let cursor = 0;
      const codeSegments = segmentLengths.map((segmentLength) => {
        const nextSegment = sanitizedCode.slice(cursor, cursor + segmentLength);
        cursor += segmentLength;
        return nextSegment;
      });
      const targetInputs = suffixes.map((suffix) =>
        document.getElementById(`${targetPrefix}.${suffix}`),
      );

      if (
        targetInputs.some(
          (input): input is null =>
            !(input instanceof HTMLInputElement || input instanceof HTMLSelectElement),
        )
      ) {
        return { reason: 'missing-inputs', success: false };
      }

      targetInputs.forEach((input, index) => {
        const element = input as HTMLInputElement | HTMLSelectElement;
        element.value = codeSegments[index] ?? '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      });

      return { reason: 'filled', success: true };
    },
    [code, choiceIndex],
  );
}

function getRunnableCodeValue(code: HuntCodeSeed) {
  return flattenDesktopSegments(code.desktopSegments);
}

export function reorderHuntCodes(
  codes: HuntCodeSeed[],
  activeId: number,
  overId?: number,
) {
  if (!overId || activeId === overId) {
    return codes;
  }

  const oldIndex = codes.findIndex((code) => code.id === activeId);
  const newIndex = codes.findIndex((code) => code.id === overId);

  if (oldIndex === -1 || newIndex === -1) {
    return codes;
  }

  return arrayMove(codes, oldIndex, newIndex);
}

function SortableCodeCard({
  code,
  index,
  isEditing,
  onChange,
  onDelete,
}: {
  code: HuntCodeSeed;
  index: number;
  isEditing: boolean;
  onChange: (nextValue: {
    desktopSegments: readonly string[];
    mobileCode: string;
  }) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: code.id,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cx(isDragging && 'z-10')}
    >
      <HuntCode
        desktopSegments={code.desktopSegments}
        dragHandleProps={
          isEditing
            ? {
                ...attributes,
                ...listeners,
                'aria-label': `Reorder hunt code ${index + 1}`,
              }
            : undefined
        }
        indexLabel={String(index + 1)}
        mobileCode={code.mobileCode}
        onCodeChange={onChange}
        onDelete={onDelete}
        state={isDragging ? 'dragging' : isEditing ? 'editing' : 'default'}
      />
    </div>
  );
}

export function AutoFillerPage() {
  const nextCodeIdRef = useRef(INITIAL_CODES.length + 1);
  const runRequestIdRef = useRef(0);
  const [codes, setCodes] = useState(INITIAL_CODES);
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState(
    formatProgramStatus('waiting'),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleAddCode() {
    setCodes((currentCodes) => [
      ...currentCodes,
      {
        ...EMPTY_CODE,
        id: nextCodeIdRef.current++,
      },
    ]);
  }

  function handleCodeChange(
    id: number,
    nextValue: {
      desktopSegments: readonly string[];
      mobileCode: string;
    },
  ) {
    setCodes((currentCodes) =>
      currentCodes.map((code) =>
        code.id === id
          ? {
              ...code,
              desktopSegments: [...nextValue.desktopSegments],
              mobileCode: nextValue.mobileCode,
            }
          : code,
      ),
    );
  }

  function handleDeleteCode(id: number) {
    setCodes((currentCodes) => currentCodes.filter((code) => code.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = Number(event.active.id);
    const overId = event.over ? Number(event.over.id) : undefined;

    setCodes((currentCodes) => reorderHuntCodes(currentCodes, activeId, overId));
  }

  async function handleRunProgram() {
    const runRequestId = ++runRequestIdRef.current;
    const runnableCodes = codes
      .map((code) => ({
        codeText: getRunnableCodeValue(code),
        id: code.id,
      }))
      .filter((code) => code.codeText.length > 0);

    if (runnableCodes.length === 0) {
      setStatusText(formatProgramStatus('complete'));
      return;
    }

    try {
      setStatusText(formatProgramStatus('waiting'));

      const activeTabId = await getActiveTabId();

      if (!activeTabId) {
        setStatusText(formatProgramStatus('error'));
        return;
      }

      const pageIsReady = await waitForActivePageReady(activeTabId);

      if (runRequestId !== runRequestIdRef.current) {
        return;
      }

      if (!pageIsReady) {
        setStatusText(formatProgramStatus('error'));
        return;
      }

      let successfulCode: string | null = null;

      for (const [index, code] of runnableCodes.entries()) {
        setStatusText(formatProgramStatus('running', code.codeText));

        const codeSegments = parseHuntCode(code.codeText);

        if (!codeSegments) {
          if (index < runnableCodes.length - 1) {
            setStatusText(formatProgramStatus('trying-next', code.codeText));
            await sleep(200);
            continue;
          }

          break;
        }

        const result = await autofillCodeOnPage(activeTabId, code.codeText, index);

        if (runRequestId !== runRequestIdRef.current) {
          return;
        }

        if (result.success) {
          successfulCode = code.codeText;
          setStatusText(formatProgramStatus('success', code.codeText));
          await sleep(150);
          continue;
        }

        if (index < runnableCodes.length - 1) {
          setStatusText(formatProgramStatus('trying-next', code.codeText));
          await sleep(200);
        }
      }

      setStatusText(
        successfulCode
          ? formatProgramStatus('success', successfulCode)
          : formatProgramStatus('complete'),
      );
    } catch {
      if (runRequestId === runRequestIdRef.current) {
        setStatusText(formatProgramStatus('error'));
      }
    }
  }

  function handlePauseProgram() {
    runRequestIdRef.current += 1;
    setStatusText(formatProgramStatus('waiting'));
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-[#f9fafb] text-hunt-text'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden opacity-60'>
        <img
          alt=''
          aria-hidden='true'
          className='absolute inset-0 h-full w-full object-cover'
          src={BACKGROUND_ART_URL}
        />
      </div>

      <div className='relative flex min-h-screen flex-col'>
        <header className='px-4 py-6'>
          <div className='mx-auto flex max-w-[328px] items-center justify-center gap-4'>
            <img
              alt='StinkyBoul logo'
              className='h-[51px] w-[60px] shrink-0 object-contain'
              src={LOGO_URL}
            />
            <div className='space-y-2 text-center'>
              <h1 className='text-[32px] font-bold leading-none tracking-[0.01em] text-[#162456]'>
                StinkyBoul
              </h1>
              <p className='text-[14px] font-medium leading-none text-hunt-text'>
                Never Miss A Tag
              </p>
            </div>
          </div>
        </header>

        <section className='flex-1 px-4'>
          <div className='mx-auto flex w-full max-w-[328px] flex-col pb-12 pt-4'>
            <div className='space-y-2 pb-4'>
              <h2 className='text-[20px] font-bold leading-[1.2] text-hunt-text'>
                Hunt Codes
              </h2>
              <p className='max-w-[316px] text-[12px] font-medium leading-[1.45] text-[#6a7282]'>
                Enter codes in priority order. Codes are tried from top to
                bottom until one succeeds or the list ends.
              </p>
            </div>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={codes.map((code) => code.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='flex flex-col items-start gap-4'>
                  {codes.map((code, index) => (
                    <SortableCodeCard
                      key={code.id}
                      code={code}
                      index={index}
                      isEditing={isEditing}
                      onChange={(nextValue) =>
                        handleCodeChange(code.id, nextValue)
                      }
                      onDelete={() => handleDeleteCode(code.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className='flex items-center justify-between pb-6 pt-8'>
              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  icon={<HuntIcon name='play' />}
                  size='medium'
                  tone='primary'
                  onClick={handleRunProgram}
                >
                  Run Program
                </HuntButton>
                <HuntButton
                  aria-label='Pause program'
                  icon={
                    <HuntIcon
                      className={
                        statusText !== formatProgramStatus('waiting')
                          ? 'brightness-0 saturate-100'
                          : undefined
                      }
                      name='pause'
                    />
                  }
                  size='pill'
                  tone={
                    statusText !== formatProgramStatus('waiting')
                      ? 'secondary'
                      : 'disabled'
                  }
                  onClick={handlePauseProgram}
                />
              </div>

              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  aria-label='Edit hunt codes'
                  aria-pressed={isEditing}
                  icon={
                    <HuntIcon
                      className='brightness-0 saturate-100'
                      name='edit'
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={() => setIsEditing((currentState) => !currentState)}
                />
                <HuntButton
                  aria-label='Add hunt code'
                  icon={
                    <HuntIcon
                      className='brightness-0 saturate-100'
                      name='add'
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={handleAddCode}
                />
              </div>
            </div>

            <p className='min-h-[14px] text-[14px] font-semibold leading-none text-[#6a7282] underline underline-offset-[3px]'>
              {statusText}
            </p>
          </div>
        </section>

        <footer className='mt-auto bg-white px-4 py-4'>
          <p className='mx-auto max-w-[328px] text-[12px] leading-4 text-hunt-text'>
            <span className='italic font-light'>
              “You’re going to learn this real quick out here. If you want
              something, you better bring it.”
            </span>{' '}
            <span className='font-light not-italic'>- </span>
            <span className='font-medium not-italic'>Caleb McDaniel</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

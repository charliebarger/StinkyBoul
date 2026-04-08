import { useEffect, useRef, useState } from 'react';

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

import { getStoredHuntCodes, setStoredHuntCodes } from '../lib/huntCodesStorage';
import { HuntButton } from './HuntButton';
import { HuntCode } from './HuntCode';
import { HuntIcon } from './HuntIcon';

type HuntCodeSeed = {
  desktopSegments: readonly string[];
  id: number;
  mobileCode: string;
};

type ProgramStatus =
  | 'idle'
  | 'waiting'
  | 'running'
  | 'trying-next'
  | 'success'
  | 'complete'
  | 'error';

type AutofillResult = {
  reason:
    | 'canceled'
    | 'invalid-code'
    | 'missing-inputs'
    | 'not-set'
    | 'success'
    | 'timeout';
  success: boolean;
};

type HuntCodeVisualState =
  | 'default'
  | 'editing'
  | 'dragging'
  | 'success'
  | 'failure'
  | 'trying';

const LOGO_URL =
  'https://www.figma.com/api/mcp/asset/8172062c-88a5-4100-9194-275d1cc4d327';
const BACKGROUND_ART_URL =
  'https://www.figma.com/api/mcp/asset/a7ef81f0-2b60-4429-80c6-7a43dd61e6ff';
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
  idle: 'Ready to run program.',
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
  const normalizedCode = code.replace(/\s+/g, '').toUpperCase().slice(1);
  const match = normalizedCode.match(/^([A-Z])(\d{1,3})([A-Z]\d)([A-Z])$/);

  if (!match) {
    return null;
  }

  const [, speciessubtype, huntlocation, dateperiod, weapon] = match;
  return {
    speciessubtype,
    huntlocation,
    dateperiod,
    weapon,
  };
}

function formatProgramStatus(status: ProgramStatus, code?: string) {
  return PROGRAM_STATUS_LABELS[status].replace('{x}', code ?? '{x}');
}

function getProgramStatusTextColor(status: ProgramStatus) {
  if (status === 'success') {
    return 'text-[#12804a]';
  }

  if (status === 'trying-next' || status === 'complete' || status === 'error') {
    return 'text-[#bf1d1d]';
  }

  return 'text-[#6a7282]';
}

type PageRunState = {
  canceled: boolean;
  runId: number;
};

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
  func: (...args: A) => T | Promise<T>,
  args: A,
): Promise<Awaited<T>> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return result?.result as Awaited<T>;
}

async function waitForActivePageReady(tabId: number) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const readyState = await executeOnTab(tabId, () => document.readyState, []);

    if (readyState === 'interactive' || readyState === 'complete') {
      return true;
    }

    await sleep(200);
  }

  return false;
}

async function setPageRunState(
  tabId: number,
  runId: number,
  canceled: boolean,
) {
  return executeOnTab<PageRunState, [number, boolean]>(
    tabId,
    (nextRunId, nextCanceled) => {
      const nextState = {
        canceled: nextCanceled,
        runId: nextRunId,
      };

      (
        window as typeof window & { __stinkyBoulRunState?: PageRunState }
      ).__stinkyBoulRunState = nextState;

      return nextState;
    },
    [runId, canceled],
  );
}

async function waitForAutofillTargets(tabId: number, runId: number) {
  for (;;) {
    let targetStatus: 'canceled' | 'ready' | 'waiting' = 'waiting';

    try {
      targetStatus = await executeOnTab<
        'canceled' | 'ready' | 'waiting',
        [number]
      >(
        tabId,
        (nextRunId) => {
          const pageWindow = window as typeof window & {
            __stinkyBoulRunState?: PageRunState;
          };
          const pageState = pageWindow.__stinkyBoulRunState;

          if (pageState?.canceled) {
            return 'canceled';
          }

          if (!pageState) {
            pageWindow.__stinkyBoulRunState = {
              canceled: false,
              runId: nextRunId,
            };
          } else if (pageState.runId !== nextRunId) {
            return 'canceled';
          }

          const requiredTargets = [
            '[id*=".code_speciessubtype"]',
            '[id*=".code_huntlocation"]',
            '[id*=".code_dateperiod"]',
            '[id*=".code_weapon"]',
            '#submit',
          ];
          const hasTargets = requiredTargets.every((selector) =>
            Boolean(document.querySelector(selector)),
          );

          return hasTargets ? 'ready' : 'waiting';
        },
        [runId],
      );
    } catch {
      targetStatus = 'waiting';
    }

    if (targetStatus !== 'waiting') {
      return targetStatus;
    }

    await sleep(400);
  }
}

async function autofillCodeOnPage(tabId: number, code: string, runId: number) {
  return executeOnTab<AutofillResult, [string, number]>(
    tabId,
    (nextCode, nextRunId) => {
      const normalizedCode = nextCode
        .replace(/\s+/g, '')
        .toUpperCase()
        .slice(1);
      const match = normalizedCode.match(/^([A-Z])(\d{1,3})([A-Z]\d)([A-Z])$/);

      if (!match) {
        return Promise.resolve({
          reason: 'invalid-code' as const,
          success: false,
        });
      }

      const [, speciessubtype, huntlocation, dateperiod, weapon] = match;
      const fields = {
        speciessubtype,
        huntlocation,
        dateperiod,
        weapon,
      } as const;

      return new Promise<AutofillResult>((resolve) => {
        let settled = false;
        let observer: MutationObserver | null = null;
        let pollId = 0;
        let timeoutId = 0;

        const cleanup = () => {
          if (observer) {
            observer.disconnect();
            observer = null;
          }

          if (pollId) {
            window.clearInterval(pollId);
          }

          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }
        };

        const settle = (result: AutofillResult) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          resolve(result);
        };

        const isCanceled = () => {
          const pageState = (
            window as typeof window & { __stinkyBoulRunState?: PageRunState }
          ).__stinkyBoulRunState;

          return Boolean(pageState?.canceled || pageState?.runId !== nextRunId);
        };

        const checkOutcome = () => {
          if (isCanceled()) {
            settle({ reason: 'canceled', success: false });
            return true;
          }

          const choiceDetailsEl = Array.from(
            document.querySelectorAll<HTMLElement>('*'),
          ).find((element) => element.textContent?.includes('Choice Details'));
          const notSetEl = document.querySelector('[name="NOTSET"]');

          if (choiceDetailsEl) {
            settle({ reason: 'success', success: true });
            return true;
          }

          if (notSetEl) {
            settle({ reason: 'not-set', success: false });
            return true;
          }

          return false;
        };

        observer = new MutationObserver(() => {
          checkOutcome();
        });
        observer.observe(document.body, {
          characterData: true,
          childList: true,
          subtree: true,
        });

        pollId = window.setInterval(() => {
          if (isCanceled()) {
            settle({ reason: 'canceled', success: false });
            return;
          }

          let filled = 0;
          let lastInput: HTMLInputElement | HTMLSelectElement | null = null;

          for (const [key, value] of Object.entries(fields)) {
            const input = document.querySelector<
              HTMLInputElement | HTMLSelectElement
            >(`[id*=".code_${key}"]`);

            if (!input) {
              continue;
            }

            if (input.value !== value) {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            lastInput = input;
            filled += 1;
          }

          if (filled !== Object.keys(fields).length) {
            return;
          }

          if (lastInput && 'focus' in lastInput) {
            lastInput.focus();
          }

          const submitButton = document.querySelector<HTMLElement>(
            '#submit:not(.disabled)',
          );

          if (!submitButton) {
            return;
          }

          window.clearInterval(pollId);
          pollId = 0;
          timeoutId = window.setTimeout(() => {
            settle({ reason: 'timeout', success: false });
          }, 8000);
          submitButton.click();
          checkOutcome();
        }, 250);
      });
    },
    [code, runId],
  );
}

function getRunnableCodeValue(code: HuntCodeSeed) {
  return flattenDesktopSegments(code.desktopSegments);
}

function RunningSpinnerIcon() {
  return (
    <span
      aria-hidden='true'
      className='inline-flex h-[17px] w-[17px] shrink-0 rounded-full border-2 border-hunt-border border-r-hunt-blueInk border-t-hunt-blueInk animate-hunt-spin'
    />
  );
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
  state,
}: {
  code: HuntCodeSeed;
  index: number;
  isEditing: boolean;
  onChange: (nextValue: {
    desktopSegments: readonly string[];
    mobileCode: string;
  }) => void;
  onDelete: () => void;
  state?: HuntCodeVisualState;
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
      className={cx('w-full', isDragging && 'z-10')}
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
        state={
          isDragging ? 'dragging' : isEditing ? 'editing' : (state ?? 'default')
        }
      />
    </div>
  );
}

export function AutoFillerPage() {
  const hasLoadedStoredCodesRef = useRef(false);
  const nextCodeIdRef = useRef(INITIAL_CODES.length + 1);
  const runRequestIdRef = useRef(0);
  const activeTabIdRef = useRef<number | null>(null);
  const [codes, setCodes] = useState(INITIAL_CODES);
  const [isEditing, setIsEditing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [programStatus, setProgramStatus] = useState<ProgramStatus>('idle');
  const [statusText, setStatusText] = useState(formatProgramStatus('idle'));
  const [codeStates, setCodeStates] = useState<
    Record<number, HuntCodeVisualState>
  >({});
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

    setCodes((currentCodes) =>
      reorderHuntCodes(currentCodes, activeId, overId),
    );
  }

  function resetCodeStates() {
    setCodeStates({});
  }

  function setCodeVisualState(id: number, nextState: HuntCodeVisualState) {
    setCodeStates((currentStates) => ({
      ...currentStates,
      [id]: nextState,
    }));
  }

  function updateStatus(nextStatus: ProgramStatus, code?: string) {
    setProgramStatus(nextStatus);
    setStatusText(formatProgramStatus(nextStatus, code));
  }

  useEffect(() => {
    updateStatus('idle');
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function hydrateStoredCodes() {
      const storedCodes = await getStoredHuntCodes();

      if (!isCurrent) {
        return;
      }

      if (storedCodes) {
        setCodes(storedCodes);
        nextCodeIdRef.current =
          Math.max(...storedCodes.map((code) => code.id)) + 1;
      }

      hasLoadedStoredCodesRef.current = true;
    }

    hydrateStoredCodes();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredCodesRef.current) {
      return;
    }

    void setStoredHuntCodes(codes);
  }, [codes]);

  function clearRunningState() {
    resetCodeStates();
    setIsRunning(false);
    activeTabIdRef.current = null;
  }

  async function handleRunProgram() {
    if (isRunning) {
      return;
    }

    const runRequestId = ++runRequestIdRef.current;
    const runnableCodes = codes
      .map((code) => ({
        codeText: getRunnableCodeValue(code),
        id: code.id,
      }))
      .filter((code) => code.codeText.length > 0);

    if (runnableCodes.length === 0) {
      resetCodeStates();
      updateStatus('idle');
      return;
    }

    try {
      resetCodeStates();
      setIsRunning(true);
      updateStatus('waiting');

      const activeTabId = await getActiveTabId();

      if (!activeTabId) {
        setIsRunning(false);
        updateStatus('error');
        return;
      }

      activeTabIdRef.current = activeTabId;

      const pageIsReady = await waitForActivePageReady(activeTabId);

      if (runRequestId !== runRequestIdRef.current) {
        clearRunningState();
        return;
      }

      if (!pageIsReady) {
        clearRunningState();
        updateStatus('error');
        return;
      }

      await setPageRunState(activeTabId, runRequestId, false);

      const targetStatus = await waitForAutofillTargets(
        activeTabId,
        runRequestId,
      );

      if (
        runRequestId !== runRequestIdRef.current ||
        targetStatus === 'canceled'
      ) {
        clearRunningState();
        return;
      }

      let successfulCode: string | null = null;

      for (const [index, code] of runnableCodes.entries()) {
        updateStatus('running', code.codeText);
        setCodeVisualState(code.id, 'trying');

        const parsedCode = parseHuntCode(code.codeText);

        if (!parsedCode) {
          setCodeVisualState(code.id, 'failure');

          if (index < runnableCodes.length - 1) {
            updateStatus('trying-next', code.codeText);
            await sleep(1000);
            continue;
          }

          break;
        }

        const result = await autofillCodeOnPage(
          activeTabId,
          code.codeText,
          runRequestId,
        );

        if (runRequestId !== runRequestIdRef.current) {
          clearRunningState();
          return;
        }

        if (result.reason === 'canceled') {
          clearRunningState();
          return;
        }

        if (result.success) {
          successfulCode = code.codeText;
          setCodeVisualState(code.id, 'success');
          updateStatus('success', code.codeText);
          break;
        }

        setCodeVisualState(code.id, 'failure');

        if (index < runnableCodes.length - 1) {
          updateStatus('trying-next', code.codeText);
          await sleep(1000);
        }
      }

      updateStatus(
        successfulCode ? 'success' : 'complete',
        successfulCode ?? undefined,
      );
      setIsRunning(false);
      activeTabIdRef.current = null;
    } catch {
      if (runRequestId === runRequestIdRef.current) {
        updateStatus('error');
      }

      clearRunningState();
    }
  }

  async function handlePauseProgram() {
    runRequestIdRef.current += 1;
    resetCodeStates();
    setIsRunning(false);
    updateStatus('idle');

    if (activeTabIdRef.current) {
      await setPageRunState(
        activeTabIdRef.current,
        runRequestIdRef.current,
        true,
      ).catch(() => undefined);
    }

    activeTabIdRef.current = null;
  }

  async function handleResetProgram() {
    await handlePauseProgram();
  }

  async function handleToggleEditMode() {
    await handleResetProgram();
    setIsEditing((currentState) => !currentState);
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
                <div className='flex w-full flex-col items-stretch gap-4'>
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
                      state={codeStates[code.id]}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className='flex items-center justify-between pb-6 pt-8'>
              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  aria-pressed={isRunning}
                  className={isRunning ? 'ring-2 ring-hunt-blue/30' : undefined}
                  disabled={isEditing && !isRunning}
                  icon={
                    isRunning ? (
                      <RunningSpinnerIcon />
                    ) : (
                      <HuntIcon
                        name='play'
                        tone={isEditing ? 'disabled' : 'default'}
                      />
                    )
                  }
                  size='medium'
                  tone={isRunning ? 'secondary' : 'primary'}
                  onClick={isRunning ? handlePauseProgram : handleRunProgram}
                >
                  {isRunning ? 'Running...' : 'Run Program'}
                </HuntButton>
                <HuntButton
                  aria-label='Reset program'
                  disabled={isEditing}
                  icon={
                    <HuntIcon
                      name='sync'
                      tone={isEditing ? 'disabled' : 'secondary'}
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={handleResetProgram}
                />
              </div>

              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  aria-label='Edit hunt codes'
                  aria-pressed={isEditing}
                  disabled={isRunning}
                  icon={
                    <HuntIcon
                      name='edit'
                      tone={isRunning ? 'disabled' : 'secondary'}
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={handleToggleEditMode}
                />
                <HuntButton
                  aria-label='Add hunt code'
                  disabled={isRunning}
                  icon={
                    <HuntIcon
                      name='add'
                      tone={isRunning ? 'disabled' : 'secondary'}
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={handleAddCode}
                />
              </div>
            </div>
            <section className='bg-white rounded-md overflow-hidden shadow'>
              <header className='px-4 py-3 border-b border-hunt-border  bg-hunt-shell'>
                <h3 className='text-xs font-semibold  text-hunt-text '>
                  Program Status
                </h3>
              </header>
              <p
                role='status'
                aria-live='polite'
                className={cx(
                  'min-h-[14px] p-4 text-[14px] font-semibold leading-none transition-colors',
                  getProgramStatusTextColor(programStatus),
                )}
              >
                {statusText}
              </p>
            </section>
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

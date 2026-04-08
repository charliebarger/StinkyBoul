import type { ChangeEvent, FormEvent } from 'react';

const LOGIN_BACKGROUND_URL =
  'https://www.figma.com/api/mcp/asset/4a9aa4f3-fd84-404d-b52d-5e0518cac0dc';
const ACTIVATION_BACKGROUND_URL =
  'https://www.figma.com/api/mcp/asset/45228cc9-55d3-4534-896e-f34b346d8489';
const LOGIN_LOGO_URL =
  'https://www.figma.com/api/mcp/asset/e39b3b87-cb8b-4695-bd08-508d512477cf';
const ACTIVATION_LOGO_URL =
  'https://www.figma.com/api/mcp/asset/d39dc016-d044-474f-be69-c40052a06d32';

type AccessTokenPageProps = {
  errorMessage?: string;
  isActivating?: boolean;
  token: string;
  onActivate: () => void;
  onTokenChange: (value: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function AccessTokenIcon() {
  return (
    <svg
      aria-hidden='true'
      className='h-4 w-[14px] shrink-0 text-[#4a4a49]'
      fill='none'
      viewBox='0 0 14 16'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M10.75 6H10.25V4.75C10.25 2.96 8.79 1.5 7 1.5C5.21 1.5 3.75 2.96 3.75 4.75V6H3.25C2.56 6 2 6.56 2 7.25V12.75C2 13.44 2.56 14 3.25 14H10.75C11.44 14 12 13.44 12 12.75V7.25C12 6.56 11.44 6 10.75 6ZM7 10.88C6.48 10.88 6.06 10.46 6.06 9.94C6.06 9.42 6.48 9 7 9C7.52 9 7.94 9.42 7.94 9.94C7.94 10.46 7.52 10.88 7 10.88ZM9.06 6H4.94V4.75C4.94 3.62 5.87 2.69 7 2.69C8.13 2.69 9.06 3.62 9.06 4.75V6Z'
        fill='currentColor'
      />
    </svg>
  );
}

function ActivatingSpinner() {
  return (
    <span
      aria-hidden='true'
      className='inline-flex h-[15px] w-[15px] shrink-0 rounded-full border-2 border-white/40 border-r-white border-t-white animate-hunt-spin'
    />
  );
}

function ErrorIndicator() {
  return (
    <svg
      aria-hidden='true'
      className='mt-[1px] h-[11px] w-[11px] shrink-0 text-hunt-destructive'
      fill='none'
      viewBox='0 0 16 16'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M8 1.25C4.272 1.25 1.25 4.272 1.25 8C1.25 11.728 4.272 14.75 8 14.75C11.728 14.75 14.75 11.728 14.75 8C14.75 4.272 11.728 1.25 8 1.25ZM8 11.125C7.482 11.125 7.0625 10.7055 7.0625 10.1875C7.0625 9.6695 7.482 9.25 8 9.25C8.518 9.25 8.9375 9.6695 8.9375 10.1875C8.9375 10.7055 8.518 11.125 8 11.125ZM8.75 7.75C8.75 8.164 8.414 8.5 8 8.5C7.586 8.5 7.25 8.164 7.25 7.75V4.625C7.25 4.211 7.586 3.875 8 3.875C8.414 3.875 8.75 4.211 8.75 4.625V7.75Z'
        fill='currentColor'
      />
    </svg>
  );
}

export function AccessTokenPage({
  errorMessage,
  isActivating = false,
  token,
  onActivate,
  onTokenChange,
}: AccessTokenPageProps) {
  const showActivationState = isActivating || Boolean(errorMessage);
  const backgroundUrl =
    showActivationState ? ACTIVATION_BACKGROUND_URL : LOGIN_BACKGROUND_URL;
  const logoUrl = showActivationState ? ACTIVATION_LOGO_URL : LOGIN_LOGO_URL;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token.trim() || isActivating) {
      return;
    }

    onActivate();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onTokenChange(event.target.value);
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-white text-hunt-text'>
      <div className='absolute inset-0'>
        <img
          alt=''
          aria-hidden='true'
          className='h-full w-full object-cover'
          src={backgroundUrl}
        />
        <div className='absolute inset-0 bg-gradient-to-b from-[rgba(190,219,255,0.2)] to-[rgba(28,57,142,0.2)]' />
      </div>

      <div className='relative flex min-h-screen flex-col items-center px-6 pb-12 pt-[148px]'>
        <section className='flex flex-col items-center'>
          <img
            alt='StinkyBoul logo'
            className='h-[166px] w-[191px] object-contain'
            src={logoUrl}
          />
          <div className='mt-2 flex flex-col items-center gap-2 text-center leading-none'>
            <h1 className='text-[32px] font-bold tracking-[0.01em] text-[#162456]'>
              StinkyBoul
            </h1>
            <p className='text-[14px] font-medium text-hunt-text'>
              Never Miss A Tag
            </p>
          </div>
        </section>

        <form
          className='mt-[76px] flex w-full max-w-[172px] flex-col items-stretch gap-4'
          onSubmit={handleSubmit}
        >
          <label className='relative block'>
            <span className='sr-only'>Access token</span>
            <span className='pointer-events-none absolute inset-y-0 left-3 inline-flex items-center'>
              <AccessTokenIcon />
            </span>
            <input
              autoCapitalize='off'
              autoComplete='off'
              autoCorrect='off'
              className={cx(
                'h-[38px] w-full rounded-[6px] border border-hunt-border bg-white pl-[34px] pr-3 text-[12px] font-normal text-[#4a4a49] shadow-[0px_1px_0px_rgba(255,255,255,0.85)] outline-none transition-colors',
                'placeholder:text-[#4a4a49] focus:border-hunt-blueInk focus:ring-2 focus:ring-hunt-blue/30',
              )}
              disabled={isActivating}
              inputMode='text'
              placeholder='Enter Access Token'
              type='text'
              value={token}
              onChange={handleInputChange}
            />
          </label>

          <button
            className={cx(
              'inline-flex h-[36px] w-full items-center justify-center gap-[6px] rounded-[6px] bg-hunt-blueInk px-[14px] text-[14px] font-semibold leading-none text-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] transition-[transform,box-shadow,filter] duration-150',
              'hover:shadow-[0px_2px_2px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.08)]',
              'active:translate-y-[1px] active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.22),0px_1px_1px_rgba(0,0,0,0.16)]',
              isActivating &&
                'cursor-not-allowed bg-[#3754b6] shadow-[0px_4px_4px_rgba(0,0,0,0.18)]',
            )}
            disabled={isActivating}
            type='submit'
          >
            <span>{isActivating ? 'Activating' : 'Activate'}</span>
            {isActivating ? <ActivatingSpinner /> : null}
          </button>

          {errorMessage ? (
            <div className='flex items-start gap-[3px] text-left'>
              <ErrorIndicator />
              <p className='text-[12px] font-medium leading-none text-hunt-destructive'>
                {errorMessage}
              </p>
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}

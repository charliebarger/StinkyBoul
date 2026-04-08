import { useEffect, useState } from 'react';

import { AccessTokenPage } from '../../src/components/AccessTokenPage';
import { AutoFillerPage } from '../../src/components/AutoFillerPage';
import {
  activateAccessToken,
  clearStoredAccessToken,
  getOrCreateBrowserId,
  getStoredAccessToken,
  setStoredAccessToken,
  verifyStoredAccess,
} from '../../src/lib/accessToken';

const INVALID_ACCESS_TOKEN_MESSAGE = 'Invalid access token. Please try again.';
const SUPABASE_CONFIG_MESSAGE =
  'Supabase is not configured. Add your project URL and anon key.';

export function App() {
  const [token, setToken] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function hydrateAccessState() {
      try {
        const storedToken = await getStoredAccessToken();

        if (!isCurrent) {
          return;
        }

        if (!storedToken) {
          setToken('');
          setIsActivated(false);
          setIsCheckingAccess(false);
          return;
        }

        const browserId = await getOrCreateBrowserId();
        const isValid = await verifyStoredAccess(browserId, storedToken);

        if (!isCurrent) {
          return;
        }

        if (isValid) {
          setToken(storedToken);
          setIsActivated(true);
        } else {
          await clearStoredAccessToken();
          setToken('');
          setIsActivated(false);
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        await clearStoredAccessToken();
        setToken('');
        setIsActivated(false);
        setErrorMessage(
          error instanceof Error &&
            error.message.includes('Supabase is not configured')
            ? SUPABASE_CONFIG_MESSAGE
            : '',
        );
      } finally {
        if (isCurrent) {
          setIsCheckingAccess(false);
        }
      }
    }

    hydrateAccessState();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleActivate() {
    const normalizedToken = token.trim().toUpperCase();

    if (!normalizedToken || isActivating) {
      return;
    }

    setErrorMessage('');
    setIsActivating(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 900);
    });

    try {
      const browserId = await getOrCreateBrowserId();
      const result = await activateAccessToken(browserId, normalizedToken);

      if (!result.success) {
        setIsActivating(false);
        setErrorMessage(result.errorMessage ?? INVALID_ACCESS_TOKEN_MESSAGE);
        return;
      }

      await setStoredAccessToken(normalizedToken);
      setIsActivating(false);
      setIsActivated(true);
    } catch (error) {
      setIsActivating(false);
      setErrorMessage(
        error instanceof Error &&
          error.message.includes('Supabase is not configured')
          ? SUPABASE_CONFIG_MESSAGE
          : INVALID_ACCESS_TOKEN_MESSAGE,
      );
    }
  }

  if (isCheckingAccess) {
    return null;
  }

  if (!isActivated) {
    return (
      <AccessTokenPage
        errorMessage={errorMessage}
        isActivating={isActivating}
        token={token}
        onActivate={handleActivate}
        onTokenChange={(nextToken) => {
          setToken(nextToken);
          setErrorMessage('');
        }}
      />
    );
  }

  return <AutoFillerPage />;
}

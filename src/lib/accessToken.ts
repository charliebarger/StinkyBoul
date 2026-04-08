import { createClient } from '@supabase/supabase-js';

const ACCESS_TOKEN_STORAGE_KEY = 'stinkyboul.access-token';
const BROWSER_ID_STORAGE_KEY = 'stinkyboul.browser-id';

const supabaseUrl = import.meta.env.WXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.WXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ExtensionStorageValue = string | null;

export type ActivationResult = {
  errorMessage?: string;
  success: boolean;
};

function normalizeToken(token: string) {
  return token.trim().toUpperCase();
}

function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

async function readStoredValue(key: string): Promise<ExtensionStorageValue> {
  if (isChromeStorageAvailable()) {
    const storedValues = await chrome.storage.local.get(key);
    return typeof storedValues[key] === 'string' ? storedValues[key] : null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

async function writeStoredValue(key: string, value: string) {
  if (isChromeStorageAvailable()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
  }
}

async function removeStoredValue(key: string) {
  if (isChromeStorageAvailable()) {
    await chrome.storage.local.remove(key);
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
  }
}

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add WXT_PUBLIC_SUPABASE_URL and WXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return supabase;
}

export async function getStoredAccessToken() {
  return readStoredValue(ACCESS_TOKEN_STORAGE_KEY);
}

export async function setStoredAccessToken(token: string) {
  await writeStoredValue(ACCESS_TOKEN_STORAGE_KEY, normalizeToken(token));
}

export async function clearStoredAccessToken() {
  await removeStoredValue(ACCESS_TOKEN_STORAGE_KEY);
}

export async function getOrCreateBrowserId() {
  const storedBrowserId = await readStoredValue(BROWSER_ID_STORAGE_KEY);

  if (storedBrowserId) {
    return storedBrowserId;
  }

  const nextBrowserId = crypto.randomUUID();
  await writeStoredValue(BROWSER_ID_STORAGE_KEY, nextBrowserId);
  return nextBrowserId;
}

export async function verifyStoredAccess(browserId: string, token: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('verify_extension_token', {
    input_browser_id: browserId,
    input_token: normalizeToken(token),
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function activateAccessToken(
  browserId: string,
  token: string,
): Promise<ActivationResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('activate_extension_token', {
    input_browser_id: browserId,
    input_token: normalizeToken(token),
  });

  if (error) {
    return {
      errorMessage: error.message,
      success: false,
    };
  }

  const result =
    data && typeof data === 'object'
      ? (data as { error?: string; success?: boolean })
      : null;

  return {
    errorMessage: result?.error,
    success: Boolean(result?.success),
  };
}

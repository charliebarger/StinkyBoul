const HUNT_CODES_STORAGE_KEY = 'stinkyboul.hunt-codes';

export type StoredHuntCode = {
  desktopSegments: readonly string[];
  id: number;
  mobileCode: string;
};

function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function isStoredHuntCode(value: unknown): value is StoredHuntCode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    desktopSegments?: unknown;
    id?: unknown;
    mobileCode?: unknown;
  };

  return (
    typeof candidate.id === 'number' &&
    Array.isArray(candidate.desktopSegments) &&
    candidate.desktopSegments.every((segment) => typeof segment === 'string') &&
    typeof candidate.mobileCode === 'string'
  );
}

function normalizeStoredHuntCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const codes = value
    .filter(isStoredHuntCode)
    .map((code) => ({
      desktopSegments: [...code.desktopSegments],
      id: code.id,
      mobileCode: code.mobileCode,
    }));

  return codes.length > 0 ? codes : null;
}

export async function getStoredHuntCodes() {
  if (isChromeStorageAvailable()) {
    const storedValues = await chrome.storage.local.get(HUNT_CODES_STORAGE_KEY);
    return normalizeStoredHuntCodes(storedValues[HUNT_CODES_STORAGE_KEY]);
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(HUNT_CODES_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeStoredHuntCodes(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export async function setStoredHuntCodes(codes: readonly StoredHuntCode[]) {
  const normalizedCodes = codes.map((code) => ({
    desktopSegments: [...code.desktopSegments],
    id: code.id,
    mobileCode: code.mobileCode,
  }));

  if (isChromeStorageAvailable()) {
    await chrome.storage.local.set({
      [HUNT_CODES_STORAGE_KEY]: normalizedCodes,
    });
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      HUNT_CODES_STORAGE_KEY,
      JSON.stringify(normalizedCodes),
    );
  }
}

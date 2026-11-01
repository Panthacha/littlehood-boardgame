// A random id kept in this browser so the server can tell "the same phone
// coming back" (refresh, screen sleep) apart from "a different phone" when
// locking each house to one device. Falls back to a per-tab id if storage
// is unavailable (private mode).
const KEY = 'lh-device-id';
let fallback: string | null = null;

const makeId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    if (!fallback) fallback = makeId();
    return fallback;
  }
};

// Only short-lived Link/user tokens enter the browser. API credentials and
// Plaid access tokens remain server-side.
type LinkHandle = { open(): void; destroy?(): void; close?(): void };
type PlaidOptions = {
  token: string;
  receivedRedirectUri?: string;
  onSuccess(token: string): void;
  onExit(): void;
};
type ArgyleOptions = {
  userToken: string;
  sandbox: boolean;
  flowId: string;
  onAccountConnected(): void;
  onClose(): void;
  onAccountError(): void;
  onTokenExpired(update: (token: string) => void): void;
};
declare global {
  interface Window {
    Plaid?: { create(options: PlaidOptions): LinkHandle };
    Argyle?: { create(options: ArgyleOptions): LinkHandle };
  }
}
const loads = new Map<string, Promise<void>>();
function loadScript(url: string) {
  const existing = loads.get(url);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    const timer = setTimeout(() => {
      script.remove();
      loads.delete(url);
      reject(
        new Error("Account linking took too long to load. Please try again.")
      );
    }, 20_000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      loads.delete(url);
      reject(new Error("Account linking could not load. Please try again."));
    };
    document.head.appendChild(script);
  });
  loads.set(url, promise);
  return promise;
}
export async function openPlaid(options: PlaidOptions) {
  await loadScript("https://cdn.plaid.com/link/v2/stable/link-initialize.js");
  if (!window.Plaid)
    throw new Error("Bank linking is temporarily unavailable.");
  const handle = window.Plaid.create(options);
  handle.open();
  return handle;
}
export async function openArgyle(options: ArgyleOptions) {
  await loadScript("https://plugin.argyle.com/argyle.web.v5.js");
  if (!window.Argyle)
    throw new Error("Gig linking is temporarily unavailable.");
  const handle = window.Argyle.create(options);
  handle.open();
  return handle;
}

const STORAGE_KEY = 'quest-pty-host';

type Listener = (host: string) => void;
const listeners = new Set<Listener>();

let currentHost: string | null = null;

export function getPtyHost(): string | null {
  if (currentHost) return currentHost;

  // Check URL param first: ?pty=hostname
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('pty');
  if (fromUrl) {
    currentHost = fromUrl;
    localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  // Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    currentHost = stored;
    return stored;
  }

  return null;
}

export function setPtyHost(host: string): void {
  currentHost = host;
  localStorage.setItem(STORAGE_KEY, host);
  for (const listener of listeners) {
    listener(host);
  }
}

export function onPtyHostSet(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWsUrl(host: string): string {
  // If it already has a protocol, use it directly
  if (host.startsWith('ws://') || host.startsWith('wss://')) {
    return host.endsWith('/ws') ? host : `${host}/ws`;
  }
  // Cloudflare tunnels and production always use wss
  // Local dev (localhost) can use ws
  const isLocal = host.startsWith('localhost') || host.startsWith('127.');
  const proto = isLocal ? 'ws:' : 'wss:';
  return `${proto}//${host}/ws`;
}

export function getSavedHost(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

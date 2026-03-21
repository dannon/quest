const HOST_KEY = 'quest-pty-host';
const TOKEN_KEY = 'quest-pty-token';

type HostListener = (host: string) => void;
const hostListeners = new Set<HostListener>();

let currentHost: string | null = null;
let currentToken: string | null = null;

// Validates that a value looks like a hostname (with optional port), not a URL with paths/query/fragments
function isValidHost(value: string): boolean {
  // Strip protocol if someone pastes a full URL
  let host = value;
  if (host.startsWith('https://')) host = host.slice(8);
  if (host.startsWith('http://')) host = host.slice(7);
  if (host.startsWith('wss://')) host = host.slice(6);
  if (host.startsWith('ws://')) host = host.slice(5);

  // Reject anything with path, query, or fragment
  if (/[/?#]/.test(host)) return false;

  // Must have at least one dot or be localhost
  if (host.startsWith('localhost') || host.startsWith('127.')) return true;
  if (!/\./.test(host.replace(/:\d+$/, ''))) return false;

  // Basic hostname character check
  return /^[a-zA-Z0-9._:-]+$/.test(host);
}

function normalizeHost(value: string): string {
  let host = value;
  if (host.startsWith('https://')) host = host.slice(8);
  if (host.startsWith('http://')) host = host.slice(7);
  if (host.startsWith('wss://')) host = host.slice(6);
  if (host.startsWith('ws://')) host = host.slice(5);
  // Remove trailing slash
  return host.replace(/\/+$/, '');
}

export function getPtyHost(): string | null {
  if (currentHost) return currentHost;

  const params = new URLSearchParams(location.search);

  // Check URL params: ?pty=hostname&token=secret
  const fromUrl = params.get('pty');
  if (fromUrl) {
    const normalized = normalizeHost(fromUrl);
    if (isValidHost(normalized)) {
      currentHost = normalized;
      localStorage.setItem(HOST_KEY, normalized);
    } else {
      console.warn('[pty-config] invalid host in URL param, ignoring:', fromUrl);
      return null;
    }
  }

  const tokenParam = params.get('token');
  if (tokenParam) {
    currentToken = tokenParam;
    localStorage.setItem(TOKEN_KEY, tokenParam);
  }

  if (currentHost) return currentHost;

  // Fall back to localStorage
  const stored = localStorage.getItem(HOST_KEY);
  if (stored && isValidHost(stored)) {
    currentHost = stored;
    return stored;
  }

  return null;
}

export function getPtyToken(): string {
  if (currentToken) return currentToken;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    currentToken = stored;
    return stored;
  }
  return '';
}

export function setPtyHost(host: string, token?: string): void {
  const normalized = normalizeHost(host);
  if (!isValidHost(normalized)) {
    console.warn('[pty-config] invalid host, ignoring:', host);
    return;
  }
  currentHost = normalized;
  localStorage.setItem(HOST_KEY, normalized);
  if (token) {
    currentToken = token;
    localStorage.setItem(TOKEN_KEY, token);
  }
  for (const listener of hostListeners) {
    listener(normalized);
  }
}

export function onPtyHostSet(listener: HostListener): () => void {
  hostListeners.add(listener);
  return () => hostListeners.delete(listener);
}

export function getWsUrl(host: string): string {
  if (host.startsWith('ws://') || host.startsWith('wss://')) {
    return host.endsWith('/ws') ? host : `${host}/ws`;
  }
  const isLocal = host.startsWith('localhost') || host.startsWith('127.');
  const proto = isLocal ? 'ws:' : 'wss:';
  return `${proto}//${host}/ws`;
}

export function getSavedHost(): string {
  return localStorage.getItem(HOST_KEY) || '';
}

export function getSavedToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

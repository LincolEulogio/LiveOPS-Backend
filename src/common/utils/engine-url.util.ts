export interface EngineUrlConfig {
  host?: string;
  port?: string;
  protocol?: string;
  password?: string;
  isEnabled?: boolean;
  pollingInterval?: number;
}

export function formatEngineUrl(
  config: EngineUrlConfig,
  defaultProtocol: string,
  defaultPort: string,
): string {
  let host = (config.host || '127.0.0.1').trim();
  let port = (config.port || defaultPort).trim();
  let protocol = defaultProtocol;

  // Detect full URL in host field (e.g. ws://127.0.0.1:4455)
  if (host.includes('://')) {
    try {
      const parsed = new URL(host);
      protocol = parsed.protocol.replace(':', '');
      host = parsed.hostname;
      if (parsed.port) port = parsed.port;
    } catch {
      // Fallback cleanup if user pasted malformed URL-like string
      host = host
        .replace(/^(wss?|https?):\/\//, '')
        .split('/')[0]
        .split(':')[0];
    }
  }

  // Wrap IPv6 in brackets if it contains colons and isn't already wrapped
  if (host.includes(':') && !host.startsWith('[') && !host.endsWith(']')) {
    host = `[${host}]`;
  }

  return `${protocol}://${host}:${port}`;
}

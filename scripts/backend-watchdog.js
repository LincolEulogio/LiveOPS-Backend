#!/usr/bin/env node

/**
 * Backend Watchdog
 * - Verifica disponibilidad TCP, API y Socket.IO del backend
 * - Emite alertas cuando cae y cuando vuelve
 *
 * Uso:
 *   node scripts/backend-watchdog.js
 *   node scripts/backend-watchdog.js --once
 *
 * Variables opcionales:
 *   WATCHDOG_BASE_URL=http://localhost:4000
 *   WATCHDOG_INTERVAL_MS=5000
 */

const net = require('net');
const { spawn } = require('child_process');

const baseUrl = process.env.WATCHDOG_BASE_URL || 'http://localhost:4000';
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS || 5000);
const once = process.argv.includes('--once');
const autoRestart =
  process.argv.includes('--auto-restart') ||
  process.env.WATCHDOG_AUTO_RESTART === '1';
const restartCmd = process.env.WATCHDOG_RESTART_CMD || 'npm run start:dev';
const restartCooldownMs = Number(
  process.env.WATCHDOG_RESTART_COOLDOWN_MS || 20000,
);
const maxRestartAttempts = Number(
  process.env.WATCHDOG_MAX_RESTART_ATTEMPTS || 5,
);

let restartAttempts = 0;
let lastRestartAt = 0;
let backendChild = null;
let restarting = false;

function now() {
  return new Date().toISOString();
}

function parseHostPort(urlString) {
  const u = new URL(urlString);
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  return { host: u.hostname, port, protocol: u.protocol };
}

function checkTcp(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let finished = false;

    const done = (ok, error) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({
        ok,
        error: error ? String(error.message || error) : undefined,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false, new Error('TCP timeout')));
    socket.once('error', (err) => done(false, err));

    socket.connect(port, host);
  });
}

async function checkHttp(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      sample: text.slice(0, 120),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      sample: String(err && err.message ? err.message : err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSocketIo(base) {
  const socketPollingUrl = `${base.replace(/\/$/, '')}/socket.io/?EIO=4&transport=polling`;
  const result = await checkHttp(socketPollingUrl, 3500);
  return {
    ...result,
    url: socketPollingUrl,
    handshakeLooksValid:
      result.sample.includes('"sid"') || result.sample.startsWith('0{"sid"'),
  };
}

async function runChecks() {
  const { host, port } = parseHostPort(baseUrl);

  const tcp = await checkTcp(host, port);
  const api = await checkHttp(
    `${baseUrl.replace(/\/$/, '')}/api/v1/auth/check-setup`,
  );
  const sio = await checkSocketIo(baseUrl);

  const healthy = tcp.ok && api.ok && sio.ok;

  return {
    healthy,
    tcp,
    api,
    sio,
  };
}

let prevHealthy = null;

function printResult(result) {
  const tcpTag = result.tcp.ok
    ? 'TCP:OK'
    : `TCP:DOWN(${result.tcp.error || 'error'})`;
  const apiTag = result.api.ok
    ? `API:${result.api.status}`
    : `API:DOWN(${result.api.status || result.api.sample})`;
  const sioTag = result.sio.ok
    ? `SIO:${result.sio.status}${result.sio.handshakeLooksValid ? ':SID' : ''}`
    : `SIO:DOWN(${result.sio.status || result.sio.sample})`;

  const statusTag = result.healthy ? 'HEALTHY' : 'DOWN';
  const line = `[${now()}] ${statusTag} | ${tcpTag} | ${apiTag} | ${sioTag}`;

  if (result.healthy) {
    console.log(`\x1b[32m${line}\x1b[0m`);
  } else {
    process.stdout.write('\u0007');
    console.log(`\x1b[31m${line}\x1b[0m`);
  }

  if (prevHealthy !== null && prevHealthy !== result.healthy) {
    if (result.healthy) {
      console.log(
        `\x1b[36m[${now()}] RECOVERY: backend volvió a estar disponible en ${baseUrl}\x1b[0m`,
      );
    } else {
      console.log(
        `\x1b[33m[${now()}] ALERT: backend cayó o está inestable en ${baseUrl}\x1b[0m`,
      );
    }
  }

  prevHealthy = result.healthy;
}

async function tick() {
  const result = await runChecks();
  printResult(result);

  if (!autoRestart) return;

  // Si está sano, reseteamos el contador para futuras incidencias.
  if (result.healthy) {
    restartAttempts = 0;
    restarting = false;
    return;
  }

  const nowTs = Date.now();
  const inCooldown = nowTs - lastRestartAt < restartCooldownMs;

  if (inCooldown || restarting) return;

  if (restartAttempts >= maxRestartAttempts) {
    console.log(
      `\x1b[31m[${now()}] RESTART BLOCKED: alcanzado máximo de intentos (${maxRestartAttempts}).\x1b[0m`,
    );
    return;
  }

  const childAlive =
    backendChild && !backendChild.killed && backendChild.exitCode == null;
  if (childAlive) {
    // El proceso que arrancamos sigue vivo; evitamos duplicarlo.
    return;
  }

  restarting = true;
  restartAttempts += 1;
  lastRestartAt = nowTs;

  console.log(
    `\x1b[33m[${now()}] AUTO-RESTART #${restartAttempts}: ejecutando \"${restartCmd}\"\x1b[0m`,
  );

  const isWindows = process.platform === 'win32';
  backendChild = spawn(restartCmd, {
    cwd: process.cwd(),
    shell: true,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: !isWindows,
  });

  backendChild.stdout?.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text) console.log(`[watchdog:child] ${text}`);
  });

  backendChild.stderr?.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text) console.error(`[watchdog:child] ${text}`);
  });

  backendChild.on('exit', (code, signal) => {
    console.log(
      `\x1b[35m[${now()}] CHILD EXIT: code=${code ?? 'null'} signal=${signal ?? 'null'}\x1b[0m`,
    );
    restarting = false;
  });

  backendChild.on('error', (err) => {
    console.error(`[${now()}] AUTO-RESTART ERROR:`, err);
    restarting = false;
  });
}

(async function main() {
  console.log(`[${now()}] Backend watchdog iniciado`);
  console.log(`[${now()}] Base URL: ${baseUrl}`);
  console.log(
    `[${now()}] Intervalo: ${intervalMs}ms${once ? ' (modo --once)' : ''}`,
  );
  if (autoRestart) {
    console.log(`[${now()}] Auto-restart: ACTIVADO`);
    console.log(`[${now()}] Restart cmd: ${restartCmd}`);
    console.log(
      `[${now()}] Cooldown: ${restartCooldownMs}ms | Max attempts: ${maxRestartAttempts}`,
    );
  }

  await tick();

  if (once) return;

  setInterval(() => {
    tick().catch((err) => {
      console.error(`[${now()}] Watchdog error:`, err);
    });
  }, intervalMs);
})();

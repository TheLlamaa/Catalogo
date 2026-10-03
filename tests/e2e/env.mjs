import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';

const CANDIDATES = [
  process.env.E2E_CHROMIUM,
  '/opt/pw-browsers/chromium',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

// Usa o Chromium indicado (E2E_CHROMIUM) ou um já instalado; senão deixa o Playwright achar o dele.
export const launch = (opts = {}) => {
  const executablePath = CANDIDATES.find(p => existsSync(p));
  return chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'], ...opts });
};

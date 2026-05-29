import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadedFiles = new Set<string>();

function parseEnvFile(path: string) {
  if (!existsSync(path) || loadedFiles.has(path)) return;
  loadedFiles.add(path);

  const content = readFileSync(path, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

export function loadGoLiveEnv() {
  const cwd = process.cwd();
  parseEnvFile(resolve(cwd, '.env.golive'));
  parseEnvFile(resolve(cwd, '../../.env.golive'));
  parseEnvFile(resolve(cwd, '.env.local'));
}

export function resolveGoLiveBaseUrl() {
  return (process.env.KASWISE_GOLIVE_BASE_URL || 'https://kaswise.com').replace(/\/$/, '');
}

export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy apps/mobile/.env.golive.example to apps/mobile/.env.golive or provide CI secrets.`,
    );
  }
  return value;
}

export function optionalBool(name: string) {
  return ['1', 'true', 'yes', 'on'].includes((process.env[name] || '').toLowerCase());
}

export type GoLiveCredentials = {
  email: string;
  password: string;
};

export function getGoLiveCredentials(): GoLiveCredentials {
  return {
    email: requiredEnv('KASWISE_GOLIVE_EMAIL'),
    password: requiredEnv('KASWISE_GOLIVE_PASSWORD'),
  };
}

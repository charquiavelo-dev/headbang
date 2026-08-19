import { createHash, randomUUID } from 'node:crypto';
import type { OperationResult, OperationStatus } from '../types.js';

const SECRET_KEY = /token|password|secret|authorization|cookie|npm_config_.*auth|api[_-]?key/i;
const SECRET_VALUE = /(bearer\s+|npm_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_]+|glpat-[A-Za-z0-9_-]+)/i;

export function redact<T>(value: T): T {
  const seen = new WeakSet<object>();
  const walk = (input: any, key = ''): any => {
    if (SECRET_KEY.test(key)) return '[REDACTED]';
    if (typeof input === 'string') return SECRET_VALUE.test(input) ? '[REDACTED]' : input;
    if (!input || typeof input !== 'object') return input;
    if (seen.has(input)) return '[CIRCULAR]';
    seen.add(input);
    if (Array.isArray(input)) return input.map((item) => walk(item));
    return Object.fromEntries(Object.entries(input).map(([name, item]) => [name, walk(item, name)]));
  };
  return walk(value);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function planDigest(plan: unknown) { return createHash('sha256').update(stable(redact(plan))).digest('hex'); }
export function requireConfirmation(plan: unknown, confirmation?: string) {
  const digest = planDigest(plan);
  if (confirmation !== digest) throw new Error(`Confirmation required. Re-run with --confirm=${digest}`);
  return digest;
}

export function operation<T>(data: T, status: OperationStatus = 'completed', options: { operationId?: string|undefined; warnings?: string[]; errors?: Array<{code:string;message:string;retryable?:boolean}>; nextActions?: string[]; planDigest?: string } = {}): OperationResult<T> {
  return redact({ operationId: options.operationId ?? randomUUID(), success: status === 'completed' || status === 'already-completed' || status === 'planned', status, data, warnings: options.warnings ?? [], errors: options.errors ?? [], nextActions: options.nextActions ?? [], ...(options.planDigest ? { planDigest: options.planDigest } : {}) }) as OperationResult<T>;
}

import { isAbsolute, relative, resolve } from 'node:path';

export function resolveWithin(root: string, configuredPath: string, label = 'path'): string {
  if (!configuredPath || isAbsolute(configuredPath)) throw new Error(`${label} must be a non-empty repository-relative path.`);
  const base = resolve(root);
  const candidate = resolve(base, configuredPath);
  const rel = relative(base, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${label} escapes the repository: ${configuredPath}`);
  return candidate;
}

export function assertOperationId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid operation id '${id}'.`);
  }
  return id;
}

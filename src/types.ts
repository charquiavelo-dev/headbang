export type Provider = 'github' | 'gitlab' | 'bitbucket' | 'forgejo' | 'generic';
export type Visibility = 'public' | 'private' | 'internal';
export type Strategy = 'git-flow' | 'github-flow' | 'trunk' | 'custom';
export type HistoryMode = 'preserve' | 'snapshot';
export type DeliveryEvent =
  | 'manual'
  | 'feature-start'
  | 'feature-finish'
  | 'release-start'
  | 'release-finish'
  | 'hotfix-start'
  | 'hotfix-finish'
  | 'tag';

export interface TaskDefinition { command: string; cwd?: string; timeoutMs?: number }
export interface ProjectionMap { from: string; to: string }
export interface Projection { include?: string[]; exclude?: string[]; map?: ProjectionMap[] }

export interface Permissions {
  inspect?: boolean;
  review?: boolean;
  commit?: boolean;
  push?: boolean;
  forcePush?: boolean;
  createPr?: boolean;
  mergePr?: boolean;
  release?: boolean;
  flow?: boolean;
}

export interface ReviewConfig {
  tasks?: string[];
  maxDiffBytes?: number;
  blockOn?: ('critical'|'high'|'medium'|'low')[];
}

export interface BranchConfig {
  strategy?: Strategy;
  main?: string;
  develop?: string;
  allowed?: string[];
  featurePrefix?: string;
  releasePrefix?: string;
  hotfixPrefix?: string;
}

export interface ReleaseConfig {
  enabled?: boolean;
  tagPrefix?: string;
  rules?: Record<string, 'major'|'minor'|'patch'|'none'>;
}

export interface DeliveryPolicy {
  allowOn?: DeliveryEvent[];
  autoOn?: DeliveryEvent[];
  requireTag?: boolean;
}

export interface Profile {
  remote: string;
  provider?: Provider;
  sourceRef?: string;
  targetBranch?: string;
  visibility?: Visibility;
  history?: HistoryMode;
  projection?: Projection;
  permissions?: Permissions;
  review?: ReviewConfig;
  branch?: BranchConfig;
  release?: ReleaseConfig;
  delivery?: DeliveryPolicy;
  tasks?: Record<string, TaskDefinition>;
  preDelivery?: string[];
  postDelivery?: string[];
  requireClean?: boolean;
  requireConventionalCommits?: boolean;
}

export interface HeadbangConfig {
  version: 1;
  defaultProfile?: string;
  profiles: Record<string, Profile>;
  tasks?: Record<string, TaskDefinition>;
}

export interface Finding {
  severity: 'critical'|'high'|'medium'|'low'|'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

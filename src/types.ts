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
export interface Projection { include?: string[]; exclude?: string[]; map?: ProjectionMap[]; maxFiles?: number; maxBytes?: number; specialObjects?: 'preserve'|'block' }

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
  publishPackage?: boolean;
  publishReview?: boolean;
  repair?: boolean;
}

export interface ReviewConfig {
  tasks?: string[];
  maxDiffBytes?: number;
  blockOn?: ('critical'|'high'|'medium'|'low')[];
  scope?: 'working-tree'|'staged'|'branch'|'commit'|'change-request';
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
  remote?: string;
  atomicPush?: boolean;
  notes?: { strategy?: 'headbang'|'provider'|'manual'; changelog?: string };
  versionFiles?: Array<{ adapter: 'package-json'|'json'; path: string; jsonPath?: string }>;
  providerRelease?: { enabled?: boolean; draft?: boolean; generatedNotes?: boolean; assets?: string[] };
  artifacts?: { checksums?: boolean; sbom?: boolean; provenance?: boolean; outputDir?: string };
}

export interface PackagePublishConfig {
  enabled?: boolean;
  publisher: 'npm';
  path?: string;
  registry?: string;
  access?: 'public'|'restricted';
  tag?: string;
  provenance?: boolean;
  prePublish?: string[];
  workspaces?: boolean;
}

export interface ChangeRequestConfig {
  enabled?: boolean;
  target?: string;
  draft?: boolean;
  mergeStrategy?: 'merge'|'squash'|'rebase'|'fast-forward';
  deleteBranch?: boolean;
}

export interface ScannerConfig { adapter: 'builtin'|'gitleaks'|'trufflehog'; required?: boolean }

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
  packagePublish?: PackagePublishConfig;
  changeRequest?: ChangeRequestConfig;
  scanners?: ScannerConfig[];
  delivery?: DeliveryPolicy;
  tasks?: Record<string, TaskDefinition>;
  preDelivery?: string[];
  postDelivery?: string[];
  requireClean?: boolean;
  requireConventionalCommits?: boolean;
}

export interface HeadbangConfig {
  version: 1|2;
  defaultProfile?: string;
  profiles: Record<string, Profile>;
  tasks?: Record<string, TaskDefinition>;
  deliverySets?: Record<string, string[]>;
  channels?: Record<string, string[]>;
  plugins?: string[];
}

export interface Finding {
  severity: 'critical'|'high'|'medium'|'low'|'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  fingerprint?: string;
  state?: 'new'|'resolved'|'accepted';
  rationale?: string;
  remediation?: string;
}

export type OperationStatus = 'planned'|'completed'|'partial'|'failed'|'already-completed'|'confirmation-required';
export interface OperationError { code: string; message: string; retryable?: boolean }
export interface OperationResult<T = unknown> {
  operationId: string;
  success: boolean;
  status: OperationStatus;
  data: T;
  warnings: string[];
  errors: OperationError[];
  nextActions: string[];
  planDigest?: string;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

import * as z from 'zod/v4';

const repoPath = z.string().min(1).refine(value => !/^(?:[A-Za-z]:[\\/]|[\\/])/.test(value) && !value.split(/[\\/]+/).includes('..'), {
  message: 'Path must be repository-relative and must not contain .. segments.'
});

const task = z.object({
  command: z.string().min(1),
  cwd: repoPath.optional(),
  timeoutMs: z.number().int().positive().optional()
});

const projection = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  map: z.array(z.object({ from: repoPath, to: repoPath })).optional(),
  maxFiles: z.number().int().positive().optional(),
  maxBytes: z.number().int().positive().optional(),
  specialObjects: z.enum(['preserve','block']).optional()
});

const permissions = z.object({
  inspect: z.boolean().optional(),
  review: z.boolean().optional(),
  commit: z.boolean().optional(),
  push: z.boolean().optional(),
  forcePush: z.boolean().optional(),
  createPr: z.boolean().optional(),
  mergePr: z.boolean().optional(),
  release: z.boolean().optional(),
  flow: z.boolean().optional(),
  publishPackage: z.boolean().optional(),
  publishReview: z.boolean().optional(),
  repair: z.boolean().optional()
});

const branch = z.object({
  strategy: z.enum(['git-flow','github-flow','trunk','custom']).optional(),
  main: z.string().optional(),
  develop: z.string().optional(),
  allowed: z.array(z.string()).optional(),
  featurePrefix: z.string().optional(),
  releasePrefix: z.string().optional(),
  hotfixPrefix: z.string().optional()
});

const release = z.object({
  enabled: z.boolean().optional(),
  tagPrefix: z.string().optional(),
  rules: z.record(z.string(), z.enum(['major','minor','patch','none'])).optional(),
  remote: z.string().optional(),
  atomicPush: z.boolean().optional(),
  notes: z.object({ strategy: z.enum(['headbang','provider','manual']).optional(), changelog: repoPath.optional() }).optional(),
  versionFiles: z.array(z.object({ adapter: z.enum(['package-json','json']), path: repoPath, jsonPath: z.string().optional() })).optional(),
  providerRelease: z.object({ enabled: z.boolean().optional(), draft: z.boolean().optional(), generatedNotes: z.boolean().optional(), assets: z.array(repoPath).optional() }).optional(),
  artifacts: z.object({ checksums: z.boolean().optional(), sbom: z.boolean().optional(), provenance: z.boolean().optional(), outputDir: repoPath.optional() }).optional()
});

const packagePublish = z.object({
  enabled: z.boolean().optional(), publisher: z.literal('npm'), path: repoPath.optional(), registry: z.string().optional(),
  access: z.enum(['public','restricted']).optional(), tag: z.string().optional(), provenance: z.boolean().optional(), prePublish: z.array(z.string()).optional(), workspaces: z.boolean().optional()
});

const changeRequest = z.object({
  enabled: z.boolean().optional(), target: z.string().optional(), draft: z.boolean().optional(),
  mergeStrategy: z.enum(['merge','squash','rebase','fast-forward']).optional(), deleteBranch: z.boolean().optional()
});

const deliveryEvent = z.enum([
  'manual',
  'feature-start',
  'feature-finish',
  'release-start',
  'release-finish',
  'hotfix-start',
  'hotfix-finish',
  'tag'
]);

const delivery = z.object({
  allowOn: z.array(deliveryEvent).optional(),
  autoOn: z.array(deliveryEvent).optional(),
  requireTag: z.boolean().optional()
});

export const profileSchema = z.object({
  remote: z.string().min(1),
  provider: z.enum(['github','gitlab','bitbucket','forgejo','generic']).optional(),
  sourceRef: z.string().optional(),
  targetBranch: z.string().optional(),
  visibility: z.enum(['public','private','internal']).optional(),
  history: z.enum(['preserve','snapshot']).optional(),
  projection: projection.optional(),
  permissions: permissions.optional(),
  review: z.object({
    tasks: z.array(z.string()).optional(),
    maxDiffBytes: z.number().positive().optional(),
    blockOn: z.array(z.enum(['critical','high','medium','low'])).optional(),
    scope: z.enum(['working-tree','staged','branch','commit','change-request']).optional()
  }).optional(),
  branch: branch.optional(),
  release: release.optional(),
  packagePublish: packagePublish.optional(),
  changeRequest: changeRequest.optional(),
  scanners: z.array(z.object({ adapter: z.enum(['builtin','gitleaks','trufflehog']), required: z.boolean().optional() })).optional(),
  delivery: delivery.optional(),
  tasks: z.record(z.string(), task).optional(),
  preDelivery: z.array(z.string()).optional(),
  postDelivery: z.array(z.string()).optional(),
  requireClean: z.boolean().optional(),
  requireConventionalCommits: z.boolean().optional()
});

export const configSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  defaultProfile: z.string().optional(),
  profiles: z.record(z.string(), profileSchema),
  tasks: z.record(z.string(), task).optional(),
  deliverySets: z.record(z.string(), z.array(z.string())).optional(),
  channels: z.record(z.string(), z.array(z.string())).optional(),
  plugins: z.array(z.string()).optional()
});

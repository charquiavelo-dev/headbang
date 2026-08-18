#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { loadConfig,getProfile } from './config/load.js';
import { status } from './commands/status.js';
import { reviewRepo } from './review/reviewer.js';
import { previewDelivery,deliver } from './delivery.js';
import { commit } from './commands/commit.js';
import { releaseInspect } from './commands/release.js';
import { gitFlowStatus } from './workflow.js';
import { finishFlow, startFlow } from './flow-orchestrator.js';
import { deliveryAllowed } from './delivery-policy.js';

const text = (x: any) => ({ content: [{ type: 'text' as const, text: JSON.stringify(x, null, 2) }] });

function build() {
  const server = new McpServer({ name: 'headbang', version: '1.1.2' });

  server.registerTool('headbang_status', {
    description: 'Inspect repository status and remotes. Read-only.',
    inputSchema: z.object({ repo: z.string().default('.') })
  }, async ({ repo }) => text(await status(repo)));

  server.registerTool('headbang_review', {
    description: 'Run deterministic code review, branch policy checks and configured quality gates. Read-only except configured tasks may execute local build/test commands.',
    inputSchema: z.object({ repo: z.string().default('.'), profile: z.string().optional() })
  }, async ({ repo, profile }) => {
    const config = await loadConfig(repo);
    const [name, selected] = getProfile(config, profile);
    return text({ profile: name, ...await reviewRepo(repo, selected, config) });
  });

  server.registerTool('headbang_preview', {
    description: 'Preview a manual policy-driven delivery without modifying Git remotes.',
    inputSchema: z.object({ repo: z.string().default('.'), profile: z.string().optional() })
  }, async ({ repo, profile }) => {
    const config = await loadConfig(repo);
    const [name, selected] = getProfile(config, profile);
    return text(await previewDelivery(repo, name, selected, config));
  });

  server.registerTool('headbang_push', {
    description: 'Primary HEADBANG push tool. Push one profile, or every manually eligible profile with all=true. Uses the same projections, safety checks and policies as delivery. Defaults to dryRun=true.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      profile: z.string().optional(),
      all: z.boolean().default(false),
      dryRun: z.boolean().default(true)
    })
  }, async ({ repo, profile, all, dryRun }) => {
    const config = await loadConfig(repo);
    if (!all) {
      const [name, selected] = getProfile(config, profile);
      return text(await deliver(repo, name, selected, config, { dryRun }));
    }

    const results = [];
    for (const [name, selected] of Object.entries(config.profiles)) {
      const policy = deliveryAllowed(selected, { event: 'manual', tag: null });
      if (!policy.allowed) {
        results.push({ profile: name, skipped: true, reason: policy.reason });
        continue;
      }
      try {
        results.push({ profile: name, success: true, result: await deliver(repo, name, selected, config, { dryRun }) });
      } catch (error: any) {
        results.push({ profile: name, success: false, error: error?.message ?? String(error) });
      }
    }
    return text({ command: 'push', all: true, dryRun, results });
  });

  server.registerTool('headbang_deliver', {
    description: 'Perform a manual delivery according to profile policy. Event-restricted stable/release-only profiles refuse manual delivery. Defaults to dryRun=true.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      profile: z.string().optional(),
      dryRun: z.boolean().default(true)
    })
  }, async ({ repo, profile, dryRun }) => {
    const config = await loadConfig(repo);
    const [name, selected] = getProfile(config, profile);
    return text(await deliver(repo, name, selected, config, { dryRun }));
  });

  server.registerTool('headbang_commit', {
    description: 'Create a Conventional Commit from already staged changes, or stage all only when all=true.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      message: z.string(),
      all: z.boolean().default(false)
    })
  }, async ({ repo, message, all }) => text(await commit(repo, message, all)));

  server.registerTool('headbang_flow_status', {
    description: 'Inspect native Git Flow state, current branch classification and configured prefixes. Read-only.',
    inputSchema: z.object({ repo: z.string().default('.'), profile: z.string().optional() })
  }, async ({ repo, profile }) => {
    const config = await loadConfig(repo);
    const [name, selected] = getProfile(config, profile);
    return text({ profile: name, ...await gitFlowStatus(repo, selected) });
  });

  server.registerTool('headbang_flow_start', {
    description: 'Start a native Git Flow feature, release or hotfix branch. May trigger configured autoOn delivery profiles after local success.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      profile: z.string().optional(),
      kind: z.enum(['feature','release','hotfix']),
      name: z.string().min(1)
    })
  }, async ({ repo, profile, kind, name }) => {
    const config = await loadConfig(repo);
    const [profileName, selected] = getProfile(config, profile);
    return text({ profile: profileName, ...await startFlow(repo, kind, name, selected, config) });
  });

  server.registerTool('headbang_flow_finish', {
    description: 'Finish a native Git Flow branch with review gates, no-ff merge(s), release/hotfix tag when applicable, merge-back, cleanup, then configured event-driven deliveries.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      profile: z.string().optional(),
      kind: z.enum(['feature','release','hotfix']),
      name: z.string().min(1),
      deleteBranch: z.boolean().default(true)
    })
  }, async ({ repo, profile, kind, name, deleteBranch }) => {
    const config = await loadConfig(repo);
    const [profileName, selected] = getProfile(config, profile);
    return text({
      profile: profileName,
      ...await finishFlow(repo, kind, name, selected, config, { review: true, deleteBranch })
    });
  });

  server.registerPrompt('headbang-code-review', {
    title: 'HEADBANG Code Review',
    description: 'Review a HEADBANG repository using deterministic findings first, then inspect correctness, security, concurrency, error handling, tests and maintainability.',
    argsSchema: z.object({ focus: z.string().optional() })
  }, ({ focus }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Run headbang_status and headbang_review before reviewing code. Treat deterministic failures as facts.
Then review the changed code for correctness, security, race conditions, error handling, tests, API compatibility and maintainability. Prioritize actionable findings with severity, file and rationale. Do not invent issues. ${focus ? `Additional focus: ${focus}` : ''}`
      }
    }]
  }));

  server.registerTool('headbang_release_inspect', {
    description: 'Recommend a SemVer bump from Conventional Commits. Does not publish or tag.',
    inputSchema: z.object({
      repo: z.string().default('.'),
      currentVersion: z.string(),
      profile: z.string().optional()
    })
  }, async ({ repo, currentVersion, profile }) => {
    const config = await loadConfig(repo);
    const [, selected] = getProfile(config, profile);
    return text(await releaseInspect(repo, currentVersion, selected.release?.rules ?? {}));
  });

  return server;
}

const handle = serveStdio(() => build());
console.error('HEADBANG MCP 1.1.2 listening on stdio 🤘');
process.on('SIGINT', () => void handle.close());
process.on('SIGTERM', () => void handle.close());

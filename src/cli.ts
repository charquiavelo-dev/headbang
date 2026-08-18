#!/usr/bin/env node
import { printWordmark } from './ui/wordmark.js';
import { c, icons } from './ui/theme.js';
import { status } from './commands/status.js';
import { loadConfig, getProfile } from './config/load.js';
import { previewDelivery, deliver } from './delivery.js';
import { deliveryAllowed } from './delivery-policy.js';
import { reviewRepo } from './review/reviewer.js';
import { commit } from './commands/commit.js';
import { releaseInspect } from './commands/release.js';
import { remoteUrl } from './git/git.js';
import { detectProvider, providerCapabilities } from './providers.js';
import { gitFlowStatus, type GitFlowKind } from './workflow.js';
import { finishFlow, startFlow } from './flow-orchestrator.js';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((x) => x.startsWith('--')));
const vals = argv.filter((x) => !x.startsWith('--'));
const command = vals[0] ?? 'help';
const repo = process.cwd();
const json = flags.has('--json');

function flagValue(name: string) {
  const hit = argv.find((x) => x.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function out(value: unknown) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

function help() {
  printWordmark();
  console.log(`${c.bold('Usage')}
  headbang <command> [options]

${c.bold('Core')}
  status                    Repository, branch and remotes
  doctor                    Validate Git + HEADBANG configuration
  review [profile]          Run deterministic review + quality gates
  commit <message> [--all]  Conventional Commit with optional staging
  push [profile]            Push using the selected profile (primary command)
  push --all                Push every manually eligible profile
  preview [profile]         Show exactly what manual delivery would do
  deliver [profile]         Advanced alias for policy-driven push/delivery
  profiles                  List configured delivery profiles
  providers [profile]       Detect forge and capabilities
  release <version>         Recommend next SemVer from commits

${c.bold('Git Flow')}
  flow status               Show Git Flow state
  feature start <name>      Create feature/<name> from develop
  feature finish <name>     Review + merge feature into develop
  release start <version>   Create release/<version> from develop
  release finish <version>  Review + merge to main, tag, merge back
  hotfix start <name>       Create hotfix/<name> from main
  hotfix finish <name>      Review + merge to main and develop

  Git Flow uses ordinary Git; no separate git-flow installation is required.
  Profiles can auto-deliver on feature/release/hotfix lifecycle events.

${c.bold('Safety')}
  --dry-run          Never mutate a remote
  --json             Machine-readable output
  --no-banner        Hide the wordmark
  --profile=<name>   Select profile for Git Flow commands
  --keep-branch      Do not delete a finished Git Flow branch

${c.bold('MCP')}
  headbang mcp              Start the stdio MCP server
  headbang-mcp              Direct MCP executable

Config: .headbang.json (repo) + ~/.config/headbang/config.json (global)
Docs: README.md and docs/`);
}

async function flowCommand(kind?: GitFlowKind) {
  const cfg = await loadConfig(repo);
  const explicit = flagValue('profile');
  const [profileName, profile] = getProfile(cfg, explicit);
  const action = vals[1];

  if (!kind) {
    if (action !== 'status') throw new Error('Use: headbang flow status [--profile=<name>]');
    return out({ profile: profileName, ...(await gitFlowStatus(repo, profile)) });
  }

  if (action !== 'start' && action !== 'finish') {
    throw new Error(`Use: headbang ${kind} start <name> or headbang ${kind} finish <name>`);
  }

  const name = vals[2];
  if (!name) throw new Error(`${kind} ${action} requires a name/version.`);

  if (action === 'start') {
    return out({ profile: profileName, ...(await startFlow(repo, kind, name, profile, cfg)) });
  }

  return out({
    profile: profileName,
    ...(await finishFlow(repo, kind, name, profile, cfg, {
      review: true,
      deleteBranch: !flags.has('--keep-branch')
    }))
  });
}

async function pushCommand() {
  const cfg = await loadConfig(repo);
  const dryRun = flags.has('--dry-run');

  if (flags.has('--all')) {
    const results = [];
    for (const [name, profile] of Object.entries(cfg.profiles)) {
      const policy = deliveryAllowed(profile, { event: 'manual', tag: null });
      if (!policy.allowed) {
        results.push({ profile: name, skipped: true, reason: policy.reason });
        continue;
      }
      try {
        results.push({ profile: name, success: true, result: await deliver(repo, name, profile, cfg, { dryRun }) });
      } catch (error: any) {
        results.push({ profile: name, success: false, error: error?.message ?? String(error) });
      }
    }
    return out({ command: 'push', all: true, dryRun, results });
  }

  const [name, profile] = getProfile(cfg, vals[1] ?? flagValue('profile'));
  return out(await deliver(repo, name, profile, cfg, { dryRun }));
}

async function main() {
  try {
    if (command === 'mcp') {
      await import('./mcp.js');
      return;
    }

    if (!json && !flags.has('--no-banner') && command !== 'help') printWordmark();
    if (command === 'help' || flags.has('--help')) return help();
    if (command === 'status') return out(await status(repo));

    if (command === 'doctor') {
      const s = await status(repo);
      try {
        const cfg = await loadConfig(s.root);
        return out({
          ok: true,
          git: true,
          config: true,
          node: process.version,
          profiles: Object.keys(cfg.profiles),
          ...s
        });
      } catch (error: any) {
        return out({ ok: false, git: true, config: false, error: error.message });
      }
    }

    if (command === 'commit') {
      const message = vals.slice(1).join(' ');
      if (!message) throw new Error('Commit message is required. Quote it if it contains spaces.');
      return out(await commit(repo, message, flags.has('--all')));
    }

    if (command === 'push') return pushCommand();
    if (command === 'flow') return flowCommand();
    if (command === 'feature') return flowCommand('feature');
    if (command === 'hotfix') return flowCommand('hotfix');
    if (command === 'release' && (vals[1] === 'start' || vals[1] === 'finish')) return flowCommand('release');

    const cfg = await loadConfig(repo);

    if (command === 'profiles') {
      return out(Object.entries(cfg.profiles).map(([name, profile]) => ({
        name,
        remote: profile.remote,
        sourceRef: profile.sourceRef ?? 'HEAD',
        targetBranch: profile.targetBranch ?? 'current',
        visibility: profile.visibility ?? 'private',
        history: profile.history ?? (profile.projection ? 'snapshot' : 'preserve'),
        strategy: profile.branch?.strategy ?? 'custom',
        flowEnabled: profile.permissions?.flow === true,
        allowOn: profile.delivery?.allowOn ?? null,
        autoOn: profile.delivery?.autoOn ?? []
      })));
    }

    if (command === 'release') {
      const version = vals[1] === 'inspect' ? vals[2] : vals[1];
      if (!version) throw new Error('Current version is required, e.g. headbang release 1.4.2');
      const rules = cfg.defaultProfile ? getProfile(cfg)[1].release?.rules ?? {} : {};
      return out(await releaseInspect(repo, version, rules));
    }

    const [name, profile] = getProfile(cfg, vals[1]);
    if (command === 'review') return out({ profile: name, ...(await reviewRepo(repo, profile, cfg)) });
    if (command === 'preview') return out(await previewDelivery(repo, name, profile, cfg));
    if (command === 'deliver') return out(await deliver(repo, name, profile, cfg, { dryRun: flags.has('--dry-run') }));
    if (command === 'providers') {
      const url = await remoteUrl(repo, profile.remote);
      const provider = profile.provider ?? detectProvider(url);
      return out({ url, ...providerCapabilities(provider) });
    }

    help();
  } catch (error: any) {
    console.error(`${c.red(icons.fail)} ${c.red(error?.message ?? String(error))}`);
    process.exitCode = 1;
  }
}

void main();

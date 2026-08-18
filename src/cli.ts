#!/usr/bin/env node
import { printWordmark } from './ui/wordmark.js';
import { c, icons } from './ui/theme.js';
import { status } from './commands/status.js';
import { loadConfig, getProfile } from './config/load.js';
import { previewDelivery, deliver } from './delivery.js';
import { reviewRepo } from './review/reviewer.js';
import { commit } from './commands/commit.js';
import { releaseInspect } from './commands/release.js';
import { remoteUrl } from './git/git.js';
import { detectProvider, providerCapabilities } from './providers.js';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((x) => x.startsWith('--')));
const vals = argv.filter((x) => !x.startsWith('--'));
const command = vals[0] ?? 'help';
const repo = process.cwd();
const json = flags.has('--json');

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
  preview [profile]         Show exactly what delivery would do
  deliver [profile]         Deliver according to profile policy
  profiles                  List configured delivery profiles
  providers [profile]       Detect forge and capabilities
  release <version>         Recommend next SemVer from commits

${c.bold('Safety')}
  --dry-run   Never mutate a remote
  --json      Machine-readable output
  --no-banner Hide the wordmark

${c.bold('MCP')}
  headbang mcp              Start the stdio MCP server
  headbang-mcp              Direct MCP executable

Config: .headbang.json (repo) + ~/.config/headbang/config.json (global)
Docs: README.md and docs/`);
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
        return out({ ok: true, git: true, config: true, node: process.version, profiles: Object.keys(cfg.profiles), ...s });
      } catch (error: any) {
        return out({ ok: false, git: true, config: false, error: error.message });
      }
    }

    if (command === 'commit') {
      const message = vals.slice(1).join(' ');
      if (!message) throw new Error('Commit message is required. Quote it if it contains spaces.');
      return out(await commit(repo, message, flags.has('--all')));
    }

    const cfg = await loadConfig(repo);
    if (command === 'profiles') {
      return out(Object.entries(cfg.profiles).map(([name, p]) => ({
        name,
        remote: p.remote,
        targetBranch: p.targetBranch ?? 'current',
        visibility: p.visibility ?? 'private',
        history: p.history ?? (p.projection ? 'snapshot' : 'preserve')
      })));
    }

    if (command === 'release') {
      const version = vals[1];
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

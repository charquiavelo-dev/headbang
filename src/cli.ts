#!/usr/bin/env node
import { printWordmark } from './ui/wordmark.js';
import { c, icons } from './ui/theme.js';
import { status } from './commands/status.js';
import { loadConfig, getProfile } from './config/load.js';
import { previewDelivery, deliver } from './delivery.js';
import { reviewRepo } from './review/reviewer.js';
import { remoteUrl } from './git/git.js';
import { detectProvider, providerCapabilities } from './providers.js';
import type { GitFlowKind } from './workflow.js';
import { renderDelivery, renderDoctor, renderFlow, renderGeneric, renderProfiles, renderPushAll, renderRelease, renderReview, renderStatus } from './ui/render.js';
import { app } from './application.js';
import { operation } from './domain/operation.js';
import { PRESETS, type Preset } from './onboarding.js';

const argv = process.argv.slice(2);
const gitSeparator = argv[0] === 'git' ? argv.indexOf('--') : -1;
const controls = gitSeparator >= 0 ? argv.slice(0, gitSeparator) : argv;
const flags = new Set(controls.filter((x) => x.startsWith('--')));
const vals = controls.filter((x) => !x.startsWith('--'));
const command = vals[0] ?? 'help';
const repo = process.cwd();
const json = flags.has('--json');

function flagValue(name: string) {
  const hit = controls.find((x) => x.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function out(value: unknown, renderer: (value: any) => void = renderGeneric) {
  const envelope = value && typeof value === 'object' && 'operationId' in value ? value : operation(value);
  if (json) console.log(JSON.stringify(envelope, null, 2));
  else {renderer((envelope as any).data);if((envelope as any).planDigest)console.log(`\n  Confirmation digest  ${(envelope as any).planDigest}`);}
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
  git -- <args...>          Plan or run any native Git command
  push [profile]            Push using the selected profile (primary command)
  push --all                Push every manually eligible profile
  preview [profile]         Show exactly what manual delivery would do
  deliver [profile]         Advanced alias for policy-driven push/delivery
  profiles                  List configured delivery profiles
  providers [profile]       Detect forge and capabilities
  release <version>         Recommend next SemVer from commits
  release plan <version>    Plan the complete release transaction
  release execute <version> Execute a confirmed release plan
  package plan              Inspect configured package publication
  package publish           Publish through the configured adapter
  change plan|create        Plan or open a provider change request
  change inspect|merge|close <id>  Manage a change request
  branch start <name>       Start a GitHub Flow branch
  init --preset=<name>      Detect and bootstrap project configuration
  config validate|migrate   Validate or explicitly migrate configuration
  operations [id]           Inspect operation journals
  credentials               Show redacted credential availability

${c.bold('Git Flow')}
  flow status               Show Git Flow state
  flow init                 Initialize missing configured develop from main
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
  --confirm=<digest> Authorize the exact immutable plan shown previously
  --approve          Explicitly approve review-comment publication
  --write            Write init output (preview is the default)

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
    if (action === 'status') return out(await app.flowStatus(repo,profileName), renderFlow);
    if (action === 'init') return out(await app.flowInit(repo,profileName), renderFlow);
    throw new Error('Use: headbang flow status|init [--profile=<name>]');
  }

  if (action !== 'start' && action !== 'finish') {
    throw new Error(`Use: headbang ${kind} start <name> or headbang ${kind} finish <name>`);
  }

  const name = vals[2];
  if (!name) throw new Error(`${kind} ${action} requires a name/version.`);

  if (action === 'start') {
    return out(await app.flowStart(repo, kind, name, profileName), renderFlow);
  }

  return out(await app.flowFinish(repo, kind, name, profileName,{deleteBranch:!flags.has('--keep-branch')}), renderFlow);
}

async function pushCommand() {
  const cfg = await loadConfig(repo);
  const dryRun = flags.has('--dry-run');

  if (flags.has('--all')) {
    const result=await app.deliverAll(repo,dryRun);if(result.status==='partial')process.exitCode=1;return out(result,renderPushAll);
  }

  const requested = vals[1] ?? flagValue('profile');
  try {
    const [name, profile] = getProfile(cfg, requested);
    return out(await app.deliver(repo, name, dryRun), renderDelivery);
  } catch (error: any) {
    if (requested) {
      const s = await status(repo);
      const remoteNames = [...new Set((s.remotes ?? []).map((raw: string) => raw.split('\t')[0]).filter(Boolean))];
      if (remoteNames.includes(requested) && !cfg.profiles[requested]) {
        throw new Error(`'${requested}' is a Git remote, but no HEADBANG profile named '${requested}' exists. HEADBANG will not bypass delivery policy and push the full repository implicitly. Add a '${requested}' profile to .headbang.json first.`);
      }
    }
    throw error;
  }
}

async function main() {
  try {
    if (command === 'mcp') {
      await import('./mcp.js');
      return;
    }

    if (!json && !flags.has('--no-banner') && command !== 'help') printWordmark();
    if (command === 'help' || flags.has('--help')) return help();
    if (command === 'status') return out(await status(repo), renderStatus);

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
        }, renderDoctor);
      } catch (error: any) {
        return out({ ok: false, git: true, config: false, error: error.message }, renderDoctor);
      }
    }

    if (command === 'commit') {
      const message = vals.slice(1).join(' ');
      if (!message) throw new Error('Commit message is required. Quote it if it contains spaces.');
      return out(await app.commit(repo, message, flags.has('--all'),flagValue('profile')));
    }

    if (command === 'git') {
      if(gitSeparator<0||gitSeparator===argv.length-1)throw new Error('Use: headbang git [--profile=<name>] [--confirm=<digest>] -- <git-args...>');
      const args=argv.slice(gitSeparator+1),confirmation=flagValue('confirm');
      return out(confirmation?await app.gitExecute(repo,flagValue('profile'),args,confirmation):await app.gitPlan(repo,flagValue('profile'),args));
    }

    if (command === 'push') return pushCommand();
    if (command === 'flow') return flowCommand();
    if (command === 'feature') return flowCommand('feature');
    if (command === 'hotfix') return flowCommand('hotfix');
    if (command === 'release' && (vals[1] === 'start' || vals[1] === 'finish')) return flowCommand('release');

    if (command === 'branch' && vals[1] === 'start') {
      if (!vals[2]) throw new Error('Use: headbang branch start <name>');
      return out(await app.githubFlowStart(repo, vals[2], flagValue('profile')));
    }
    if (command === 'package') {
      if (vals[1] === 'plan') return out(await app.packagePlan(repo, flagValue('profile')));
      if (vals[1] === 'publish') return out(await app.packagePublish(repo, flagValue('profile'), flagValue('confirm'), flags.has('--dry-run')));
      throw new Error('Use: headbang package plan|publish [--confirm=<digest>] [--dry-run]');
    }
    if (command === 'init') {
      const preset=flagValue('preset') as Preset|undefined;
      if (!preset||!PRESETS.includes(preset)) throw new Error(`Use: headbang init --preset=<${PRESETS.join('|')}> [--write]`);
      return out(await app.init(repo,preset,flags.has('--write'),flags.has('--force')));
    }
    if (command === 'config') {
      if(vals[1]==='validate')return out(await app.configValidate(repo));
      if(vals[1]==='migrate')return out(await app.configMigrate(repo,flagValue('confirm')==='migrate-v2'));
      throw new Error('Use: headbang config validate|migrate --confirm=migrate-v2');
    }
    if(command==='credentials')return out(await app.credentials());
    if(command==='plugins')return out(await app.plugins(repo));
    if(command==='operations')return out(vals[1]?await app.journal(repo,vals[1]):await app.journals(repo));
    if(command==='resume'){if(!vals[1])throw new Error('Use: headbang resume <operation-id> --confirm=<digest>');return out(await app.resume(repo,vals[1],flagValue('profile'),flagValue('confirm')));}
    if(command==='repair')return out(await app.repair(repo,flagValue('profile'),flagValue('confirm')==='repair'));
    if(command==='change'){
      const action=vals[1];
      if(action==='plan'||action==='create'){const title=flagValue('title');if(!title)throw new Error('Change request requires --title=<text>.');const input={title,body:flagValue('body')??'',source:flagValue('source'),target:flagValue('target'),draft:flags.has('--draft'),confirmation:flagValue('confirm')};return out(action==='plan'?await app.changePlan(repo,flagValue('profile'),input):await app.changeCreate(repo,flagValue('profile'),input));}
      if(action==='inspect'||action==='checks'||action==='reviewers'||action==='merge'||action==='close'){const id=Number(vals[2]);if(!Number.isInteger(id)||id<1)throw new Error(`Use: headbang change ${action} <id>`);return out(await app.changeAction(repo,flagValue('profile'),id,action,flagValue('confirm')));}
      if(action==='publish-review'){const id=Number(vals[2]),body=flagValue('body');if(!Number.isInteger(id)||!body)throw new Error('Use: headbang change publish-review <id> --body=<text> --approve');return out(await app.reviewPublish(repo,flagValue('profile'),id,body,flags.has('--approve')));}
      throw new Error('Use: headbang change plan|create|inspect|checks|reviewers|merge|close|publish-review');
    }
    if(command==='deliver-set'||command==='deliver-channel'){const name=vals[1];if(!name)throw new Error(`Use: headbang ${command} <name>`);return out(await app.deliverGroup(repo,command==='deliver-set'?'set':'channel',name,flags.has('--dry-run')),renderPushAll);}

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
      })), renderProfiles);
    }

    if (command === 'release') {
      if(vals[1]==='plan'||vals[1]==='execute'){const version=vals[2];if(!version)throw new Error(`Use: headbang release ${vals[1]} <version>`);return out(vals[1]==='plan'?await app.releasePlan(repo,version,flagValue('profile')):await app.releaseExecute(repo,version,flagValue('profile'),flagValue('confirm'),flags.has('--dry-run')),renderRelease);}
      const version = vals[1] === 'inspect' ? vals[2] : vals[1];
      if (!version) throw new Error('Current version is required, e.g. headbang release 1.4.2');
      return out(await app.releaseInspect(repo,version,flagValue('profile')),renderRelease);
    }

    const [name, profile] = getProfile(cfg, vals[1]);
    if (command === 'review') return out({ profile: name, ...(await reviewRepo(repo, profile, cfg)) }, renderReview);
    if (command === 'preview') return out(await previewDelivery(repo, name, profile, cfg), renderDelivery);
    if (command === 'deliver') return out(await deliver(repo, name, profile, cfg, { dryRun: flags.has('--dry-run') }), renderDelivery);
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

import { c, icons } from './theme.js';

const line = (label: string, value: unknown, width = 15) =>
  `  ${c.dim(label.padEnd(width))}${String(value)}`;

export function section(title: string) {
  console.log(`\n${c.bold(title)}`);
}

export function renderStatus(value: any) {
  console.log(`${c.green(icons.ok)} ${c.bold('Repository ready')}`);
  console.log(line('Root', value.root));
  console.log(line('Branch', value.branch));
  console.log(line('Commit', String(value.commit).slice(0, 12)));
  console.log(line('Working tree', value.clean ? c.green('clean') : c.yellow('dirty')));

  section(`Remotes (${value.remotes?.length ?? 0})`);
  const seen = new Map<string, { fetch?: string; push?: string }>();
  for (const raw of value.remotes ?? []) {
    const match = String(raw).match(/^([^\t]+)\t(.+) \((fetch|push)\)$/);
    if (!match) {
      console.log(`  ${icons.dot} ${raw}`);
      continue;
    }
    const [, name, url, kind] = match as [string, string, string, string];
    const entry = seen.get(name) ?? {};
    entry[kind as 'fetch'|'push'] = url;
    seen.set(name, entry);
  }
  for (const [name, urls] of seen) {
    console.log(`  ${c.cyan(name)}`);
    if (urls.fetch) console.log(`    ${c.dim('fetch')}  ${urls.fetch}`);
    if (urls.push) console.log(`    ${c.dim('push')}   ${urls.push}`);
  }
}

export function renderDoctor(value: any) {
  const ok = Boolean(value.ok);
  console.log(`${ok ? c.green(icons.ok) : c.red(icons.fail)} ${c.bold(ok ? 'HEADBANG is ready' : 'HEADBANG needs attention')}`);
  console.log(line('Git', value.git ? c.green('ok') : c.red('failed')));
  console.log(line('Config', value.config ? c.green('ok') : c.red('missing/invalid')));
  console.log(line('Node', value.node ?? process.version));
  if (Array.isArray(value.profiles)) console.log(line('Profiles', value.profiles.length ? value.profiles.join(', ') : c.yellow('none')));
  if (value.error) console.log(`\n  ${c.red(icons.fail)} ${value.error}`);
}

export function renderProfiles(rows: any[]) {
  if (!rows.length) {
    console.log(`${c.yellow(icons.warn)} ${c.bold('No HEADBANG delivery profiles configured.')}`);
    console.log(`  Git remotes and HEADBANG profiles are intentionally different.`);
    console.log(`  A profile defines what may leave the repository, not just where it goes.`);
    return;
  }
  console.log(`${c.green(icons.ok)} ${c.bold(`${rows.length} delivery profile${rows.length === 1 ? '' : 's'}`)}`);
  for (const row of rows) {
    console.log(`\n  ${c.cyan(c.bold(row.name))}  ${c.dim(`${row.remote} → ${row.targetBranch}`)}`);
    console.log(`    source     ${row.sourceRef}`);
    console.log(`    visibility ${row.visibility}`);
    console.log(`    history    ${row.history}`);
    console.log(`    strategy   ${row.strategy}`);
    if (row.autoOn?.length) console.log(`    auto on    ${row.autoOn.join(', ')}`);
  }
}

export function renderPushAll(value: any) {
  const results = value.results ?? [];
  if (!results.length) return;

  console.log(`${c.bold(value.dryRun ? 'Push preview' : 'Push results')}`);
  for (const item of results) {
    if (item.skipped) {
      console.log(`  ${c.yellow(icons.warn)} ${c.bold(item.profile)}  ${c.dim('skipped')}`);
      console.log(`    ${item.reason}`);
    } else if (item.success) {
      const r = item.result ?? {};
      const target = `${r.remote ?? '?'}:${r.targetBranch ?? '?'}`;
      console.log(`  ${c.green(icons.ok)} ${c.bold(item.profile)}  ${c.dim(target)}`);
      if (r.dryRun) console.log(`    preview only — remote was not modified`);
      else console.log(`    pushed ${r.sourceRef ?? r.source ?? 'HEAD'} ${icons.arrow} ${target}`);
    } else {
      console.log(`  ${c.red(icons.fail)} ${c.bold(item.profile)}`);
      console.log(`    ${item.error}`);
    }
  }
  const ok = results.filter((x: any) => x.success).length;
  const skipped = results.filter((x: any) => x.skipped).length;
  const failed = results.filter((x: any) => x.success === false).length;
  console.log(`\n  ${c.bold('Summary')}  ${c.green(`${ok} pushed`)}  ${skipped ? c.yellow(`${skipped} skipped`) : ''}  ${failed ? c.red(`${failed} failed`) : ''}`.trimEnd());
}

export function renderDelivery(value: any) {
  const dry = Boolean(value.dryRun);
  console.log(`${dry ? c.cyan(icons.dot) : c.green(icons.ok)} ${c.bold(dry ? 'Delivery preview' : 'Delivery complete')}`);
  console.log(line('Profile', value.profile));
  console.log(line('Source', value.sourceRef ?? String(value.source ?? '').slice(0, 12)));
  console.log(line('Destination', `${value.remote}:${value.targetBranch}`));
  console.log(line('Mode', value.mode ?? value.history));
  console.log(line('Visibility', value.visibility));
  if (value.filesIncluded !== undefined) console.log(line('Included', `${value.filesIncluded} files`));
  if (value.filesExcluded !== undefined) console.log(line('Excluded', `${value.filesExcluded} files`));
  if (dry) console.log(`\n  ${c.dim('No remote changes were made.')}`);
}

export function renderReview(value: any) {
  const findings = value.findings ?? [];
  const blocking = findings.filter((x: any) => ['critical','high'].includes(x.severity));
  console.log(`${blocking.length ? c.red(icons.fail) : c.green(icons.ok)} ${c.bold(blocking.length ? 'Review blocked' : 'Review passed')}`);
  console.log(line('Branch', value.branch ?? 'current'));
  console.log(line('Findings', findings.length));
  if (value.tasks?.length) console.log(line('Gates', `${value.tasks.length} executed`));
  for (const finding of findings) {
    console.log(`  ${finding.severity === 'critical' || finding.severity === 'high' ? c.red(icons.fail) : c.yellow(icons.warn)} [${finding.severity}] ${finding.message}`);
    if (finding.file) console.log(`    ${c.dim(`${finding.file}${finding.line ? `:${finding.line}` : ''}`)}`);
  }
}

export function renderRelease(value: any) {
  console.log(`${c.green(icons.ok)} ${c.bold('Release analysis')}`);
  if (value.currentVersion) console.log(line('Current', value.currentVersion));
  if (value.recommendedVersion) console.log(line('Recommended', c.cyan(value.recommendedVersion)));
  else if (value.nextVersion) console.log(line('Recommended', c.cyan(value.nextVersion)));
  if (value.bump) console.log(line('Bump', value.bump));
  if (value.reason) console.log(line('Reason', value.reason));
}

export function renderFlow(value: any) {
  const success = value.success !== false;
  console.log(`${success ? c.green(icons.ok) : c.red(icons.fail)} ${c.bold(value.action ? `Git Flow ${value.action} complete` : 'Git Flow status')}`);
  if (value.kind) console.log(line('Kind', value.kind));
  if (value.branch) console.log(line('Branch', value.branch));
  if (value.currentBranch) console.log(line('Current', value.currentBranch));
  if (value.tag) console.log(line('Tag', value.tag));
  for (const merge of value.merges ?? []) console.log(`  ${icons.arrow} merged ${merge.from} → ${merge.to}`);
  for (const delivery of value.deliveries ?? []) {
    console.log(`  ${delivery.success ? c.green(icons.ok) : c.red(icons.fail)} delivery ${delivery.profile}`);
  }
}

export function renderGeneric(value: any) {
  if (typeof value === 'string') return console.log(value);
  if (Array.isArray(value)) {
    for (const item of value) console.log(`  ${icons.dot} ${typeof item === 'string' ? item : JSON.stringify(item)}`);
    return;
  }
  for (const [key, val] of Object.entries(value ?? {})) {
    if (Array.isArray(val)) console.log(line(key, val.join(' ')));
    else if (typeof val !== 'object') console.log(line(key, val));
  }
}

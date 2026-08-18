import type { HeadbangConfig, Profile } from './types.js';
import { autoProfilesForEvent, type DeliveryContext } from './delivery-policy.js';
import { deliver } from './delivery.js';
import { gitFlowFinish, gitFlowStart, type GitFlowKind, type GitFlowOptions } from './workflow.js';

async function runAutoDeliveries(repo: string, config: HeadbangConfig, context: DeliveryContext) {
  const profiles = autoProfilesForEvent(config, context.event);
  const results: any[] = [];

  for (const { name, profile } of profiles) {
    try {
      const result = await deliver(repo, name, profile, config, { context });
      results.push({ profile: name, success: true, result });
    } catch (error: any) {
      results.push({ profile: name, success: false, error: error?.message ?? String(error) });
      throw new Error(`Git Flow completed locally, but automatic delivery '${name}' failed: ${error?.message ?? String(error)}`);
    }
  }

  return results;
}

export async function startFlow(
  repo: string,
  kind: GitFlowKind,
  name: string,
  profile: Profile,
  config: HeadbangConfig
) {
  const result = await gitFlowStart(repo, kind, name, profile);
  const deliveries = await runAutoDeliveries(repo, config, {
    event: result.event,
    sourceRef: result.branch,
    tag: null
  });
  return { ...result, deliveries };
}

export async function finishFlow(
  repo: string,
  kind: GitFlowKind,
  name: string,
  profile: Profile,
  config: HeadbangConfig,
  options: GitFlowOptions = {}
) {
  const result = await gitFlowFinish(repo, kind, name, profile, config, options);
  const deliveries = await runAutoDeliveries(repo, config, {
    event: result.event,
    sourceRef: result.sourceRef,
    tag: result.tag
  });
  return { ...result, deliveries };
}

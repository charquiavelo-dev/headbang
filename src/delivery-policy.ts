import type { DeliveryEvent, HeadbangConfig, Profile } from './types.js';

export interface DeliveryContext {
  event: DeliveryEvent;
  sourceRef?: string;
  tag?: string | null;
}

export interface EventProfile {
  name: string;
  profile: Profile;
}

export function deliveryAllowed(profile: Profile, context: DeliveryContext) {
  const allowOn = profile.delivery?.allowOn;
  const autoOn = profile.delivery?.autoOn ?? [];
  const allowedEvents = allowOn ? new Set([...allowOn, ...autoOn]) : null;

  if (allowedEvents && !allowedEvents.has(context.event)) {
    return {
      allowed: false,
      reason: `Profile is not eligible for '${context.event}'. Allowed events: ${[...allowedEvents].join(', ')}`
    };
  }

  if (profile.delivery?.requireTag && !context.tag) {
    return {
      allowed: false,
      reason: `Profile requires a tagged delivery, but '${context.event}' has no tag.`
    };
  }

  return { allowed: true, reason: null };
}

export function assertDeliveryAllowed(profile: Profile, context: DeliveryContext) {
  const result = deliveryAllowed(profile, context);
  if (!result.allowed) throw new Error(result.reason ?? 'Delivery is not allowed by policy.');
}

export function autoProfilesForEvent(config: HeadbangConfig, event: DeliveryEvent): EventProfile[] {
  return Object.entries(config.profiles)
    .filter(([, profile]) => profile.delivery?.autoOn?.includes(event))
    .map(([name, profile]) => ({ name, profile }));
}

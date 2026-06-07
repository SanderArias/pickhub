import 'server-only';

import type { ActivityModuleCapabilities, ActivityType } from './registry';

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === 'true';
}

const PICKEM_DEFAULTS: ActivityModuleCapabilities = {
  create: true,
  publish: true,
  participate: true,
  manageExisting: true,
  readHistoricalData: true,
};

function getPickemCapabilities(): ActivityModuleCapabilities {
  return {
    create: envFlag('FEATURE_PICKEM_CREATION_ENABLED', PICKEM_DEFAULTS.create),
    publish: envFlag('FEATURE_PICKEM_PUBLISH_ENABLED', PICKEM_DEFAULTS.publish),
    participate: envFlag('FEATURE_PICKEM_PARTICIPATION_ENABLED', PICKEM_DEFAULTS.participate),
    manageExisting: envFlag('FEATURE_PICKEM_MANAGE_EXISTING_ENABLED', PICKEM_DEFAULTS.manageExisting),
    readHistoricalData: envFlag('FEATURE_PICKEM_READ_ENABLED', PICKEM_DEFAULTS.readHistoricalData),
  };
}

const capabilitiesCache = new Map<string, ActivityModuleCapabilities>();

export function getActivityCapabilities(type: ActivityType): ActivityModuleCapabilities {
  const cached = capabilitiesCache.get(type);
  if (cached) return cached;

  let caps: ActivityModuleCapabilities;
  switch (type) {
    case 'pickem':
      caps = getPickemCapabilities();
      break;
    default:
      caps = { ...PICKEM_DEFAULTS };
  }

  capabilitiesCache.set(type, caps);
  return caps;
}

export function isActivityCapabilityEnabled(
  type: ActivityType,
  capability: keyof ActivityModuleCapabilities,
): boolean {
  return getActivityCapabilities(type)[capability];
}

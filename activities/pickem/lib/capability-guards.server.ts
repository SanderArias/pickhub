import 'server-only';

import { getActivityCapabilities } from '@/activities/registry.server';
import type { ActivityModuleCapabilities } from '@/activities/registry';

const ERROR_MESSAGES: Record<keyof ActivityModuleCapabilities, string> = {
  create: "La creación de nuevos Pick'ems está temporalmente deshabilitada.",
  publish: "La publicación de Pick'ems está temporalmente deshabilitada.",
  participate: 'Las nuevas participaciones en Pick\'ems están temporalmente deshabilitadas.',
  manageExisting: 'La gestión de Pick\'ems existentes está temporalmente deshabilitada.',
  readHistoricalData: 'El acceso a los registros de Pick\'ems está temporalmente deshabilitado.',
};

export class PickemCapabilityError extends Error {
  constructor(capability: keyof ActivityModuleCapabilities) {
    super(ERROR_MESSAGES[capability]);
    this.name = 'PickemCapabilityError';
  }
}

export function requirePickemCapability(capability: keyof ActivityModuleCapabilities): void {
  const caps = getActivityCapabilities('pickem');
  if (!caps[capability]) {
    throw new PickemCapabilityError(capability);
  }
}

export function checkPickemCapability(capability: keyof ActivityModuleCapabilities): string | null {
  const caps = getActivityCapabilities('pickem');
  if (!caps[capability]) {
    return ERROR_MESSAGES[capability];
  }
  return null;
}

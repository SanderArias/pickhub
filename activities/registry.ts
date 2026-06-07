export type ActivityType = 'pickem';

export interface ActivityModuleCapabilities {
  create: boolean;
  publish: boolean;
  participate: boolean;
  manageExisting: boolean;
  readHistoricalData: boolean;
}

export interface ActivityModuleDefinition {
  type: ActivityType;
  label: string;
  description: string;
  capabilities: ActivityModuleCapabilities;
}

export const activityRegistry = {
  pickem: {
    type: 'pickem',
    label: "Pick'em",
    description: 'Predicciones de resultados en torneos',
  },
} satisfies Record<string, Omit<ActivityModuleDefinition, 'capabilities'>>;

export function getActivityModule(type: ActivityType) {
  return activityRegistry[type];
}

export type AdminNotificationType = 'approval' | 'rejection' | 'suspension' | 'reactivation';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export const NOTIFICATION_BADGE_LABELS: Record<AdminNotificationType, string> = {
  approval: 'Aprobado',
  rejection: 'Rechazado',
  suspension: 'Suspendido',
  reactivation: 'Restaurado',
};

export const NOTIFICATION_BADGE_VARIANTS: Record<AdminNotificationType, string> = {
  approval: 'text-purple-primary border-purple-border',
  rejection: 'text-danger border-danger-border',
  suspension: 'text-orange-400 border-orange-400/30',
  reactivation: 'text-success border-success/30',
};

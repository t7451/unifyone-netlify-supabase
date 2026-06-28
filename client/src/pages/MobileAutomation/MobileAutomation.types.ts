export interface Schedule {
  id: number;
  name: string;
  description?: string | null;
  cronExpression: string;
  webhookUrl?: string | null;
  workflowId?: string | null;
  enabled: boolean;
  lastRunAt?: Date | null;
  lastRunStatus?: string | null;
  lastRunError?: string | null;
  triggerCount?: number | null;
  nextRunAt?: Date | null;
}

export interface Attribution {
  id: number;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  deepLinkPath?: string | null;
  referralCode?: string | null;
  converted: boolean;
  convertedAt?: Date | null;
  createdAt: Date;
}

export interface CapiEvent {
  id: number;
  eventName: string;
  eventId: string;
  status: string;
  sentAt: Date;
  eventSourceUrl?: string | null;
}

export interface PushSchedule {
  id: number;
  title: string;
  body: string;
  targetAudience: string;
  scheduledAt?: Date | null;
  cronExpression?: string | null;
  recurring: boolean;
  deepLinkPath?: string | null;
  enabled: boolean;
  sentCount: number;
  lastSentAt?: Date | null;
  status: string;
}

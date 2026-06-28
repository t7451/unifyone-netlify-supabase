export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "order"
  | "payment"
  | "team"
  | "social"
  | "lead";

export type NotificationDisplayType = NotificationType | "system";

export type TriggerConfigState = {
  inAppEnabled: boolean;
  n8nEnabled: boolean;
  n8nWebhookUrl: string;
  zapierEnabled: boolean;
  mailchimpEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl: string;
  emailEnabled: boolean;
  emailRecipients: string;
};

export type DateGroup = "Today" | "Yesterday" | "This Week" | "Older";

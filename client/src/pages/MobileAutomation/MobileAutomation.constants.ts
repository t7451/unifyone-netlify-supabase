export const CRON_PRESETS = [
  { label: "Every day at 9am", value: "0 9 * * *" },
  { label: "Daily 10am", value: "0 10 * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every Monday 8am", value: "0 8 * * 1" },
  { label: "Weekly Mon 9am", value: "0 9 * * 1" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Twice daily", value: "0 9,18 * * *" },
  { label: "First of month", value: "0 0 1 * *" },
];

export const AUDIENCE_LABELS: Record<string, string> = {
  all: "All Users",
  active_users: "Active Users",
  inactive_users: "Inactive Users",
  new_users: "New Users",
  custom: "Custom Segment",
};

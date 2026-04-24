import { Resend } from "resend";
import type { EmailMethodConfig, SubmissionPayload } from "@1commerce/spire";

export type EmailSubmitResult = {
  success: boolean;
  resendId?: string;
  error?: string;
};

export async function submitViaEmail(input: {
  config: EmailMethodConfig;
  payload: SubmissionPayload;
  resendApiKey: string;
  fromAddress: string;
}): Promise<EmailSubmitResult> {
  const { config, payload, resendApiKey, fromAddress } = input;

  const subject = substituteTemplate(config.subject_template, payload);
  const body = substituteTemplate(config.body_template, payload);

  const resend = new Resend(resendApiKey);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: [config.to_address],
      subject,
      text: body,
      replyTo: config.reply_to,
    });
    if (result.error) {
      return {
        success: false,
        error: result.error.message ?? JSON.stringify(result.error),
      };
    }
    return { success: true, resendId: result.data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function substituteTemplate(
  template: string,
  payload: SubmissionPayload
): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (m, key: string) => {
    const v = (payload as unknown as Record<string, unknown>)[key];
    if (v === undefined) return m;
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  });
}

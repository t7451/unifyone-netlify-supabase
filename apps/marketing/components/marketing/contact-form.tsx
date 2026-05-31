"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  company: z.string().optional(),
  message: z.string().min(10, "Tell us a little more (10+ chars)"),
});

type Values = z.infer<typeof schema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    try {
      // TODO(integration): POST to /api/contact wired to Resend / n8n / HubSpot.
      await new Promise(r => setTimeout(r, 600));
      // eslint-disable-next-line no-console
      console.log("contact:", values);
      track("form_submit_success", { id: "contact" });
      setSent(true);
    } catch (err) {
      track("form_submit_error", {
        id: "contact",
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-growth-500/30 bg-growth-500/10 p-6 text-growth-600">
        Thanks — we’ll be in touch within 1 business day.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-card sm:p-8"
      data-analytics-form="contact"
      noValidate
    >
      <Field label="Name" error={errors.name?.message}>
        <input
          {...register("name")}
          className="input"
          autoComplete="name"
          aria-invalid={!!errors.name}
        />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          className="input"
          autoComplete="email"
          aria-invalid={!!errors.email}
        />
      </Field>
      <Field label="Company (optional)">
        <input {...register("company")} className="input" />
      </Field>
      <Field label="How can we help?" error={errors.message?.message}>
        <textarea
          {...register("message")}
          rows={4}
          className="input resize-y"
          aria-invalid={!!errors.message}
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        data-analytics-cta="contact-submit"
      >
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
      <style>{`
        .input { height: 2.75rem; border-radius: .5rem; border: 1px solid rgba(11,16,32,.15); padding: 0 .9rem; font-size: .875rem; background: white; }
        .input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.18); }
        textarea.input { height: auto; padding: .75rem .9rem; }
      `}</style>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

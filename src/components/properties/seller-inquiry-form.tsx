"use client";

import {
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { celebrate } from "@/lib/celebrate";
import { ApiError } from "@/services/http-client";
import { inquiriesService } from "@/services/inquiries.service";

type SellerInquiryFormProps = {
  propertyId: string;
  propertyTitle: string;
  sellerName: string;
};

const QUICK_PROMPTS = [
  "I'd like to schedule a visit.",
  "Is the price negotiable?",
  "Can you share more photos?",
  "Is this still available?",
];

export function SellerInquiryForm({
  propertyId,
  propertyTitle,
  sellerName,
}: SellerInquiryFormProps) {
  const { data: session } = useSession();
  // The form can be on the page and in the phone sheet at once, so ids are per instance.
  const uid = useId();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Capture the form node synchronously: after the `await` below, React has
    // finished dispatching the event and resets `event.currentTarget` to null.
    const form = event.currentTarget;
    setSubmitting(true);
    setSubmitted(false);
    setError(null);

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const messageValue = String(formData.get("message") ?? "").trim();

    try {
      await inquiriesService.create(
        {
          type: "PROPERTY",
          propertyId,
          name,
          email,
          phone,
          message: messageValue,
        },
        session?.accessToken,
      );
      form.reset();
      setMessage("");
      setSubmitted(true);
      celebrate();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send this inquiry right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function applyPrompt(prompt: string) {
    setMessage((prev) =>
      prev.includes(prompt) ? prev : prev ? `${prev} ${prompt}` : prompt,
    );
  }

  if (submitted) {
    return (
      <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 p-5 text-center">
        <div className="anim-pop-in mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-emerald-900">
          Inquiry sent to {sellerName}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-700">
          They&apos;ve received your message about {propertyTitle} and will get
          back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="btn-glass mt-4"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-500">Quick start</p>
        {/* One scrolling row on phones, wrapping from sm. */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => applyPrompt(prompt)}
              className="min-h-8 shrink-0 rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 text-xs font-medium text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-100 active:bg-brand-100"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor={`${uid}-name`}
            className="text-xs font-medium text-ink-600"
          >
            Your name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              id={`${uid}-name`}
              name="name"
              required
              autoComplete="name"
              defaultValue={session?.user?.name ?? ""}
              placeholder="e.g. Rahim Ahmed"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${uid}-phone`}
            className="text-xs font-medium text-ink-600"
          >
            Phone number
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              id={`${uid}-phone`}
              name="phone"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              className="h-11 pl-9"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-email`} className="text-xs font-medium text-ink-600">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            id={`${uid}-email`}
            name="email"
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue={session?.user?.email ?? ""}
            placeholder="you@example.com"
            className="h-11 pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${uid}-message`}
          className="text-xs font-medium text-ink-600"
        >
          Message
        </label>
        <Textarea
          id={`${uid}-message`}
          name="message"
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share your budget, visit timing, or any question about this listing..."
          className="resize-none"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn-tactile btn-tactile--block"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send inquiry
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-ink-500">
        <ShieldCheck className="size-3.5 text-brand-500" />
        Your details are shared only with {sellerName}.
      </p>
    </form>
  );
}

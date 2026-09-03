import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TIER_PRICING, type SubscriptionTier } from "@wishlist-wizard/shared";

interface ComingSoonNotifyProps {
  /** Coming-soon tier this sign-up is for (creator / business / enterprise). */
  tier: SubscriptionTier;
  /** Prefill the email field (e.g. the signed-in user's address). */
  defaultEmail?: string;
  /** Visual density — "card" for the marketing plan cards, "inline" elsewhere. */
  variant?: "card" | "inline";
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Coming Soon" email-capture used wherever a Creator-and-above plan would
 * otherwise show a checkout button. Posts to POST /api/tier-interest, which
 * accepts the request with or without an auth token (the public
 * /subscriptions page has no signed-in user).
 */
export default function ComingSoonNotify({ tier, defaultEmail = "", variant = "card", className = "" }: ComingSoonNotifyProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const displayName = TIER_PRICING[tier]?.displayName ?? "this plan";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      const res = (await apiRequest("/api/tier-interest", {
        method: "POST",
        body: { email: trimmed, tier, source: "web" },
      })) as { ok?: boolean; alreadyRegistered?: boolean };

      if (!res?.ok) {
        throw new Error("Unexpected response");
      }
      setState("done");
      setMessage(
        res.alreadyRegistered
          ? `You're already on the list — we'll email you when ${displayName} launches.`
          : `Thanks! We'll email you when ${displayName} launches.`,
      );
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again in a moment.");
    }
  }

  if (state === "done") {
    return (
      <div
        className={`mt-auto flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${className}`}
        role="status"
      >
        <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-700" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  const stacked = variant === "card";

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-auto ${stacked ? "space-y-2" : "flex flex-wrap items-start gap-2"} ${className}`}
    >
      <div className={stacked ? "" : "min-w-[200px] flex-1"}>
        <input
          id={`coming-soon-email-${tier}`}
          type="text"
          inputMode="email"
          autoComplete="email"
          aria-label={`Email address to be notified when ${displayName} launches`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@example.com"
          disabled={state === "submitting"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={state === "submitting"}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 ${stacked ? "w-full" : ""}`}
      >
        {state === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {state === "submitting" ? "Adding you…" : "Notify me when it launches"}
      </button>
      {state === "error" && (
        <p className="w-full text-xs font-medium text-red-600" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

import { useEffect, useMemo, useState } from "react";
import { formatUsd } from "../lib/pricing";

type DonationGateProps = {
  robuxAmount: number | null;
  suggestedDonation: number | null;
  disabled: boolean;
};

type GateResponse = {
  redirectUrl: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const workerApiBase = import.meta.env.VITE_WORKER_API_BASE ?? "";

export function DonationGate({ robuxAmount, suggestedDonation, disabled }: DonationGateProps) {
  const [token, setToken] = useState("");
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);

  const requiresCaptcha = Boolean(turnstileSiteKey);

  const canContinue = useMemo(() => {
    if (!robuxAmount || !suggestedDonation || disabled) {
      return false;
    }
    if (!requiresCaptcha) {
      return true;
    }
    return Boolean(token);
  }, [disabled, robuxAmount, requiresCaptcha, suggestedDonation, token]);

  useEffect(() => {
    if (!requiresCaptcha) {
      setTurnstileReady(true);
      return;
    }
    if (widgetId) return;

    const renderWidget = () => {
      if (!window.turnstile || widgetId) return;
      const id = window.turnstile.render("#turnstile-widget", {
        sitekey: turnstileSiteKey,
        callback: (value: string) => {
          setToken(value);
          setErrorMessage("");
        },
        "expired-callback": () => setToken(""),
        "error-callback": () => {
          setToken("");
          setErrorMessage("Captcha verification failed. Please try again.");
        },
        theme: "dark",
      });
      setWidgetId(id);
      setTurnstileReady(true);
    };

    renderWidget();
    const intervalId = window.setInterval(renderWidget, 300);
    return () => window.clearInterval(intervalId);
  }, [requiresCaptcha, turnstileSiteKey, widgetId]);

  async function handleContinue() {
    if (!canContinue || !robuxAmount || !suggestedDonation) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${workerApiBase}/api/create-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          robuxAmount,
          suggestedDonation,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to continue to donation page.");
      }

      const payload = (await response.json()) as GateResponse;
      window.location.assign(payload.redirectUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create a secure donation session.";
      setErrorMessage(message);
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
      setToken("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Secure Donation Access</h2>
      {!turnstileSiteKey && (
        <p className="helper-text warning">
          Captcha is not configured. Add `VITE_TURNSTILE_SITE_KEY` to enforce verification.
        </p>
      )}
      <div id="turnstile-widget" />
      {requiresCaptcha && !turnstileReady && (
        <p className="helper-text">Loading verification challenge...</p>
      )}
      <p className="helper-text">
        Complete verification, then continue to PayPal with your selected suggested amount:
        {" "}
        {suggestedDonation ? formatUsd(suggestedDonation) : "$0.00"}.
      </p>
      <button
        type="button"
        className="continue-button"
        onClick={handleContinue}
        disabled={!canContinue || isSubmitting}
      >
        {isSubmitting ? "Preparing secure redirect..." : "Continue to Donate"}
      </button>
      {errorMessage && <p className="helper-text warning">{errorMessage}</p>}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { formatUsd } from "../lib/pricing";
import { PaymentIcon, type PaymentMethodId } from "./PaymentIcons";

type DonationGateProps = {
  robuxAmount: number | null;
  suggestedDonation: number | null;
  disabled: boolean;
};

type GateResponse = {
  redirectUrl: string;
};

type PaymentProvider = "paypal" | "stripe";

type PaymentMethodOption = {
  id: PaymentMethodId;
  provider: PaymentProvider;
  label: string;
  description: string;
};

function PaymentMethodLogo({ methodId }: { methodId: PaymentMethodOption["id"] }) {
  return (
    <span className={`payment-logo payment-logo-${methodId}`} aria-hidden="true">
      <PaymentIcon methodId={methodId} />
    </span>
  );
}

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
const paymentMethodOptions: PaymentMethodOption[] = [
  {
    id: "paypal",
    provider: "paypal",
    label: "PayPal",
    description: "Pay with PayPal wallet.",
  },
  {
    id: "venmo",
    provider: "paypal",
    label: "Venmo",
    description: "Pay with Venmo via PayPal checkout.",
  },
  {
    id: "cashapp",
    provider: "stripe",
    label: "Cash App",
    description: "Pay with Cash App via Stripe Checkout.",
  },
  {
    id: "klarna",
    provider: "stripe",
    label: "Klarna",
    description: "Use Klarna via Stripe Checkout.",
  },
  {
    id: "link",
    provider: "stripe",
    label: "Link",
    description: "Use Link via Stripe Checkout.",
  },
  {
    id: "amazonpay",
    provider: "stripe",
    label: "Amazon Pay",
    description: "Use Amazon Pay via Stripe Checkout.",
  },
  {
    id: "card",
    provider: "stripe",
    label: "Debit/Credit Card",
    description: "Pay securely with card via Stripe Checkout.",
  },
  {
    id: "bank",
    provider: "stripe",
    label: "Bank Transfer",
    description: "Pay from your bank account via Stripe Checkout.",
  },
];

export function DonationGate({ robuxAmount, suggestedDonation, disabled }: DonationGateProps) {
  const [token, setToken] = useState("");
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>("paypal");

  const selectedMethod = useMemo(
    () => paymentMethodOptions.find((option) => option.id === selectedMethodId) ?? paymentMethodOptions[0],
    [selectedMethodId],
  );

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
          paymentProvider: selectedMethod.provider,
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
      <h2>Secure Payment</h2>
      {!turnstileSiteKey && (
        <p className="helper-text warning">
          Captcha is not configured. Add `VITE_TURNSTILE_SITE_KEY` to enforce verification.
        </p>
      )}
      <div id="turnstile-widget" />
      {requiresCaptcha && !turnstileReady && (
        <p className="helper-text">Loading verification challenge...</p>
      )}
      <p className="helper-text purchase-summary">
        Choose your payment method then continue with your selected amount:
        {" "}
        <span className="price-highlight">
          {suggestedDonation ? formatUsd(suggestedDonation) : "$0.00"}
        </span>
        .
      </p>
      <fieldset className="payment-methods" disabled={disabled || isSubmitting}>
        <legend className="helper-text payment-methods-legend">Payment options</legend>
        {paymentMethodOptions.map((option) => (
          <label key={option.id} className={`payment-option payment-option-${option.id}`}>
            <input
              type="radio"
              name="paymentMethod"
              value={option.id}
              checked={selectedMethodId === option.id}
              onChange={() => setSelectedMethodId(option.id)}
            />
            <span className="payment-option-content">
              <PaymentMethodLogo methodId={option.id} />
              <span>
                <strong className={`payment-provider-name payment-provider-name-${option.id}`}>
                  {option.label}
                </strong>
                <span className="helper-text payment-option-description">{option.description}</span>
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {!disabled && !robuxAmount && (
        <p className="helper-text warning">Select a tier to enable purchase.</p>
      )}
      {requiresCaptcha && turnstileReady && !token && !disabled && (
        <p className="helper-text warning">Complete Cloudflare verification to enable purchase.</p>
      )}
      <button
        type="button"
        className={`continue-button continue-button-${selectedMethod.id}`}
        onClick={handleContinue}
        disabled={!canContinue || isSubmitting}
      >
        <span className="continue-button-content">
          <span className={`payment-logo payment-logo-${selectedMethod.id}`} aria-hidden="true">
            <PaymentIcon methodId={selectedMethod.id} />
          </span>
          <span>
            {isSubmitting ? "Preparing secure redirect..." : `Continue with ${selectedMethod.label}`}
          </span>
        </span>
      </button>
      {errorMessage && <p className="helper-text warning">{errorMessage}</p>}
    </section>
  );
}

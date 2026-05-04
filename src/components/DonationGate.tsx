import { useEffect, useMemo, useState } from "react";
import { formatUsd } from "../lib/pricing";
import type { PromoConfig, TierConfig } from "../lib/types";
import { PaymentIcon, type PaymentMethodId } from "./PaymentIcons";

type DonationGateProps = {
  robuxAmount: number | null;
  rewardTier: TierConfig | null;
  suggestedDonation: number | null;
  disabled: boolean;
};

type GateResponse = {
  redirectUrl: string;
};

type PromoValidationResponse = {
  valid?: boolean;
  code?: string;
  discountPercent?: number;
  finalDonation?: number;
  error?: string;
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
const LOCAL_PROMOS_STORAGE_KEY = "rovaultx:localPromos";
const isLocalPromoValidationEnabled = import.meta.env.DEV && !workerApiBase;

function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase();
}

function calculateDiscountedDonation(value: number, discountPercent: number): number {
  return Math.max(0, Math.round(value * (1 - discountPercent / 100) * 100) / 100);
}

function readLocalPromos(): PromoConfig[] {
  const storedPromos = window.localStorage.getItem(LOCAL_PROMOS_STORAGE_KEY);
  if (!storedPromos) {
    return [];
  }
  try {
    const payload = JSON.parse(storedPromos) as { promos?: PromoConfig[] };
    return Array.isArray(payload.promos) ? payload.promos : [];
  } catch {
    return [];
  }
}

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

export function DonationGate({
  robuxAmount,
  rewardTier,
  suggestedDonation,
  disabled,
}: DonationGateProps) {
  const [token, setToken] = useState("");
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>("paypal");
  const [promoInputValue, setPromoInputValue] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoConfig | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const selectedMethod = useMemo(
    () => paymentMethodOptions.find((option) => option.id === selectedMethodId) ?? paymentMethodOptions[0],
    [selectedMethodId],
  );

  const requiresCaptcha = Boolean(turnstileSiteKey);

  const finalDonation = useMemo(() => {
    if (!suggestedDonation) {
      return null;
    }
    if (!appliedPromo) {
      return suggestedDonation;
    }
    return calculateDiscountedDonation(suggestedDonation, appliedPromo.discountPercent);
  }, [appliedPromo, suggestedDonation]);

  const discountAmount = useMemo(() => {
    if (!suggestedDonation || finalDonation === null) {
      return null;
    }
    return Math.max(0, Math.round((suggestedDonation - finalDonation) * 100) / 100);
  }, [finalDonation, suggestedDonation]);

  const canContinue = useMemo(() => {
    if (!robuxAmount || !finalDonation || disabled) {
      return false;
    }
    if (!requiresCaptcha) {
      return true;
    }
    return Boolean(token);
  }, [disabled, finalDonation, robuxAmount, requiresCaptcha, token]);

  async function handleApplyPromo() {
    const normalizedCode = normalizePromoCode(promoInputValue);
    if (!normalizedCode) {
      setAppliedPromo(null);
      setPromoMessage("Enter a promo code to apply a discount.");
      return;
    }
    if (!suggestedDonation) {
      setAppliedPromo(null);
      setPromoMessage("Select a tier before applying a promo code.");
      return;
    }
    setIsApplyingPromo(true);
    setPromoMessage("");
    try {
      if (isLocalPromoValidationEnabled) {
        const promo = readLocalPromos().find((item) => normalizePromoCode(item.code) === normalizedCode);
        if (!promo) {
          setAppliedPromo(null);
          setPromoMessage("Promo code not recognized.");
          return;
        }
        const discountPercent = Math.min(100, Math.max(0, Number(promo.discountPercent)));
        setAppliedPromo({ code: normalizePromoCode(promo.code), discountPercent });
        setPromoInputValue(normalizePromoCode(promo.code));
        setPromoMessage(`${normalizePromoCode(promo.code)} applied for ${discountPercent}% off.`);
        return;
      }
      const response = await fetch(`${workerApiBase}/api/validate-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, suggestedDonation }),
      });
      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) as PromoValidationResponse : {};
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not validate promo code.");
      }
      if (!payload.valid || !payload.code || !payload.discountPercent) {
        setAppliedPromo(null);
        setPromoMessage("Promo code not recognized.");
        return;
      }
      setAppliedPromo({ code: payload.code, discountPercent: payload.discountPercent });
      setPromoInputValue(payload.code);
      setPromoMessage(`${payload.code} applied for ${payload.discountPercent}% off.`);
    } catch (error) {
      setAppliedPromo(null);
      setPromoMessage(error instanceof Error ? error.message : "Could not validate promo code.");
    } finally {
      setIsApplyingPromo(false);
    }
  }

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
    if (!canContinue || !robuxAmount || !finalDonation) {
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
          suggestedDonation: finalDonation,
          originalSuggestedDonation: suggestedDonation,
          promoCode: appliedPromo?.code ?? null,
          promoDiscountPercent: appliedPromo?.discountPercent ?? 0,
          paymentProvider: selectedMethod.provider,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to continue to donation page.");
      }

      const payload = (await response.json()) as GateResponse;
      if (rewardTier) {
        window.localStorage.setItem(
          "rovaultx:lastRewardTier",
          JSON.stringify({ robuxAmount: rewardTier.robuxAmount, savedAt: Date.now() }),
        );
      }
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
          {finalDonation !== null ? formatUsd(finalDonation) : "$0.00"}
        </span>
        {appliedPromo && suggestedDonation && discountAmount !== null && discountAmount > 0 && (
          <>
            {" "}
            <span className="promo-original-price">{formatUsd(suggestedDonation)}</span>
            {" "}
            <span className="promo-savings">Save {formatUsd(discountAmount)}</span>
          </>
        )}
        .
      </p>
      <div className="promo-card">
        <div>
          <strong className="promo-title">Promo code</strong>
          <span className="helper-text promo-subtitle">Enter a code before secure payout.</span>
        </div>
        <div className="promo-entry">
          <input
            className="promo-input"
            type="text"
            value={promoInputValue}
            onChange={(event) => {
              setPromoInputValue(event.target.value);
              setAppliedPromo(null);
              setPromoMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleApplyPromo();
              }
            }}
            placeholder="PROMOCODE"
            disabled={disabled || isSubmitting || isApplyingPromo}
          />
          <button
            className="promo-apply-button"
            type="button"
            onClick={handleApplyPromo}
            disabled={disabled || isSubmitting || isApplyingPromo}
          >
            {isApplyingPromo ? "Checking..." : "Apply"}
          </button>
        </div>
        {appliedPromo && (
          <p className="promo-message promo-message-success">
            Currently applied: {appliedPromo.code} for {appliedPromo.discountPercent}% off.
          </p>
        )}
        {!appliedPromo && promoMessage && (
          <p className="promo-message promo-message-error">{promoMessage}</p>
        )}
      </div>
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

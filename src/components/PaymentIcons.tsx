import { siCashapp, siKlarna, siStripe, siVenmo } from "simple-icons";

export type PaymentMethodId =
  | "paypal"
  | "venmo"
  | "cashapp"
  | "card"
  | "bank"
  | "klarna"
  | "link"
  | "amazonpay";

type BrandIconSpec = {
  title: string;
  hex: string;
  path: string;
};

const brandIconsByMethodId: Partial<Record<PaymentMethodId, BrandIconSpec>> = {
  venmo: { title: siVenmo.title, hex: siVenmo.hex, path: siVenmo.path },
  cashapp: { title: siCashapp.title, hex: siCashapp.hex, path: siCashapp.path },
  klarna: { title: siKlarna.title, hex: siKlarna.hex, path: siKlarna.path },
  // Link is a Stripe product; use the Stripe mark for a recognizable brand signal.
  link: { title: "Link (Stripe)", hex: siStripe.hex, path: siStripe.path },
};

function FallbackIcon({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      className="payment-icon-svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PaymentIcon({
  methodId,
  decorative = true,
}: {
  methodId: PaymentMethodId;
  decorative?: boolean;
}) {
  if (methodId === "paypal") {
    return (
      <img
        className="payment-icon-img"
        src="https://cdn.jsdelivr.net/npm/@wp-pay/logos@2.3.2/dist/methods/paypal/method-paypal-640x360.svg"
        alt={decorative ? "" : "PayPal"}
        aria-hidden={decorative ? "true" : undefined}
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (methodId === "amazonpay") {
    return (
      <img
        className="payment-icon-img"
        src="https://api.iconify.design/fa6-brands/amazon-pay.svg?color=%23ffffff"
        alt={decorative ? "" : "Amazon Pay"}
        aria-hidden={decorative ? "true" : undefined}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const brandIcon = brandIconsByMethodId[methodId];
  if (brandIcon) {
    return (
      <svg
        className="payment-icon-svg"
        viewBox="0 0 24 24"
        role="img"
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : brandIcon.title}
        focusable="false"
        style={{ color: `#${brandIcon.hex}` }}
      >
        <path fill="currentColor" d={brandIcon.path} />
      </svg>
    );
  }

  if (methodId === "card") {
    return (
      <FallbackIcon title="Card">
        <path
          fill="currentColor"
          d="M4.5 6.5h15A2.5 2.5 0 0 1 22 9v6.25A2.75 2.75 0 0 1 19.25 18H4.75A2.75 2.75 0 0 1 2 15.25V9A2.5 2.5 0 0 1 4.5 6.5Zm0 2.25A.75.75 0 0 0 3.75 9v.75h16.5V9a.75.75 0 0 0-.75-.75h-15Zm15.75 3H3.75v3.5c0 .69.56 1.25 1.25 1.25h14c.69 0 1.25-.56 1.25-1.25v-3.5ZM6.5 14.75h3.25a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1 0-1.5Z"
        />
      </FallbackIcon>
    );
  }

  if (methodId === "bank") {
    return (
      <FallbackIcon title="Bank transfer">
        <path
          fill="currentColor"
          d="M12 3.5 3 8.2v1.3h18V8.2L12 3.5ZM4.5 11h2.25v6H4.5v-6Zm4.25 0H11v6H8.75v-6Zm4.25 0h2.25v6H13v-6Zm4.25 0h2.25v6H17.25v-6ZM3.75 18.5h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1 0-1.5Z"
        />
      </FallbackIcon>
    );
  }

  return null;
}


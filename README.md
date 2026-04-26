# PrimalAwakeningFunds

Donation-focused React website for `primalawakeningfunds.github.io` with:

- Configurable support tiers and custom amount calculator
- Stock-based tier disabling (low stock and out-of-stock behavior)
- Cloudflare Turnstile verification before PayPal redirect
- Cloudflare Worker handoff so the raw PayPal URL is not shipped in frontend code

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
VITE_WORKER_API_BASE=http://127.0.0.1:8787
VITE_BASE_PATH=/
```

3. Start frontend:

```bash
npm run dev
```

4. In a second terminal, run worker:

```bash
npm run worker:dev
```

## Editable Business Config

Update support tiers in:

- `src/config/siteConfig.json`
- Update live stock in:
- `public/stock.json`

Fields:

- `rateUsdPer1000Robux`: reference pricing rate (`6.5` by default)
- `lowStockThresholdRobux`: when to show low-stock warning
- `tiers`: editable package list
- `allowCustom`, `minimumCustomRobux`, `maximumCustomRobux`: custom option controls

If `stockRobux` in `public/stock.json` is `0`, all tiers and custom flow are disabled.

## Worker Setup (Cloudflare)

Set Worker secrets:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put PAYPAL_DONATION_URL
wrangler secret put HANDOFF_SECRET
```

Set worker vars in `wrangler.toml`:

- `FRONTEND_ORIGIN` should be `https://primalawakeningfunds.github.io`

Deploy worker:

```bash
npm run worker:deploy
```

## PayPal Destination

The configured donation target should be:

- [PayPal donation page](https://www.paypal.com/donate/?hosted_button_id=SZG7N4HCC8YQU)

Use this value for `PAYPAL_DONATION_URL` secret.

## GitHub Pages Deployment

Workflow file:

- `.github/workflows/deploy.yml`

Required GitHub repository secrets:

- `VITE_TURNSTILE_SITE_KEY`
- `VITE_WORKER_API_BASE` (your deployed Worker URL, for example `https://primalawakeningfunds-gateway.<subdomain>.workers.dev`)

Every push to `main` builds and deploys the React site to GitHub Pages.
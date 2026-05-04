# RoVaultX

Donation-focused React website for `rovaultx.github.io` with:

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
wrangler secret put STRIPE_DONATION_URL
wrangler secret put HANDOFF_SECRET
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD
```

Set worker vars in `wrangler.toml`:

- `FRONTEND_ORIGIN` should be `https://rovaultx.github.io`

Create persistent KV namespaces for promos and stock:

```bash
wrangler kv namespace create PROMOS_KV
wrangler kv namespace create STOCK_KV
```

Add the returned namespace bindings to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PROMOS_KV"
id = "your_returned_promos_namespace_id"

[[kv_namespaces]]
binding = "STOCK_KV"
id = "your_returned_stock_namespace_id"
```

Keep using the same namespace `id` values when recommitting or redeploying. Promo edits are stored in `PROMOS_KV` under the `promos` key. Stock edits are stored in `STOCK_KV` under the `stock` key. Both survive Git commits, GitHub Pages redeploys, and Worker redeploys as long as these bindings keep pointing at the same namespaces.

Deploy worker:

```bash
npm run worker:deploy
```

## Private Admin Management

Promos and stock are not stored in this public repository for production. Production values live in Cloudflare KV through the Worker.

To edit production promos or stock:

1. Open `/admin` on the deployed site.
2. Login with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Select `Edit Promos` or `Edit Stock`.
4. Add, remove, or update the values.
5. Click `Save Promos` or `Save Stock`.

Local testing uses browser `localStorage` only. Local test promos and stock do not deploy and do not affect production KV.

## PayPal Destination

The configured donation target should be:

- [PayPal donation page](https://www.paypal.com/donate/?hosted_button_id=)
- [Stripe checkout link](https://donate.stripe.com/)

Use these values for `PAYPAL_DONATION_URL` and `STRIPE_DONATION_URL` secrets.

## GitHub Pages Deployment

Workflow file:

- `.github/workflows/deploy.yml`

Required GitHub repository secrets:

- `VITE_TURNSTILE_SITE_KEY`
- `VITE_WORKER_API_BASE` (your deployed Worker URL, for example `https://RoVaultX-gateway.<subdomain>.workers.dev`)

Every push to `main` builds and deploys the React site to GitHub Pages.
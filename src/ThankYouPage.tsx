import "./styles.css";

export default function ThankYouPage() {
  return (
    <main className="container thank-you-page">
      <header>
        <div className="logo-mark">R$</div>
        <h1>Purchase Received</h1>
        <p className="subtitle">Thank you for your support. Complete the final step below.</p>
      </header>

      <section>
        <h2>Next Step</h2>
        <p className="helper-text">
          Open a ticket in the Discord server and include all of the following:
        </p>
        <ul className="post-purchase-list">
          <li className="helper-text">Your PayPal transaction ID</li>
          <li className="helper-text">
            A Roblox item link we can purchase from you (gamepass or t-shirt etc.)
          </li>
        </ul>
      </section>

      <section>
        <h2>Discord Support</h2>
        <div className="discord-cta-wrap">
          <a
            className="join-server-button"
            href="https://discord.gg/7YHj9jhdgr"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              className="discord-button-icon"
              viewBox="0 0 127.14 96.36"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.09 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.27 8.08C2.79 32.65-1.71 56.6.54 80.21h.02a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.21 68.42 68.42 0 0 1-10.84-5.18c.91-.66 1.8-1.34 2.66-2.04a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2.04a68.68 68.68 0 0 1-10.86 5.19 77.17 77.17 0 0 0 6.9 11.2 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.12-18.95-72.14ZM42.45 65.69c-6.28 0-11.45-5.76-11.45-12.85 0-7.1 5.03-12.85 11.45-12.85 6.42 0 11.56 5.8 11.45 12.85 0 7.09-5.04 12.85-11.45 12.85Zm42.24 0c-6.28 0-11.45-5.76-11.45-12.85 0-7.1 5.03-12.85 11.45-12.85 6.42 0 11.56 5.8 11.45 12.85 0 7.09-5.04 12.85-11.45 12.85Z"
              />
            </svg>
            Join Server
          </a>
        </div>
        <div className="discord-widget-wrap">
          <iframe
            src="https://discord.com/widget?id=1497690295930978347&theme=dark"
            width="350"
            height="500"
            allowTransparency={true}
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            title="Primal Awakening Discord"
          />
        </div>
      </section>
    </main>
  );
}

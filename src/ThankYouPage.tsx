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

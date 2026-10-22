
import { useState } from "react";
import "./App.css";

function App() {
  const [intent, setIntent] = useState(
    "Buy 2 event tickets for under ₹2,000"
  );
  const [budget, setBudget] = useState(2000);
  const [ticketPrice, setTicketPrice] = useState(1800);
  const [serviceFee, setServiceFee] = useState(500);
  const [verified, setVerified] = useState(false);

  const total = Number(ticketPrice) + Number(serviceFee);
  const allowed = total <= Number(budget);

  function verifyPurchase() {
    setVerified(true);
  }

  return (
    <main className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">🔐</span>
          IntentLock<span className="ai"> AI</span>
        </div>
        <span className="secure-label">Purchase protection</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">AI PAYMENT SAFETY</div>
        <h1>Your intent.<br />Your money. Your control.</h1>
        <p>
          Verify every purchase against your original instructions
          before proceeding to payment.
        </p>
      </section>

      <section className="dashboard">
        <div className="panel intent-panel">
          <div className="section-heading">
            <span className="number">01</span>
            <h2>Your purchase intent</h2>
          </div>

          <label htmlFor="intent">What should the AI purchase?</label>
          <textarea
            id="intent"
            value={intent}
            onChange={(e) => {
              setIntent(e.target.value);
              setVerified(false);
            }}
          />

          <label htmlFor="budget">Maximum budget (₹)</label>
          <input
            id="budget"
            type="number"
            min="0"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value);
              setVerified(false);
            }}
          />

          <div className="intent-note">
            <span>✦</span>
            <div>
              <strong>Intent protection</strong>
              <p>Your spending limit is checked before checkout.</p>
            </div>
          </div>
        </div>

        <div className="panel order-panel">
          <div className="section-heading">
            <span className="number">02</span>
            <h2>Checkout details</h2>
          </div>

          <div className="order-item">
            <div>
              <strong>Event tickets</strong>
              <p>2 tickets</p>
            </div>
            <span>₹</span>
            <input
              aria-label="Ticket price"
              type="number"
              min="0"
              value={ticketPrice}
              onChange={(e) => {
                setTicketPrice(e.target.value);
                setVerified(false);
              }}
            />
          </div>

          <div className="order-item">
            <div>
              <strong>Service fee</strong>
              <p>Additional charges</p>
            </div>
            <span>₹</span>
            <input
              aria-label="Service fee"
              type="number"
              min="0"
              value={serviceFee}
              onChange={(e) => {
                setServiceFee(e.target.value);
                setVerified(false);
              }}
            />
          </div>

          <div className="total-row">
            <span>Final total</span>
            <strong>₹{total.toLocaleString("en-IN")}</strong>
          </div>

          <button className="verify-button" onClick={verifyPurchase}>
            Verify purchase <span>→</span>
          </button>

          {verified && (
            <div className={`result ${allowed ? "pass" : "fail"}`}>
              <strong>
                {allowed ? "✓ Purchase matches your budget" : "⚠ Purchase blocked"}
              </strong>
              <p>
                {allowed
                  ? `₹${total.toLocaleString("en-IN")} is within your ₹${Number(budget).toLocaleString("en-IN")} limit.`
                  : `The total exceeds your budget by ₹${(total - Number(budget)).toLocaleString("en-IN")}.`}
              </p>
              {!allowed && (
                <p>Reduce the total or explicitly revise your budget.</p>
              )}
            </div>
          )}
        </div>
      </section>

      <footer>
        <span>IntentLock AI</span>
        <span>AI-assisted · Rules-verified · User-controlled</span>
      </footer>
    </main>
  );
}

export default App;

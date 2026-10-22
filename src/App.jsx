import { useEffect, useMemo, useState } from "react";
import { getHealth, verifyPurchase } from "./services/api";
import "./App.css";

const initialForm = {
  intent: "",
  budget: "",
  itemName: "",
  quantity: "1",
  unitPrice: "",
  taxes: "0",
  bookingFees: "0",
  delivery: "0",
  otherFees: "0",
};

const navigation = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "verify", label: "Verify a purchase", icon: "shield" },
  { id: "scenarios", label: "Adversarial scenarios", icon: "scan" },
  { id: "audit", label: "Audit history", icon: "file" },
];

const scenarios = [
  {
    id: "hidden-fees",
    title: "Fees added at checkout",
    description: "A low advertised price grows after mandatory booking charges.",
    badge: "HIDDEN FEES",
    budget: 2000,
    quantity: 2,
    unitPrice: 900,
    fees: 500,
    explanation: "₹500 in checkout fees are added to a ₹1,800 item subtotal.",
  },
  {
    id: "changed-total",
    title: "Checkout total changes",
    description: "The item price changes between review and checkout.",
    badge: "PRICE CHANGE",
    budget: 2000,
    quantity: 2,
    unitPrice: 1050,
    fees: 100,
    explanation: "The per-item price rises from the illustrative ₹900 to ₹1,050.",
  },
  {
    id: "unexpected-addon",
    title: "Unexpected add-on",
    description: "An optional extra appears in the amount due.",
    badge: "ADD-ON",
    budget: 2000,
    quantity: 2,
    unitPrice: 900,
    fees: 350,
    explanation: "The scenario includes ₹350 of additional charges.",
  },
  {
    id: "missing-fees",
    title: "Fee data is missing",
    description: "Checkout has not disclosed enough charges to calculate a total.",
    badge: "INCOMPLETE DATA",
    explanation: "The backend requires a numeric fees value and cannot verify an unknown amount.",
  },
];

const formatMoney = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const toPaise = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
};

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10M12 7v10" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.5-2.6L20 12M4 12l2.9 5.6A7 7 0 0 0 18.4 15" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [page, setPage] = useState("overview");
  const [health, setHealth] = useState({ status: "checking", error: "" });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scenarioResults, setScenarioResults] = useState({});
  const [scenarioLoading, setScenarioLoading] = useState("");

  const subtotalPaise = useMemo(
    () => toPaise(form.unitPrice) * (Number.parseInt(form.quantity, 10) || 0),
    [form.quantity, form.unitPrice]
  );
  const feeRows = [
    { label: "Estimated taxes", value: form.taxes },
    { label: "Booking & service fees", value: form.bookingFees },
    { label: "Delivery", value: form.delivery },
    { label: "Other charges", value: form.otherFees },
  ];
  const totalFeesPaise = feeRows.reduce((sum, row) => sum + toPaise(row.value), 0);
  const estimatedTotalPaise = subtotalPaise + totalFeesPaise;
  const enteredBudget = Number(form.budget);

  useEffect(() => {
    let active = true;
    getHealth()
      .then(() => {
        if (active) setHealth({ status: "online", error: "" });
      })
      .catch((healthError) => {
        if (active) setHealth({ status: "offline", error: healthError.message });
      });
    return () => {
      active = false;
    };
  }, []);

  function changeForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
    setError("");
  }

  function setExample() {
    setForm({
      intent: "Buy two concert tickets for no more than ₹2,000 in total.",
      budget: "2000",
      itemName: "Concert tickets",
      quantity: "2",
      unitPrice: "900",
      taxes: "0",
      bookingFees: "500",
      delivery: "0",
      otherFees: "0",
    });
    setResult(null);
    setError("");
    setPage("verify");
  }

  async function submitVerification(event) {
    event?.preventDefault();
    setError("");
    setResult(null);

    const quantity = Number(form.quantity);
    const budget = Number(form.budget);
    const unitPrice = Number(form.unitPrice);
    const feesPaise = totalFeesPaise;
    if (
      !form.intent.trim() ||
      form.intent.trim().length > 500 ||
      !Number.isFinite(budget) ||
      budget < 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      ![form.taxes, form.bookingFees, form.delivery, form.otherFees].every(
        (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0
      )
    ) {
      setError("Check the intent, limit, quantity, item price, and each non-negative cost.");
      return;
    }
    const amounts = [budget, unitPrice, ...feeRows.map(({ value }) => Number(value))];
    if (amounts.some((amount) => Number(amount.toFixed(2)) !== amount)) {
      setError("Amounts must have no more than two decimal places.");
      return;
    }
    if (subtotalPaise + feesPaise > 1_000_000_000) {
      setError("Calculated total exceeds the backend limit of ₹10,000,000.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyPurchase({
        intent: form.intent.trim(),
        budget,
        order: {
          quantity,
          unitPrice,
          fees: feesPaise / 100,
          currency: "INR",
        },
      });
      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function runScenario(scenario) {
    setScenarioLoading(scenario.id);
    setScenarioResults((current) => ({ ...current, [scenario.id]: null }));
    if (scenario.id === "missing-fees") {
      setScenarioResults((current) => ({
        ...current,
        [scenario.id]: {
          decision: "NEEDS REVIEW",
          message: "No verification request was sent. The backend requires a numeric fees value, so an unknown amount cannot be evaluated.",
          localGate: true,
        },
      }));
      setScenarioLoading("");
      return;
    }
    try {
      const response = await verifyPurchase({
        intent: "SIMULATION: Buy two concert tickets for no more than ₹2,000 total.",
        budget: scenario.budget,
        order: {
          quantity: scenario.quantity,
          unitPrice: scenario.unitPrice,
          fees: scenario.fees,
          currency: "INR",
        },
      });
      setScenarioResults((current) => ({
        ...current,
        [scenario.id]: { ...response, simulated: true, message: response.explanation },
      }));
    } catch (requestError) {
      setScenarioResults((current) => ({
        ...current,
        [scenario.id]: { error: requestError.message },
      }));
    } finally {
      setScenarioLoading("");
    }
  }

  const currentPage = navigation.find((item) => item.id === page);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setPage("overview")}>
          <span className="brand-mark"><Icon name="shield" size={20} /></span>
          <span>intent<span className="brand-light">lock</span><small>AI PURCHASE SECURITY</small></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${page === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "verify" && <span className="nav-plus"><Icon name="plus" size={14} /></span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-protection">
            <span className="protection-icon"><Icon name="lock" size={17} /></span>
            <div>
              <strong>Policy engine</strong>
              <span>Deterministic · server-side</span>
            </div>
            <span className={`tiny-status ${health.status}`} />
          </div>
          <div className="sidebar-user">
            <div className="avatar">IL</div>
            <div><strong>Local workspace</strong><span>Development prototype</span></div>
            <span className="more-dots" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{currentPage?.label}</strong></div>
          <div className="topbar-right">
            <span className={`connection-pill ${health.status}`}>
              <i />
              {health.status === "online" ? "API connected" : health.status === "checking" ? "Connecting…" : "API unavailable"}
            </span>
            <span className="env-label">LOCAL DEV</span>
          </div>
        </header>

        <main className="content">
          {page === "overview" && (
            <Overview health={health} onNew={setExample} onNavigate={setPage} />
          )}
          {page === "verify" && (
            <VerifyPage
              form={form}
              changeForm={changeForm}
              onSubmit={submitVerification}
              result={result}
              loading={loading}
              error={error}
              subtotalPaise={subtotalPaise}
              feeRows={feeRows}
              totalFeesPaise={totalFeesPaise}
              estimatedTotalPaise={estimatedTotalPaise}
              budget={enteredBudget}
              onClear={() => {
                setForm(initialForm);
                setResult(null);
                setError("");
              }}
            />
          )}
          {page === "scenarios" && (
            <ScenariosPage
              results={scenarioResults}
              loadingId={scenarioLoading}
              onRun={runScenario}
            />
          )}
          {page === "audit" && <AuditPage />}
          <footer className="footer">
            <span>IntentLock AI <i /> Intent integrity layer</span>
            <span>Verification is not payment authorization.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Overview({ health, onNew, onNavigate }) {
  return (
    <>
      <PageHeading
        eyebrow="CONTROL CENTER"
        title="Purchase integrity"
        description="A clear view of what your agent intends to buy—and what you actually agreed to spend."
        action={<button className="button primary" onClick={onNew}><Icon name="plus" size={16} /> New verification</button>}
      />

      <section className="welcome-band">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Icon name="shield" size={14} /> INTENT FIRST. TOTAL COST ALWAYS.</span>
          <h2>Make the final amount<br />answer to your intent.</h2>
          <p>IntentLock checks the complete order total against your stated limit. The server-side policy—not an AI guess—controls the decision.</p>
          <button className="text-link" onClick={onNew}>Start a verification <span>→</span></button>
        </div>
        <div className="welcome-diagram" aria-label="Intent, order total, and policy decision">
          <div className="diagram-orbit orbit-one" />
          <div className="diagram-orbit orbit-two" />
          <div className="diagram-core"><Icon name="lock" size={24} /><span>POLICY</span></div>
          <div className="diagram-node node-intent"><span>01</span>Intent</div>
          <div className="diagram-node node-order"><span>02</span>Order total</div>
          <div className="diagram-node node-decision"><span>03</span>Decision</div>
        </div>
        <div className="welcome-index">SECURITY MODEL / 01</div>
      </section>

      <div className="section-title-row">
        <div><h2>Workspace status</h2><p>Live connectivity and available data</p></div>
        <span className="data-source"><i /> LIVE API STATUS</span>
      </div>
      <section className="status-grid">
        <article className="status-card">
          <div className="status-card-top"><span>VERIFICATION API</span><span className={`status-icon ${health.status}`}><Icon name={health.status === "online" ? "check" : "clock"} size={16} /></span></div>
          <strong className="status-value">{health.status === "online" ? "Connected" : health.status === "checking" ? "Checking…" : "Unavailable"}</strong>
          <p>{health.status === "online" ? "Health endpoint responded successfully." : health.status === "offline" ? health.error : "Checking the backend health endpoint."}</p>
        </article>
        <article className="status-card">
          <div className="status-card-top"><span>RECENT DECISIONS</span><span className="status-icon muted"><Icon name="clock" size={16} /></span></div>
          <strong className="status-value unavailable">Not available</strong>
          <p>The backend does not expose analytics or recent decision data.</p>
        </article>
        <article className="status-card">
          <div className="status-card-top"><span>AUDIT RETENTION</span><span className="status-icon muted"><Icon name="file" size={16} /></span></div>
          <strong className="status-value unavailable">Not configured</strong>
          <p>Verification requests are not persisted as audit records.</p>
        </article>
      </section>

      <div className="overview-lower">
        <section className="surface recent-panel">
          <div className="surface-heading"><div><span className="eyebrow">ACTIVITY</span><h2>Recent decisions</h2></div><button className="quiet-link" onClick={() => onNavigate("audit")}>Audit history <span>→</span></button></div>
          <EmptyState icon="clock" title="No persisted activity yet" text="The verification API returns a decision for each request, but does not currently store or expose decision history." />
        </section>
        <section className="surface policy-panel">
          <div className="surface-heading"><div><span className="eyebrow">ENFORCEMENT</span><h2>Policy, not prediction</h2></div><span className="mini-shield"><Icon name="shield" size={17} /></span></div>
          <p className="policy-description">Every verification calculates the final order total on the backend and compares it against the submitted budget.</p>
          <div className="policy-rule"><span className="rule-index">01</span><span>Item price × quantity</span><b>+</b><span>All submitted fees</span></div>
          <div className="policy-rule"><span className="rule-index">02</span><span>Final total</span><b>≤</b><span>Stated budget</span></div>
          <div className="policy-footnote"><Icon name="alert" size={14} /> Browser-provided limits are not persisted authorization.</div>
        </section>
      </div>
      <div className="overview-cta"><div><strong>Ready to inspect an order?</strong><span>Start with the cost you can see—and identify what checkout may still hide.</span></div><button className="button secondary" onClick={onNew}>Open verification workspace <Icon name="arrow" size={15} /></button></div>
    </>
  );
}

function VerifyPage({ form, changeForm, onSubmit, result, loading, error, subtotalPaise, feeRows, totalFeesPaise, estimatedTotalPaise, budget, onClear }) {
  return (
    <>
      <PageHeading
        eyebrow="NEW VERIFICATION"
        title="Review before you authorize"
        description="Set the intent and limit, then submit the item and fee details to the deterministic backend policy."
        action={<span className="secure-caption"><Icon name="lock" size={14} /> SERVER-SIDE POLICY</span>}
      />
      <div className="prototype-notice"><Icon name="alert" size={17} /><p><strong>Prototype boundary</strong> Inputs on this page are user-provided estimates—not a trusted checkout snapshot or persisted authorization.</p></div>

      <form className="verification-layout" onSubmit={onSubmit}>
        <div className="verification-form">
          <section className="surface form-section">
            <div className="form-section-heading"><span className="step-number">01</span><div><h2>Your intent & limit</h2><p>Describe the purchase and the maximum total you approve.</p></div></div>
            <label className="field-label" htmlFor="intent">Purchase intent</label>
            <textarea id="intent" maxLength={500} value={form.intent} onChange={(event) => changeForm("intent", event.target.value)} placeholder="e.g. Buy two concert tickets for no more than ₹2,000 in total." rows={3} required />
            <div className="field-meta"><span>Natural language is evaluated by the deterministic budget rule only.</span><span>{form.intent.length}/500</span></div>
            <div className="form-row form-row-two">
              <Field label="Maximum total budget" id="budget" prefix="₹" value={form.budget} onChange={(value) => changeForm("budget", value)} type="number" min="0" step="0.01" placeholder="2,000.00" required />
              <div className="field-wrap"><label className="field-label" htmlFor="currency">Currency</label><div className="currency-select"><span className="currency-symbol">₹</span><select id="currency" value="INR" disabled aria-label="Currency. The backend currently supports INR only"><option value="INR">INR · Indian Rupee</option></select><span className="supported-tag">SUPPORTED</span></div></div>
            </div>
          </section>

          <section className="surface form-section order-section">
            <div className="form-section-heading"><span className="step-number">02</span><div><h2>Order details</h2><p>Enter each visible cost. Fees are combined for the backend request.</p></div><span className="source-tag"><i /> USER PROVIDED</span></div>
            <div className="form-row form-row-two">
              <Field label="Item or order name" id="item-name" value={form.itemName} onChange={(value) => changeForm("itemName", value)} placeholder="Concert tickets" />
              <Field label="Quantity" id="quantity" value={form.quantity} onChange={(value) => changeForm("quantity", value)} type="number" min="1" max="10" step="1" required />
            </div>
            <Field label="Price per item" id="unit-price" prefix="₹" value={form.unitPrice} onChange={(value) => changeForm("unitPrice", value)} type="number" min="0" step="0.01" placeholder="900.00" required />

            <div className="cost-group-heading"><span>ADDITIONAL COSTS</span><span>Backend combines these as fees</span></div>
            <div className="fee-grid">
              {[
                ["Taxes", "taxes"],
                ["Booking & service fees", "bookingFees"],
                ["Delivery", "delivery"],
                ["Other charges", "otherFees"],
              ].map(([label, key]) => (
                <Field key={key} label={label} id={key} prefix="₹" value={form[key]} onChange={(value) => changeForm(key, value)} type="number" min="0" step="0.01" />
              ))}
            </div>
            <div className="unsupported-cost"><span className="unsupported-mark">—</span><div><strong>Discounts are not represented by the current API</strong><span>No discount is subtracted from the policy calculation. Include a confirmed net item price in “Price per item”.</span></div></div>
            <div className="unverified-note"><span className="unverified-dot" /><span>All amounts above are entered by you. No independent checkout verification is connected.</span></div>
          </section>

          <div className="form-actions"><button type="button" className="button ghost" onClick={onClear}>Clear form</button><button className="button primary submit-button" type="submit" disabled={loading}><Icon name={loading ? "clock" : "shield"} size={16} />{loading ? "Requesting server decision…" : "Run policy verification"}<span className="button-arrow">→</span></button></div>
          {error && <div className="error-banner" role="alert"><Icon name="alert" size={17} /><div><strong>Verification request failed</strong><span>{error}</span></div></div>}
        </div>

        <aside className="verification-aside">
          <section className="surface cost-card">
            <div className="aside-heading"><div><span className="eyebrow">COST BREAKDOWN</span><h2>Order estimate</h2></div><span className="estimate-tag">NOT VERIFIED</span></div>
            <div className="estimate-source"><span className="source-dot" /> Based on user-entered amounts</div>
            <div className="breakdown-list">
              <div><span>{form.itemName.trim() || "Items"} <small>× {Number.parseInt(form.quantity, 10) || 0}</small></span><strong>{formatMoney(subtotalPaise / 100)}</strong></div>
              {feeRows.map((row) => <div key={row.label}><span>{row.label}</span><strong>{formatMoney(toPaise(row.value) / 100)}</strong></div>)}
              <div className="breakdown-subtotal"><span>Discounts</span><span className="not-supported">Not represented</span></div>
            </div>
            <div className="total-row"><div><span>Estimated payable total</span><small>Subtotal + entered fees</small></div><strong>{formatMoney(estimatedTotalPaise / 100)}</strong></div>
            <div className="limit-comparison"><div><span>Stated budget</span><strong>{form.budget === "" ? "—" : formatMoney(budget)}</strong></div><div className="limit-track"><i style={{ width: `${form.budget && budget > 0 ? Math.min(100, estimatedTotalPaise / (budget * 100) * 100) : 0}%` }} /></div><p>Preview only. The server calculates the decision from its request inputs.</p></div>
          </section>

          <DecisionPanel result={result} loading={loading} budget={budget} />
          <section className="surface trust-card"><span className="trust-icon"><Icon name="lock" size={17} /></span><div><strong>No payment is connected</strong><p>An ALLOW response is a prototype policy result only. It does not initiate or confirm a payment.</p></div></section>
        </aside>
      </form>
    </>
  );
}

function Field({ label, id, value, onChange, type = "text", prefix, ...props }) {
  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className={`input-shell ${prefix ? "with-prefix" : ""}`}>
        {prefix && <span>{prefix}</span>}
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
      </div>
    </div>
  );
}

function DecisionPanel({ result, loading, budget }) {
  const decision = result?.decision;
  const tone = decision === "ALLOW" ? "allow" : decision === "BLOCK" ? "block" : "pending";
  return (
    <section className={`surface decision-card ${result ? `decision-${tone}` : ""}`} aria-live="polite">
      <div className="aside-heading"><div><span className="eyebrow">POLICY RESPONSE</span><h2>Decision</h2></div><span className="decision-lock"><Icon name="shield" size={17} /></span></div>
      {loading ? (
        <div className="decision-empty"><span className="decision-symbol"><Icon name="clock" size={22} /></span><strong>Waiting for backend</strong><p>The policy engine is evaluating the submitted order.</p></div>
      ) : result ? (
        <>
          <div className="decision-result">
            <span className="decision-symbol"><Icon name={tone === "allow" ? "check" : "alert"} size={21} /></span>
            <span className="decision-label">{decision}</span>
            <p>{result.explanation || result.message}</p>
          </div>
          <div className="decision-numbers">
            <div><span>Stated budget</span><strong>{formatMoney(result.budget)}</strong></div>
            <div><span>Server-calculated total</span><strong>{formatMoney(result.total)}</strong></div>
            <div className={result.differencePaise > 0 ? "overage" : "remaining"}><span>{result.differencePaise > 0 ? "Over budget" : "Budget remaining"}</span><strong>{formatMoney(Math.abs(result.difference))}</strong></div>
          </div>
          <div className="policy-id"><span>POLICY APPLIED</span><strong>{result.policyApplied?.id || "Server policy"}</strong></div>
          <div className="request-id"><span>REQUEST ID</span><code>{result.requestId}</code></div>
          <div className="decision-warning"><Icon name="lock" size={15} /><span>Decision only—not payment authorization.</span></div>
        </>
      ) : (
        <div className="decision-empty"><span className="decision-symbol"><Icon name="shield" size={22} /></span><strong>No decision yet</strong><p>Submit the order to receive an actual response from the backend policy.</p><div className="decision-target"><span>LIMIT</span><strong>{Number.isFinite(budget) && budget >= 0 && budget !== 0 ? formatMoney(budget) : "—"}</strong></div></div>
      )}
    </section>
  );
}

function ScenariosPage({ results, loadingId, onRun }) {
  return (
    <>
      <PageHeading eyebrow="THREAT MODEL" title="Pressure-test the total" description="Illustrative adversarial cases. Supported scenarios are sent to the backend policy; each result is labelled simulated and is not persisted." action={<span className="simulation-badge"><span /> SIMULATED TESTS</span>} />
      <div className="scenario-disclaimer"><Icon name="alert" size={17} /><p><strong>Test inputs are not real checkout data.</strong> Scenario requests exercise the existing verification endpoint only. No purchase, authorization, or audit record is created.</p></div>
      <section className="scenario-list">
        {scenarios.map((scenario, index) => {
          const result = results[scenario.id];
          const decision = result?.decision;
          return (
            <article className="surface scenario-card" key={scenario.id}>
              <div className="scenario-index">0{index + 1}</div>
              <div className="scenario-content">
                <div className="scenario-meta"><span className="scenario-tag">{scenario.badge}</span><span className="simulation-label">SIMULATED</span></div>
                <h2>{scenario.title}</h2><p>{scenario.description}</p>
                <span className="scenario-explanation">{scenario.explanation}</span>
                {result && <div className={`scenario-outcome ${result.error ? "has-error" : decision === "BLOCK" ? "is-block" : decision === "ALLOW" ? "is-allow" : "needs-review"}`} role="status">
                  <strong>{result.error ? "REQUEST FAILED" : decision}</strong>
                  <span>{result.error || result.message}</span>
                  {result.requestId && <code>Request {result.requestId}</code>}
                  {result.localGate && <small>Client-side completeness gate; no backend decision was received.</small>}
                </div>}
              </div>
              <div className="scenario-action"><button className="button secondary" onClick={() => onRun(scenario)} disabled={loadingId === scenario.id}>{loadingId === scenario.id ? "Running…" : result ? "Run again" : "Run scenario"}<span>→</span></button>{scenario.id !== "missing-fees" && <small>Submits to API</small>}</div>
            </article>
          );
        })}
      </section>
      <section className="scenario-note"><span className="note-icon"><Icon name="shield" size={17} /></span><p><strong>What the prototype can test</strong><br />The API compares quantity × unit price + a required combined fee amount against the budget. It cannot independently confirm checkout prices, detect undisclosed fees, or persist scenario results.</p></section>
    </>
  );
}

function AuditPage() {
  return (
    <>
      <PageHeading eyebrow="GOVERNANCE" title="Audit history" description="A durable record of decisions requires server-side persistence and traceability." />
      <section className="surface audit-empty">
        <span className="audit-icon"><Icon name="file" size={24} /></span>
        <span className="eyebrow">NO AUDIT DATA AVAILABLE</span>
        <h2>Nothing has been written to an audit log</h2>
        <p>The current backend returns a request ID with each response, but it does not persist verification requests, policy inputs, decisions, timestamps, or user identities. This page intentionally shows no fabricated history.</p>
        <div className="audit-capabilities">
          <div><span className="capability-state available"><Icon name="check" size={14} /></span><div><strong>Request correlation ID</strong><span>Included in the API response and header.</span></div><em>AVAILABLE</em></div>
          <div><span className="capability-state missing"><Icon name="alert" size={14} /></span><div><strong>Persistent audit records</strong><span>Requires a backend storage layer and retention policy.</span></div><em>NOT IMPLEMENTED</em></div>
          <div><span className="capability-state missing"><Icon name="alert" size={14} /></span><div><strong>Authenticated actor & trusted order</strong><span>Requires authentication and verified checkout snapshots.</span></div><em>NOT IMPLEMENTED</em></div>
        </div>
      </section>
    </>
  );
}

function EmptyState({ icon, title, text }) {
  return <div className="empty-state"><span><Icon name={icon} size={19} /></span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

export default App;

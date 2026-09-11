import "./QuantityStepper.css";

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

// Accessible −/value/+ control. `max` may be omitted when there's no known
// ceiling (e.g. stock not loaded yet) — the increment button is simply never
// disabled for reaching a max in that case.
export default function QuantityStepper({ value, min = 1, max, onChange, disabled = false, label = "Quantity" }) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;

  return (
    <div className="qty-stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
      >
        <MinusIcon />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

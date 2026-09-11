import { getOrderTimeline } from "../utils/orderStatus";
import "./OrderStatusTimeline.css";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Status is never conveyed by color alone: each node also carries a
// checkmark/label text and `aria-current`, so it reads correctly without color.
export default function OrderStatusTimeline({ order }) {
  const { stages, interrupted } = getOrderTimeline(order);
  const currentIdx = [...stages].reverse().findIndex((s) => s.done);
  const currentStageIndex = currentIdx === -1 ? -1 : stages.length - 1 - currentIdx;

  return (
    <ol className={`order-timeline ${interrupted ? "interrupted" : ""}`} aria-label="Order progress">
      {stages.map((stage, i) => (
        <li
          key={stage.key}
          className={`order-timeline-stage ${stage.done ? "done" : "pending"} ${
            interrupted && i === stages.length - 1 ? "interrupted-end" : ""
          }`}
          aria-current={i === currentStageIndex ? "step" : undefined}
        >
          <span className="order-timeline-dot" aria-hidden="true">
            {stage.done && <CheckIcon />}
          </span>
          <span className="order-timeline-label">
            {stage.label}
            <span className="order-timeline-sr-status">{stage.done ? " — complete" : " — not yet reached"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

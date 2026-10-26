import { useState } from "react";
import { formatRWF } from "../utils/currency";
import "./SalesChart.css";

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };
const GAP = 2; // surface gap between neighbouring bars

function shortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Rounds the axis top up to a "nice" number so the gridline label is readable.
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

// Daily sales for the last 30 days, one bar per day. `data` is
// [{ date: "2026-10-08", sales: 120000, orders: 3 }, ...].
export default function SalesChart({ data }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.sales)));
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.max(2, slot - GAP);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const activeDay = active !== null ? data[active] : null;

  return (
    <div className="sales-chart">
      <div className="sales-chart-plot" onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Daily sales over the last 30 days" preserveAspectRatio="none">
          {/* recessive gridlines at 0, half and max */}
          {[0, 0.5, 1].map((f) => (
            <line key={f} className="sales-chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(max * f)} y2={y(max * f)} />
          ))}

          {data.map((d, i) => {
            const x = PAD.left + i * slot + GAP / 2;
            const h = Math.max(0, PAD.top + plotH - y(d.sales));
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={d.date}>
                {h > 0 && (
                  // 4px rounded top, square at the baseline
                  <path
                    className={`sales-chart-bar ${active === i ? "active" : ""}`}
                    d={`M${x},${PAD.top + plotH} V${y(d.sales) + r} Q${x},${y(d.sales)} ${x + r},${y(d.sales)} H${x + barW - r} Q${x + barW},${y(d.sales)} ${x + barW},${y(d.sales) + r} V${PAD.top + plotH} Z`}
                  />
                )}
                {/* hit target: the full column, much bigger than the bar */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                />
              </g>
            );
          })}
        </svg>

        <span className="sales-chart-axis-top">{formatRWF(max)}</span>
        <div className="sales-chart-axis-x">
          <span>{shortDate(data[0].date)}</span>
          <span>{shortDate(data[data.length - 1].date)}</span>
        </div>

        {activeDay && (
          <div
            className="sales-chart-tooltip"
            // kept away from the edges so it never spills off a phone screen
            style={{ left: `${Math.min(82, Math.max(18, ((active + 0.5) / data.length) * 100))}%` }}
            role="status"
          >
            <strong>{shortDate(activeDay.date)}</strong>
            <span>{formatRWF(activeDay.sales)}</span>
            <span>
              {activeDay.orders} order{activeDay.orders === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* Same numbers as a table, for screen readers */}
      <table className="visually-hidden">
        <caption>Daily sales, last 30 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Orders</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.orders}</td>
              <td>{formatRWF(d.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

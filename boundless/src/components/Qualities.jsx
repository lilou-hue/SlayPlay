import { useState, useEffect } from 'react';

const QUALITY_LABELS = {
  staffTrust: 'Staff Trust',
  foundersNerve: "Founder's Nerve",
  communityHealth: 'Community Health',
  operationalCalm: 'Operational Calm',
};

function ichDreadLine(ich) {
  if (ich >= 8) return null;
  if (ich >= 5) return 'The office has been quieter than usual.';
  if (ich >= 3) return 'People have stopped asking each other how they\'re doing.';
  if (ich >= 1) return 'Something is wrong. No one is saying what.';
  return 'Two people gave notice in the same week.';
}

export default function Qualities({ qualities, hidden, lastDeltas }) {
  const [flashing, setFlashing] = useState({});
  const dreadLine = ichDreadLine(hidden.internalCultureHealth);

  useEffect(() => {
    if (!lastDeltas?.deltas || Object.keys(lastDeltas.deltas).length === 0) return;

    const newFlashing = {};
    for (const [key, delta] of Object.entries(lastDeltas.deltas)) {
      if (delta !== 0) newFlashing[key] = delta > 0 ? 'up' : 'down';
    }
    setFlashing(newFlashing);

    const timer = setTimeout(() => setFlashing({}), 900);
    return () => clearTimeout(timer);
  }, [lastDeltas]);

  return (
    <aside className="qualities">
      <ul>
        {Object.entries(QUALITY_LABELS).map(([key, label]) => {
          const flashClass = flashing[key] ? ` q-value--flash-${flashing[key]}` : '';
          return (
            <li key={key}>
              <span className="q-label">{label}</span>
              <span className={`q-value${flashClass}`}>{qualities[key]}</span>
            </li>
          );
        })}
      </ul>
      {dreadLine && <p className="dread-note">{dreadLine}</p>}
    </aside>
  );
}

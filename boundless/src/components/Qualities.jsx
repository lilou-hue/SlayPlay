const QUALITY_LABELS = {
  staffTrust: 'Staff Trust',
  foundersNerve: "Founder's Nerve",
  communityHealth: 'Community Health',
  operationalCalm: 'Operational Calm',
};

export default function Qualities({ qualities }) {
  return (
    <aside className="qualities">
      <h3>Qualities</h3>
      <ul>
        {Object.entries(QUALITY_LABELS).map(([key, label]) => (
          <li key={key}>
            <span className="q-label">{label}</span>
            <span className="q-value">{qualities[key]}</span>
          </li>
        ))}
      </ul>
      <p className="hidden-note">Some things are not shown here.</p>
    </aside>
  );
}

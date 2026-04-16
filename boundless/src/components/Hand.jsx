import Card from './Card.jsx';

export default function Hand({ hand, played, expired, state, dispatch }) {
  const playedIds = new Set(played);
  const expiredIds = new Set(expired);

  const playsRemaining = 2 - played.length;

  const statusText =
    playsRemaining === 2
      ? 'Two decisions remain this week.'
      : playsRemaining === 1
        ? 'One decision remains.'
        : 'The week is spent. End it when ready.';

  return (
    <div className="hand">
      <div className="hand-status">
        {statusText}
      </div>
      <div className="hand-cards">
        {hand.map((entry) => (
          <Card
            key={entry.id}
            entry={entry}
            state={state}
            dispatch={dispatch}
            isPlayed={playedIds.has(entry.id)}
            isExpired={expiredIds.has(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

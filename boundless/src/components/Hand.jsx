import Card from './Card.jsx';

export default function Hand({ hand, played, expired, state, dispatch }) {
  const playedIds = new Set(played);
  const expiredIds = new Set(expired);

  const playsRemaining = 2 - played.length;

  return (
    <div className="hand">
      <div className="hand-status">
        {playsRemaining > 0
          ? `Play ${playsRemaining} more card${playsRemaining > 1 ? 's' : ''}.`
          : 'End the week when ready.'}
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

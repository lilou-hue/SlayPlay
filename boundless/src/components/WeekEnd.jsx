function ichReveal(ich) {
  if (ich >= 12) return 'The team held.';
  if (ich >= 6) return 'The team is tired but intact.';
  if (ich >= 0) return 'You notice that people have stopped asking each other how they\'re doing.';
  return 'By the time the meeting starts, two people have given notice in the same week. This is not a coincidence.';
}

export default function WeekEnd({ week, weekMessages, hidden, dispatch, isGameOver }) {
  if (isGameOver) {
    return (
      <div className="week-end week-end--game-over">
        <h2>Week {week} — End of Cohort</h2>
        {weekMessages.length > 0 && (
          <ul className="delayed-messages">
            {weekMessages.map((msg, i) => (
              <li key={i} className="delayed-msg">{msg}</li>
            ))}
          </ul>
        )}
        <div className="ich-reveal">
          <p>{ichReveal(hidden.internalCultureHealth)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="week-end">
      <h2>End of Week {week}</h2>

      {weekMessages.length > 0 && (
        <ul className="delayed-messages">
          {weekMessages.map((msg, i) => (
            <li key={i} className="delayed-msg">{msg}</li>
          ))}
        </ul>
      )}

      <button
        className="end-week-btn"
        onClick={() => dispatch({ type: 'END_WEEK' })}
      >
        Begin Week {week + 1}
      </button>
    </div>
  );
}

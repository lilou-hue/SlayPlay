import { useReducer, useEffect } from 'react';
import { reducer, INITIAL_STATE } from './engine/reducer.js';
import Qualities from './components/Qualities.jsx';
import Hand from './components/Hand.jsx';
import WeekEnd from './components/WeekEnd.jsx';

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const { phase, week, qualities, hidden, hand, played, expired, weekMessages } = state;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>Boundless</h1>
          <span className="app-tagline">You lead a cohort. Every decision settles somewhere.</span>
        </div>
        <div className="week-pips">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`week-pip${n < week ? ' week-pip--done' : ''}${n === week ? ' week-pip--current' : ''}`}
            />
          ))}
        </div>
        <span className="week-label">Week {week} of 5</span>
      </header>

      <main className="app-main">
        <Qualities qualities={qualities} hidden={hidden} lastDeltas={state.lastDeltas} />

        <div className="play-area">
          {(phase === 'draw' || phase === 'playing') && (
            <Hand
              hand={hand}
              played={played}
              expired={expired}
              state={state}
              dispatch={dispatch}
            />
          )}

          {(phase === 'week_end' || phase === 'game_over') && (
            <WeekEnd
              week={week}
              weekMessages={weekMessages}
              hidden={hidden}
              dispatch={dispatch}
              isGameOver={phase === 'game_over'}
            />
          )}
        </div>
      </main>
    </div>
  );
}

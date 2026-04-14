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
        <h1>Boundless</h1>
        <span className="week-label">Week {week}</span>
      </header>

      <main className="app-main">
        <Qualities qualities={qualities} />

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

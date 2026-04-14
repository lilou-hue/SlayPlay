import { useState } from 'react';
import { CARDS } from '../data/index.js';

function getCardDef(cardId) {
  return CARDS[cardId] || null;
}

function getStageDef(cardDef, stageKey) {
  if (!cardDef) return null;
  return cardDef.stages[stageKey] || cardDef.stages['default'] || null;
}

function getProse(stage, state, cardId) {
  // Collision variant: proseBergmannsActive
  if (stage.proseBergmannsActive) {
    const bergmannsActive = state.activeStorylets.some((a) => a.id === 'the_bergmanns');
    if (bergmannsActive) return stage.proseBergmannsActive;
  }
  // Collision variant: proseLowICH
  if (stage.proseLowICH) {
    if (state.hidden.internalCultureHealth < 3) return stage.proseLowICH;
  }
  return stage.prose;
}

export default function Card({ entry, state, dispatch, isExpired, isPlayed }) {
  const [expanded, setExpanded] = useState(false);
  const [resolveProseText, setResolveProseText] = useState(null);

  const cardDef = getCardDef(entry.id);
  if (!cardDef) return null;

  const stageKey = entry.currentStage || 'default';
  const stage = getStageDef(cardDef, stageKey);
  if (!stage) return null;

  const prose = getProse(stage, state, entry.id);

  function handleChoice(choice) {
    setResolveProseText(choice.resolveProse);
    setTimeout(() => {
      dispatch({ type: 'PLAY_CARD', cardId: entry.id, choiceId: choice.id });
    }, 700);
  }

  const disableChoices = resolveProseText !== null;

  if (isExpired) {
    return (
      <div className="card card--expired">
        <div className="card-header">
          <span className="card-title">{cardDef.title}</span>
          <span className="card-tag">Expired</span>
        </div>
      </div>
    );
  }

  if (isPlayed) {
    return (
      <div className="card card--played">
        <div className="card-header">
          <span className="card-title">{cardDef.title}</span>
          <span className="card-tag">Played</span>
        </div>
        {resolveProseText && <p className="resolve-prose">{resolveProseText}</p>}
      </div>
    );
  }

  return (
    <div className={`card${expanded ? ' card--expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded((e) => !e)}>
        <span className="card-title">{cardDef.title}</span>
        <span className="card-toggle">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="card-body">
          <p className="card-prose">{prose}</p>

          {resolveProseText ? (
            <p className="resolve-prose">{resolveProseText}</p>
          ) : (
            <ul className="choices">
              {stage.choices.map((choice) => (
                <li key={choice.id}>
                  <button
                    className="choice-btn"
                    onClick={() => handleChoice(choice)}
                    disabled={disableChoices}
                  >
                    {choice.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

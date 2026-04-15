import { useState } from 'react';
import { CARDS } from '../data/index.js';

const QUALITY_LABELS = {
  staffTrust: 'Staff Trust',
  foundersNerve: "Founder's Nerve",
  communityHealth: 'Community Health',
  operationalCalm: 'Operational Calm',
};

function DeltaDisplay({ deltas }) {
  const entries = Object.entries(deltas).filter(([, v]) => v !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="quality-deltas">
      {entries.map(([key, val]) => {
        const label = QUALITY_LABELS[key];
        if (!label) return null;
        const sign = val > 0 ? '+' : '';
        const cls = val > 0 ? 'delta--positive' : 'delta--negative';
        return <span key={key} className={cls}>{sign}{val} {label}</span>;
      })}
    </div>
  );
}

function getCardDef(cardId) {
  return CARDS[cardId] || null;
}

function getStageDef(cardDef, stageKey) {
  if (!cardDef) return null;
  return cardDef.stages[stageKey] || cardDef.stages['default'] || null;
}

function getProse(stage, state) {
  if (stage.proseBergmannsActive) {
    const bergmannsActive = state.activeStorylets.some((a) => a.id === 'the_bergmanns');
    if (bergmannsActive) return stage.proseBergmannsActive;
  }
  if (stage.proseLowICH) {
    if (state.hidden.internalCultureHealth < 3) return stage.proseLowICH;
  }
  return stage.prose;
}

export default function Card({ entry, state, dispatch, isExpired, isPlayed }) {
  const [resolveProseText, setResolveProseText] = useState(null);

  const cardDef = getCardDef(entry.id);
  if (!cardDef) return null;

  const stageKey = entry.currentStage || 'default';
  const stage = getStageDef(cardDef, stageKey);
  if (!stage) return null;

  const prose = getProse(stage, state);
  const typeClass = `card--${cardDef.type || 'ambient'}`;
  const lastDeltas = state.lastDeltas?.cardId === entry.id ? state.lastDeltas.deltas : null;

  function handleChoice(choice) {
    setResolveProseText(choice.resolveProse);
    setTimeout(() => {
      dispatch({ type: 'PLAY_CARD', cardId: entry.id, choiceId: choice.id });
    }, 700);
  }

  const disableChoices = resolveProseText !== null;

  if (isExpired) {
    return (
      <div className={`card card--expired ${typeClass}`}>
        <div className="card-body">
          <span className="card-title">{cardDef.title}</span>
        </div>
      </div>
    );
  }

  if (isPlayed) {
    return (
      <div className={`card card--played ${typeClass}`}>
        <div className="card-body">
          <span className="card-title">{cardDef.title}</span>
          {resolveProseText && <p className="resolve-prose">{resolveProseText}</p>}
          {lastDeltas && <DeltaDisplay deltas={lastDeltas} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${typeClass}`}>
      <div className="card-body">
        <span className="card-title">{cardDef.title}</span>
        <p className="card-prose">{prose}</p>

        {resolveProseText ? (
          <p className="resolve-prose">{resolveProseText}</p>
        ) : (
          <ul className="choices">
            {stage.choices.map((choice) => (
              <li key={choice.id}>
                <span
                  className={`choice-text${disableChoices ? ' choice-text--disabled' : ''}`}
                  onClick={disableChoices ? undefined : () => handleChoice(choice)}
                >
                  — {choice.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

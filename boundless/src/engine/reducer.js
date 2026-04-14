import { CARDS } from '../data/index.js';
import { applyEffects, checkCondition } from './effects.js';
import { drawHand } from './draw.js';

export const INITIAL_STATE = {
  week: 1,
  phase: 'draw',          // 'draw' | 'playing' | 'week_end' | 'game_over'
  qualities: {
    staffTrust: 5,
    foundersNerve: 5,
    communityHealth: 5,
    operationalCalm: 5,
  },
  hidden: {
    internalCultureHealth: 5,
  },
  activeStorylets: [],    // [{ id, currentStage, path: [] }]
  pendingEffects: [],     // [{ applyAtWeek, effects, hiddenEffects, prose }]
  hand: [],               // [{ id, type }] — current week's 4 drawn cards
  played: [],             // card ids played this week
  expired: [],            // card ids that expired this week
  log: [],                // [{ week, cardId, choiceId, prose }]
  weekMessages: [],       // prose lines shown at week end
};

function startNewWeek(state) {
  // Apply any pending effects due this week
  let next = { ...state };
  const messages = [];
  const stillPending = [];

  for (const pending of state.pendingEffects) {
    if (pending.applyAtWeek <= state.week) {
      // Check conditional
      if (!pending.condition || checkCondition(next, pending.condition)) {
        next = applyEffects(next, pending.effects || {}, pending.hiddenEffects || {});
        if (pending.prose) messages.push(pending.prose);
      }
    } else {
      stillPending.push(pending);
    }
  }

  // Draw new hand
  const hand = drawHand(next.activeStorylets);

  return {
    ...next,
    phase: 'draw',
    pendingEffects: stillPending,
    hand,
    played: [],
    expired: [],
    weekMessages: messages,
  };
}

export function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME': {
      // Seed both storylets as active from week 1
      const activeStorylets = [
        { id: 'the_offer', currentStage: 's1', path: [] },
        { id: 'the_bergmanns', currentStage: 's1', path: [] },
      ];
      const hand = drawHand(activeStorylets);
      return {
        ...INITIAL_STATE,
        activeStorylets,
        hand,
        phase: 'draw',
      };
    }

    case 'PLAY_CARD': {
      // action.cardId, action.choiceId
      const { cardId, choiceId } = action;
      const card = CARDS[cardId];
      if (!card) return state;

      const active = state.activeStorylets.find((a) => a.id === cardId);
      const stageId = active ? active.currentStage : null;
      const stage = stageId ? card.stages[stageId] : card.stages?.default;
      if (!stage) return state;

      const choice = stage.choices.find((c) => c.id === choiceId);
      if (!choice) return state;

      // Apply immediate effects
      let next = applyEffects(state, choice.effects || {}, choice.hiddenEffects || {});

      // Queue delayed effects
      const newPending = (choice.delayed || []).map((d) => ({
        ...d,
        applyAtWeek: state.week + d.weeksFromNow,
      }));

      // Advance storylet stage or close it
      let activeStorylets = [...next.activeStorylets];
      if (active) {
        if (choice.nextStage && card.stages[choice.nextStage]) {
          // Update to next stage
          activeStorylets = activeStorylets.map((a) =>
            a.id === cardId
              ? { ...a, currentStage: choice.nextStage, path: [...a.path, choiceId] }
              : a
          );
        } else if (choice.nextStage === 'done' || !choice.nextStage) {
          // Storylet complete
          activeStorylets = activeStorylets.filter((a) => a.id !== cardId);
        }
      }

      // For ambient cards: no active storylet entry, just consume

      const played = [...next.played, cardId];
      const log = [
        ...next.log,
        { week: state.week, cardId, choiceId, prose: choice.resolveProse || '' },
      ];

      next = {
        ...next,
        activeStorylets,
        pendingEffects: [...next.pendingEffects, ...newPending],
        played,
        log,
      };

      // If 2 cards played, move to week_end phase
      if (played.length >= 2) {
        next = { ...next, phase: 'week_end' };
      }

      return next;
    }

    case 'END_WEEK': {
      const MAX_WEEKS = 5;
      if (state.week >= MAX_WEEKS) {
        return { ...state, phase: 'game_over' };
      }

      const expired = state.hand
        .filter((c) => !state.played.includes(c.id))
        .map((c) => c.id);

      const nextState = startNewWeek({
        ...state,
        expired,
        week: state.week + 1,
      });

      return nextState;
    }

    default:
      return state;
  }
}

// Apply an effects object { qualityName: delta } to state
export function applyEffects(state, effects = {}, hiddenEffects = {}) {
  const qualities = { ...state.qualities };
  const hidden = { ...state.hidden };

  for (const [key, delta] of Object.entries(effects)) {
    if (key in qualities) qualities[key] = qualities[key] + delta;
  }

  for (const [key, delta] of Object.entries(hiddenEffects)) {
    if (key in hidden) hidden[key] = hidden[key] + delta;
  }

  return { ...state, qualities, hidden };
}

// Check a condition string against current state
// Supported: "qualityName >= N", "qualityName <= N", "qualityName > N", "qualityName < N"
export function checkCondition(state, condition) {
  if (!condition) return true;
  const all = { ...state.qualities, ...state.hidden };
  const match = condition.match(/^(\w+)\s*(>=|<=|>|<|===|==)\s*(-?\d+)$/);
  if (!match) return true;
  const [, key, op, val] = match;
  const current = all[key] ?? 0;
  const n = parseInt(val, 10);
  switch (op) {
    case '>=': return current >= n;
    case '<=': return current <= n;
    case '>':  return current > n;
    case '<':  return current < n;
    case '===':
    case '==': return current === n;
    default:   return true;
  }
}

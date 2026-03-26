// ============================================================
// Dragon Engineering Lab — Dragon State Model
// Handles dragon creation, randomization, presets, and persistence.
// ============================================================

window.Dragon = (function() {
  const DATA = window.DragonData;

  // Default trait values from config
  function getDefaults() {
    const traits = {};
    DATA.TRAITS.forEach(t => { traits[t.id] = t.default; });
    return traits;
  }

  // Default fire design
  function getDefaultFireDesign() {
    return { fuel: 'methane', ignition: 'spark', delivery: 'burst' };
  }

  // Generate unique ID
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  // Create a dragon with optional overrides
  function create(overrides) {
    const traits = getDefaults();
    const fireDesign = getDefaultFireDesign();
    if (overrides) {
      if (overrides.traits) {
        Object.keys(overrides.traits).forEach(k => {
          if (traits.hasOwnProperty(k)) traits[k] = overrides.traits[k];
        });
      }
      if (overrides.fireDesign) {
        Object.assign(fireDesign, overrides.fireDesign);
      }
    }
    return {
      id: uid(),
      name: overrides && overrides.name ? overrides.name : 'Dragon-' + uid().substr(0, 4).toUpperCase(),
      traits: traits,
      fireDesign: fireDesign,
      createdAt: Date.now()
    };
  }

  // Create a random dragon with plausible but varied traits
  function createRandom() {
    const traits = {};
    DATA.TRAITS.forEach(t => {
      // Weighted random: bias toward mid-range with occasional extremes
      const base = Math.random();
      let val;
      if (base < 0.15) {
        // Low extreme
        val = t.min + Math.floor(Math.random() * 2);
      } else if (base > 0.85) {
        // High extreme
        val = t.max - Math.floor(Math.random() * 2);
      } else {
        // Normal distribution around center
        const center = (t.min + t.max) / 2;
        const range = (t.max - t.min) / 2;
        val = Math.round(center + (Math.random() - 0.5) * range * 1.4);
      }
      traits[t.id] = Math.max(t.min, Math.min(t.max, val));
    });

    // Random fire design
    const fuels = DATA.FIRE_FUELS;
    const ignitions = DATA.FIRE_IGNITIONS;
    const deliveries = DATA.FIRE_DELIVERIES;
    const fireDesign = {
      fuel: fuels[Math.floor(Math.random() * fuels.length)].id,
      ignition: ignitions[Math.floor(Math.random() * ignitions.length)].id,
      delivery: deliveries[Math.floor(Math.random() * deliveries.length)].id
    };

    return {
      id: uid(),
      name: 'RNG-' + uid().substr(0, 4).toUpperCase(),
      traits: traits,
      fireDesign: fireDesign,
      createdAt: Date.now()
    };
  }

  // Create dragon from a preset
  function fromPreset(presetKey) {
    const preset = DATA.PRESETS[presetKey];
    if (!preset) return create();
    return create({
      name: preset.label,
      traits: { ...preset.traits },
      fireDesign: { ...preset.fireDesign }
    });
  }

  // Get descriptor label for a trait at a given value
  function getDescriptor(traitId, value) {
    const trait = DATA.TRAITS.find(t => t.id === traitId);
    if (!trait) return '';
    for (let i = 0; i < trait.descriptors.length; i++) {
      if (value <= trait.descriptors[i].max) return trait.descriptors[i].label;
    }
    return trait.descriptors[trait.descriptors.length - 1].label;
  }

  // Normalize a trait value to 0-1 range
  function normalize(traitId, value) {
    const trait = DATA.TRAITS.find(t => t.id === traitId);
    if (!trait) return 0;
    return (value - trait.min) / (trait.max - trait.min);
  }

  // ---- LocalStorage persistence ----
  const STORAGE_KEY = 'dragonlab_current';
  const SAVES_KEY = 'dragonlab_saves';
  const TUTORIAL_KEY = 'dragonlab_tutorial_complete';

  function saveCurrent(dragon) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dragon));
    } catch(e) { /* silently fail if storage unavailable */ }
  }

  function loadCurrent() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch(e) { /* silently fail */ }
    return null;
  }

  function saveToSlot(dragon) {
    try {
      const saves = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
      // Replace if same id exists, otherwise add
      const idx = saves.findIndex(s => s.id === dragon.id);
      if (idx >= 0) saves[idx] = dragon;
      else saves.push(dragon);
      // Keep max 20 saves
      while (saves.length > 20) saves.shift();
      localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
    } catch(e) { /* silently fail */ }
  }

  function loadSaves() {
    try {
      return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
    } catch(e) { return []; }
  }

  function deleteSave(id) {
    try {
      const saves = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
      const filtered = saves.filter(s => s.id !== id);
      localStorage.setItem(SAVES_KEY, JSON.stringify(filtered));
    } catch(e) { /* silently fail */ }
  }

  function isTutorialComplete() {
    try { return localStorage.getItem(TUTORIAL_KEY) === 'true'; } catch(e) { return false; }
  }

  function setTutorialComplete(val) {
    try { localStorage.setItem(TUTORIAL_KEY, val ? 'true' : 'false'); } catch(e) {}
  }

  // Clone a dragon (new id)
  function clone(dragon) {
    return {
      ...dragon,
      id: uid(),
      name: dragon.name + ' (copy)',
      traits: { ...dragon.traits },
      fireDesign: { ...dragon.fireDesign },
      createdAt: Date.now()
    };
  }

  return {
    create, createRandom, fromPreset, clone,
    getDefaults, getDefaultFireDesign, getDescriptor, normalize,
    saveCurrent, loadCurrent, saveToSlot, loadSaves, deleteSave,
    isTutorialComplete, setTutorialComplete
  };
})();

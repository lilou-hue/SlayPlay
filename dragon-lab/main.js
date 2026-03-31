// ============================================================
// Dragon Engineering Lab — Main Application
// Init, event wiring, state management, debouncing,
// save/load, battle playback, and debug helpers.
// ============================================================

window.App = (function() {
  let currentDragon = null;
  let currentResults = null;
  let previousResults = null;
  let battleState = null;
  let battlePlaybackTimer = null;
  let battleTickIndex = 0;
  let currentTint = '#2a8870';

  // Debounce timer for slider updates
  let updateTimer = null;
  const DEBOUNCE_MS = 50;

  // Colour swatches shown in the picker
  const COLOUR_SWATCHES = [
    '#ffffff', '#aaaaaa', '#222222',
    '#cc2222', '#ff6600', '#ddaa00',
    '#44aa55', '#2a8870', '#4488dd',
    '#8866aa', '#dd6688', '#d4a820'
  ];

  // --------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------
  function init() {
    // Load saved dragon or create default
    const saved = window.Dragon.loadCurrent();
    currentDragon = saved || window.Dragon.create();

    // Init Three.js scene
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      window.Scene.init(canvasContainer);
      window.Scene.buildPlayerDragon(currentDragon.traits, getTintColor());
    }

    // Init UI tabs
    window.UI.initTabs();

    // Render sliders
    window.UI.renderSliders(
      currentDragon.traits,
      currentDragon.fireDesign,
      onTraitChange,
      onFireDesignChange
    );

    // Render presets
    window.UI.renderPresets(onPresetSelect);

    // Render colour picker
    renderColourPicker();

    // Render habitat selector
    window.UI.renderHabitatSelector(onHabitatSelect);

    // Render battle setup
    window.UI.renderBattleSetup(onBattleStart);

    // Render science notes
    window.UI.renderScienceNotes();

    // Wire buttons
    wireButtons();

    // Run initial simulation
    runSimulation();

    // Init tutorial
    window.Tutorial.init();
  }

  // --------------------------------------------------------
  // TINT COLOR
  // --------------------------------------------------------
  function getTintColor() {
    return currentTint;
  }

  function onTintChange(hex) {
    currentTint = hex;
    // Update custom input value to stay in sync
    const input = document.getElementById('custom-colour-input');
    if (input) input.value = hex;
    // Update swatch active state
    document.querySelectorAll('.colour-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.colour === hex);
    });
    window.Scene.updateDragon(currentDragon.traits, currentTint);
  }

  // --------------------------------------------------------
  // COLOUR PICKER UI
  // --------------------------------------------------------
  function renderColourPicker() {
    const container = document.getElementById('colour-swatches');
    if (!container) return;

    container.innerHTML = '';
    COLOUR_SWATCHES.forEach(colour => {
      const swatch = document.createElement('button');
      swatch.className = 'colour-swatch' + (colour === currentTint ? ' active' : '');
      swatch.dataset.colour = colour;
      swatch.style.background = colour;
      swatch.title = colour;
      // White swatch needs a border to be visible on dark bg
      if (colour === '#ffffff') swatch.style.borderColor = '#555';
      swatch.addEventListener('click', () => onTintChange(colour));
      container.appendChild(swatch);
    });

    const input = document.getElementById('custom-colour-input');
    if (input) {
      input.value = currentTint;
      input.addEventListener('input', (e) => {
        onTintChange(e.target.value);
      });
    }
  }

  // --------------------------------------------------------
  // TRAIT CHANGE HANDLER (debounced)
  // --------------------------------------------------------
  function onTraitChange(traitId, value) {
    currentDragon.traits[traitId] = value;

    // Immediate visual update (cheap)
    window.Scene.updateDragon(currentDragon.traits, getTintColor());

    // Debounced simulation (expensive)
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      runSimulation();
      autoSave();
    }, DEBOUNCE_MS);
  }

  // --------------------------------------------------------
  // FIRE DESIGN CHANGE
  // --------------------------------------------------------
  function onFireDesignChange(type, id) {
    currentDragon.fireDesign[type] = id;
    window.UI.updateFireCompat(currentDragon.fireDesign);

    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      runSimulation();
      autoSave();
    }, DEBOUNCE_MS);
  }

  // --------------------------------------------------------
  // SIMULATION
  // --------------------------------------------------------
  function runSimulation() {
    previousResults = currentResults;
    currentResults = window.Simulation.evaluate(currentDragon);
    window.UI.renderResults(currentResults, previousResults);
  }

  // --------------------------------------------------------
  // PRESET SELECTION
  // --------------------------------------------------------
  function onPresetSelect(presetKey) {
    currentDragon = window.Dragon.fromPreset(presetKey);
    window.UI.updateSliders(currentDragon.traits);

    // Sync tint to preset colour
    const presetTint = window.DragonData.PRESETS[presetKey].tintColor;
    if (presetTint) onTintChange(presetTint);

    // Rebuild fire design panel by re-rendering sliders
    window.UI.renderSliders(
      currentDragon.traits,
      currentDragon.fireDesign,
      onTraitChange,
      onFireDesignChange
    );

    window.Scene.updateDragon(currentDragon.traits, getTintColor());
    runSimulation();
    autoSave();
    window.UI.showNotification('Loaded preset: ' + window.DragonData.PRESETS[presetKey].label, 'info');
  }

  // --------------------------------------------------------
  // HABITAT
  // --------------------------------------------------------
  function onHabitatSelect(habitatKey) {
    const result = window.Simulation.evaluateHabitat(currentDragon.traits, currentDragon.fireDesign, habitatKey);
    window.UI.renderHabitatResults(result);
    window.Scene.setEnvironment(habitatKey);
  }

  // --------------------------------------------------------
  // BATTLE
  // --------------------------------------------------------
  function onBattleStart(enemyKey, arenaKey, speed) {
    const archetype = window.DragonData.ENEMY_ARCHETYPES[enemyKey];
    battleState = window.Battle.create(currentDragon, enemyKey, arenaKey);

    // Run full battle
    window.Battle.runFull(battleState);

    // Switch to battle view
    window.Scene.initBattleArena(
      arenaKey,
      currentDragon.traits, getTintColor(),
      archetype.traits, archetype.tintColor
    );

    // Playback
    battleTickIndex = 0;
    const delay = window.DragonData.BATTLE_CONFIG.tickDelay[speed] || 800;

    // Hide setup, show display
    const setup = document.getElementById('battle-setup');
    const display = document.getElementById('battle-display');
    if (setup) setup.style.display = 'none';
    if (display) display.style.display = 'block';

    // Start tick-by-tick playback
    battlePlaybackTimer = setInterval(() => {
      if (battleTickIndex >= battleState.log.length) {
        clearInterval(battlePlaybackTimer);
        window.UI.renderBattleSummary(battleState);
        wireBattleSummaryButtons();
        return;
      }

      const tick = battleState.log[battleTickIndex];
      // Update display
      window.UI.renderBattleInProgress(battleState, battleTickIndex);
      // Animate
      window.Scene.animateBattleTick(tick);

      battleTickIndex++;
    }, delay);
  }

  function wireBattleSummaryButtons() {
    const againBtn = document.getElementById('btn-battle-again');
    if (againBtn) {
      againBtn.addEventListener('click', () => {
        window.Scene.returnToLab();
        const setup = document.getElementById('battle-setup');
        const display = document.getElementById('battle-display');
        if (setup) setup.style.display = 'block';
        if (display) display.style.display = 'none';
        window.UI.renderBattleSetup(onBattleStart);
      });
    }
    const returnBtn = document.getElementById('btn-return-lab');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        window.Scene.returnToLab();
        window.Scene.updateDragon(currentDragon.traits, getTintColor());
        window.UI.switchTab('build');
        const setup = document.getElementById('battle-setup');
        const display = document.getElementById('battle-display');
        if (setup) setup.style.display = 'block';
        if (display) display.style.display = 'none';
      });
    }
  }

  // --------------------------------------------------------
  // BUTTON WIRING
  // --------------------------------------------------------
  function wireButtons() {
    // Simulate button
    const simBtn = document.getElementById('btn-simulate');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        runSimulation();
        window.UI.switchTab('simulate');
        window.UI.showNotification('Simulation complete', 'info');
      });
    }

    // Randomize
    const randBtn = document.getElementById('btn-randomize');
    if (randBtn) {
      randBtn.addEventListener('click', () => {
        currentDragon = window.Dragon.createRandom();
        window.UI.renderSliders(currentDragon.traits, currentDragon.fireDesign, onTraitChange, onFireDesignChange);
        window.Scene.updateDragon(currentDragon.traits, getTintColor());
        runSimulation();
        autoSave();
        window.UI.showNotification('Random dragon generated', 'info');
      });
    }

    // Reset
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentDragon = window.Dragon.create();
        window.UI.renderSliders(currentDragon.traits, currentDragon.fireDesign, onTraitChange, onFireDesignChange);
        window.Scene.updateDragon(currentDragon.traits, getTintColor());
        runSimulation();
        autoSave();
        window.UI.showNotification('Reset to defaults', 'info');
      });
    }

    // Save
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        window.Dragon.saveToSlot(currentDragon);
        window.UI.showNotification('Dragon saved: ' + currentDragon.name, 'success');
      });
    }

    // Replay tutorial
    const tutBtn = document.getElementById('btn-tutorial');
    if (tutBtn) {
      tutBtn.addEventListener('click', () => {
        window.Tutorial.reset();
      });
    }

    // Return to lab from habitat
    const habReturnBtn = document.getElementById('btn-hab-return');
    if (habReturnBtn) {
      habReturnBtn.addEventListener('click', () => {
        window.Scene.resetEnvironment();
      });
    }
  }

  // --------------------------------------------------------
  // AUTO-SAVE
  // --------------------------------------------------------
  function autoSave() {
    window.Dragon.saveCurrent(currentDragon);
  }

  // --------------------------------------------------------
  // DEBUG HELPERS
  // --------------------------------------------------------
  if (location.search.includes('debug')) {
    window.DEBUG = {
      sim: () => {
        console.table(window.Simulation.evaluate(currentDragon));
      },
      presets: () => {
        Object.keys(window.DragonData.PRESETS).forEach(k => {
          const d = window.Dragon.fromPreset(k);
          const r = window.Simulation.evaluate(d);
          console.log(k, '→', r.classification.name, '| Flight:', Math.round(r.flight.overall),
            '| Fire:', Math.round(r.fire.fireOutput), '| Energy:', Math.round(r.energy.sustainability),
            '| Durability:', Math.round(r.durability.total), '| Survival:', Math.round(r.survival.rating));
        });
      },
      battles: () => {
        const results = [];
        Object.keys(window.DragonData.ENEMY_ARCHETYPES).forEach(ek => {
          Object.keys(window.DragonData.BATTLE_CONFIG.arenas).forEach(ak => {
            const d = window.Dragon.createRandom();
            const state = window.Battle.create(d, ek, ak);
            window.Battle.runFull(state);
            results.push({ enemy: ek, arena: ak, winner: state.winner, ticks: state.log.length });
          });
        });
        console.table(results);
      },
      bounds: () => {
        let errors = 0;
        for (let i = 0; i < 100; i++) {
          const d = window.Dragon.createRandom();
          const r = window.Simulation.evaluate(d);
          const check = (obj, path) => {
            Object.entries(obj).forEach(([k, v]) => {
              if (typeof v === 'number' && (v < 0 || v > 100 || isNaN(v))) {
                console.error(`OUT OF BOUNDS: ${path}.${k} = ${v}`);
                errors++;
              } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                check(v, `${path}.${k}`);
              }
            });
          };
          check(r.flight, `d${i}.flight`);
          check(r.energy, `d${i}.energy`);
          check(r.durability, `d${i}.durability`);
          check(r.survival, `d${i}.survival`);
        }
        console.log(`Bounds check complete. ${errors} errors found.`);
      }
    };
  }

  // --------------------------------------------------------
  // START
  // --------------------------------------------------------
  document.addEventListener('DOMContentLoaded', init);

  return {
    get currentDragon() { return currentDragon; },
    get currentResults() { return currentResults; },
    get previousResults() { return previousResults; },
    runSimulation
  };
})();

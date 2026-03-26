// ============================================================
// Dragon Engineering Lab — UI System
// DOM rendering: sliders, results dashboard, tabs, tooltips,
// fire design panel, battle UI, comparison mode, science notes.
// ============================================================

window.UI = (function() {
  const DATA = window.DragonData;

  let activeTab = 'build';
  let onTraitChange = null;
  let onFireDesignChange = null;

  // --------------------------------------------------------
  // TAB SYSTEM
  // --------------------------------------------------------
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.toggle('active', tc.id === 'tab-' + tabName);
    });
  }

  // --------------------------------------------------------
  // SLIDER CONTROLS
  // --------------------------------------------------------
  function renderSliders(traits, fireDesign, onChange, onFireChange) {
    onTraitChange = onChange;
    onFireDesignChange = onFireChange;
    const container = document.getElementById('sliders-container');
    if (!container) return;
    container.innerHTML = '';

    // Group sliders by category
    const groups = { physical: [], flight: [], fire: [], energy: [], structure: [], survival: [] };
    DATA.TRAITS.forEach(t => {
      (groups[t.group] || groups.physical).push(t);
    });

    const groupLabels = {
      physical: 'Physical Traits', flight: 'Flight Systems',
      fire: 'Fire Organs', energy: 'Energy Systems',
      structure: 'Structural', survival: 'Survival'
    };

    Object.keys(groups).forEach(groupKey => {
      if (groups[groupKey].length === 0) return;
      const section = document.createElement('div');
      section.className = 'slider-group';
      section.innerHTML = `<div class="slider-group-label">${groupLabels[groupKey]}</div>`;

      groups[groupKey].forEach(traitConfig => {
        const val = traits[traitConfig.id];
        const desc = window.Dragon.getDescriptor(traitConfig.id, val);
        const div = document.createElement('div');
        div.className = 'trait-slider';
        div.dataset.trait = traitConfig.id;
        div.innerHTML = `
          <div class="trait-header">
            <span class="trait-label">${traitConfig.label}
              <button class="info-btn" data-tooltip="${traitConfig.id}" title="${traitConfig.description}">i</button>
            </span>
            <span class="trait-value-group">
              <span class="trait-value">${val}</span>
              <span class="trait-descriptor">${desc}</span>
            </span>
          </div>
          <input type="range" min="${traitConfig.min}" max="${traitConfig.max}" step="1" value="${val}">
          <div class="trait-impact">${window.Explanations.traitImpact(traitConfig.id, val)}</div>
        `;
        section.appendChild(div);

        // Slider event
        const slider = div.querySelector('input[type="range"]');
        slider.addEventListener('input', (e) => {
          const newVal = parseInt(e.target.value);
          div.querySelector('.trait-value').textContent = newVal;
          div.querySelector('.trait-descriptor').textContent = window.Dragon.getDescriptor(traitConfig.id, newVal);
          div.querySelector('.trait-impact').textContent = window.Explanations.traitImpact(traitConfig.id, newVal);
          if (onTraitChange) onTraitChange(traitConfig.id, newVal);
        });
      });

      container.appendChild(section);
    });

    // Fire Design Panel
    renderFireDesignPanel(fireDesign, container);
  }

  // Update slider positions from traits object
  function updateSliders(traits) {
    DATA.TRAITS.forEach(tc => {
      const div = document.querySelector(`[data-trait="${tc.id}"]`);
      if (!div) return;
      const val = traits[tc.id];
      div.querySelector('input[type="range"]').value = val;
      div.querySelector('.trait-value').textContent = val;
      div.querySelector('.trait-descriptor').textContent = window.Dragon.getDescriptor(tc.id, val);
      div.querySelector('.trait-impact').textContent = window.Explanations.traitImpact(tc.id, val);
    });
  }

  // --------------------------------------------------------
  // FIRE DESIGN PANEL
  // --------------------------------------------------------
  function renderFireDesignPanel(fireDesign, parentContainer) {
    const panel = document.createElement('div');
    panel.id = 'fire-design-panel';
    panel.className = 'fire-design-panel';

    // Get current compatibility
    const compat = (DATA.FIRE_COMPATIBILITY[fireDesign.fuel] || {})[fireDesign.ignition] || 1.0;
    const deliveryCompat = (DATA.FIRE_DELIVERY_COMPAT[fireDesign.fuel] || {})[fireDesign.delivery] || 1.0;
    const compatClass = compat >= 1.2 ? 'compat-good' : compat >= 0.9 ? 'compat-ok' : 'compat-bad';
    const dCompatClass = deliveryCompat >= 1.2 ? 'compat-good' : deliveryCompat >= 0.9 ? 'compat-ok' : 'compat-bad';

    panel.innerHTML = `
      <div class="slider-group-label">Fire Design Lab</div>
      <div class="fire-section">
        <label class="fire-label">Fuel Chemistry
          <button class="info-btn" data-tooltip="fuelChemistry" title="The chemical composition of the fire gland's output.">i</button>
        </label>
        <div class="fire-select-group" id="fuel-select">
          ${DATA.FIRE_FUELS.map(f => `
            <button class="fire-option ${fireDesign.fuel === f.id ? 'selected' : ''}" data-type="fuel" data-id="${f.id}" title="${f.description}">
              <span class="fire-option-icon">${f.icon}</span>
              <span class="fire-option-label">${f.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="fire-section">
        <label class="fire-label">Ignition Method
          <button class="info-btn" data-tooltip="ignitionOrgan" title="The biological mechanism that initiates combustion.">i</button>
        </label>
        <div class="fire-select-group" id="ignition-select">
          ${DATA.FIRE_IGNITIONS.map(ig => `
            <button class="fire-option ${fireDesign.ignition === ig.id ? 'selected' : ''}" data-type="ignition" data-id="${ig.id}" title="${ig.description}">
              <span class="fire-option-label">${ig.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="fire-section">
        <label class="fire-label">Breath Delivery
          <button class="info-btn" data-tooltip="deliveryType" title="The physical mechanism for expelling fire.">i</button>
        </label>
        <div class="fire-select-group" id="delivery-select">
          ${DATA.FIRE_DELIVERIES.map(d => `
            <button class="fire-option ${fireDesign.delivery === d.id ? 'selected' : ''}" data-type="delivery" data-id="${d.id}" title="${d.description}">
              <span class="fire-option-label">${d.label}</span>
              <span class="fire-option-role">${d.role}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="fire-compat-display">
        <div class="compat-row">
          <span>Fuel-Ignition:</span>
          <span class="compat-badge ${compatClass}">${(compat * 100).toFixed(0)}%</span>
        </div>
        <div class="compat-row">
          <span>Fuel-Delivery:</span>
          <span class="compat-badge ${dCompatClass}">${(deliveryCompat * 100).toFixed(0)}%</span>
        </div>
      </div>
    `;

    parentContainer.appendChild(panel);

    // Wire fire option clicks
    panel.querySelectorAll('.fire-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        // Update selection visual
        btn.parentElement.querySelectorAll('.fire-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (onFireDesignChange) onFireDesignChange(type, id);
      });
    });
  }

  // Update fire design panel compatibility display
  function updateFireCompat(fireDesign) {
    const compat = (DATA.FIRE_COMPATIBILITY[fireDesign.fuel] || {})[fireDesign.ignition] || 1.0;
    const deliveryCompat = (DATA.FIRE_DELIVERY_COMPAT[fireDesign.fuel] || {})[fireDesign.delivery] || 1.0;
    const display = document.querySelector('.fire-compat-display');
    if (display) {
      const rows = display.querySelectorAll('.compat-row');
      if (rows[0]) {
        const badge = rows[0].querySelector('.compat-badge');
        badge.textContent = (compat * 100).toFixed(0) + '%';
        badge.className = 'compat-badge ' + (compat >= 1.2 ? 'compat-good' : compat >= 0.9 ? 'compat-ok' : 'compat-bad');
      }
      if (rows[1]) {
        const badge = rows[1].querySelector('.compat-badge');
        badge.textContent = (deliveryCompat * 100).toFixed(0) + '%';
        badge.className = 'compat-badge ' + (deliveryCompat >= 1.2 ? 'compat-good' : deliveryCompat >= 0.9 ? 'compat-ok' : 'compat-bad');
      }
    }
  }

  // --------------------------------------------------------
  // RESULTS DASHBOARD
  // --------------------------------------------------------
  function renderResults(results, previousResults) {
    // Render to both build preview and simulate tab
    const panels = [document.getElementById('results-content'), document.getElementById('results-content-sim')];
    panels.forEach(panel => { if (panel) renderResultsToPanel(panel, results, previousResults); });
  }

  function renderResultsToPanel(panel, results, previousResults) {
    if (!panel) return;

    const c = results.classification;
    const lr = results.labReport;

    panel.innerHTML = `
      <div class="classification-card badge-${c.badge}">
        <div class="classification-name">${c.name}</div>
        <div class="classification-desc">${c.description}</div>
      </div>

      ${renderSystemSection('Flight', results.flight.flightClass, [
        { label: 'Takeoff', value: results.flight.takeoff },
        { label: 'Sustained Flight', value: results.flight.sustained },
        { label: 'Glide Quality', value: results.flight.glide },
        { label: 'Maneuverability', value: results.flight.maneuverability }
      ], window.Explanations.flight(results), previousResults ? previousResults.flight : null)}

      ${renderSystemSection('Fire System', results.fire.fireClass, [
        { label: 'Fire Output', value: results.fire.fireOutput },
        { label: 'Stability', value: results.fire.stability },
        { label: 'Blowback Risk', value: results.fire.blowbackRisk, inverted: true },
        { label: 'Fuel Efficiency', value: results.fire.fuelEfficiency },
        { label: 'Compatibility', value: results.fire.overallCompat * 66.7 }
      ], window.Explanations.fire(results), previousResults ? previousResults.fire : null)}

      ${results.fire.failureModes.length > 0 ? `
        <div class="failure-modes">
          <div class="failure-title">Fire Failure Warnings</div>
          ${results.fire.failureModes.map(fm => `
            <div class="failure-item"><span class="failure-icon">⚠</span> <strong>${fm.label}:</strong> ${fm.description}</div>
          `).join('')}
        </div>
      ` : ''}

      ${renderSystemSection('Energy', results.energy.energyClass, [
        { label: 'Base Cost', value: results.energy.baseCost, inverted: true },
        { label: 'Flight Cost', value: results.energy.flightCost, inverted: true },
        { label: 'Fire Cost', value: results.energy.fireCost, inverted: true },
        { label: 'Total Strain', value: results.energy.totalStrain, inverted: true },
        { label: 'Sustainability', value: results.energy.sustainability }
      ], window.Explanations.energy(results), previousResults ? previousResults.energy : null)}

      ${renderSystemSection('Durability', results.durability.durabilityClass, [
        { label: 'Structural Integrity', value: results.durability.total }
      ], window.Explanations.durability(results), previousResults ? previousResults.durability : null)}

      ${renderSystemSection('Survival', results.survival.survivalClass, [
        { label: 'Mobility', value: results.survival.mobility },
        { label: 'Hunting Efficiency', value: results.survival.hunting },
        { label: 'Overall Rating', value: results.survival.rating }
      ], window.Explanations.survival(results), previousResults ? previousResults.survival : null)}

      <div class="lab-report">
        <div class="lab-report-title">Lab Report</div>
        <div class="lab-report-row"><span class="lr-label">Strongest:</span> ${lr.strongestFeature} (${lr.strongestScore})</div>
        <div class="lab-report-row"><span class="lr-label">Weakest:</span> ${lr.biggestWeakness} (${lr.weakestScore})</div>
        <div class="lab-report-row"><span class="lr-label">Analysis:</span> ${lr.scientificReason}</div>
        <div class="lab-report-row"><span class="lr-label">Recommendation:</span> ${lr.suggestedImprovement}</div>
        ${lr.fireWarnings.length > 0 ? `<div class="lab-report-row lr-warning"><span class="lr-label">Fire Warnings:</span> ${lr.fireWarnings.join(', ')}</div>` : ''}
      </div>
    `;
  }

  function renderSystemSection(title, subtitle, meters, explanations, previousSection) {
    const meterHTML = meters.map(m => {
      const pct = Math.max(0, Math.min(100, m.value));
      const colorClass = m.inverted
        ? (pct > 60 ? 'meter-danger' : pct > 35 ? 'meter-warning' : 'meter-good')
        : (pct > 60 ? 'meter-good' : pct > 35 ? 'meter-warning' : 'meter-danger');
      return `
        <div class="result-meter">
          <span class="meter-label">${m.label}</span>
          <div class="meter-bar"><div class="meter-fill ${colorClass}" style="width:${pct}%"></div></div>
          <span class="meter-value">${Math.round(pct)}</span>
        </div>
      `;
    }).join('');

    const detailHTML = explanations.details.map(d => `<p class="result-detail">${d}</p>`).join('');
    const recsHTML = explanations.recommendations.map(r => `<p class="result-rec">${r}</p>`).join('');

    return `
      <div class="result-section">
        <div class="result-header">
          <span class="result-title">${title}</span>
          <span class="result-subtitle">${subtitle}</span>
        </div>
        ${meterHTML}
        <div class="result-explanations">${detailHTML}${recsHTML}</div>
      </div>
    `;
  }

  // --------------------------------------------------------
  // HABITAT PANEL
  // --------------------------------------------------------
  function renderHabitatSelector(onSelect) {
    const container = document.getElementById('habitat-selector');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(DATA.HABITATS).forEach(key => {
      const h = DATA.HABITATS[key];
      const btn = document.createElement('button');
      btn.className = 'habitat-btn';
      btn.dataset.habitat = key;
      btn.innerHTML = `<span class="habitat-dot" style="background:${h.color}"></span>${h.label}`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.habitat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(key);
      });
      container.appendChild(btn);
    });
  }

  function renderHabitatResults(habitatResult) {
    const panel = document.getElementById('habitat-results');
    if (!panel || !habitatResult) return;

    const exp = window.Explanations.habitat(habitatResult);

    panel.innerHTML = `
      <div class="habitat-viability">
        <div class="viability-label">Habitat Viability</div>
        <div class="viability-score">${Math.round(habitatResult.viability)}%</div>
        <div class="meter-bar large"><div class="meter-fill ${habitatResult.viability > 60 ? 'meter-good' : habitatResult.viability > 35 ? 'meter-warning' : 'meter-danger'}" style="width:${habitatResult.viability}%"></div></div>
      </div>
      <div class="habitat-deltas">
        ${Object.keys(habitatResult.deltas).map(key => {
          const d = habitatResult.deltas[key];
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const cls = d > 2 ? 'delta-up' : d < -2 ? 'delta-down' : 'delta-neutral';
          const arrow = d > 2 ? '▲' : d < -2 ? '▼' : '—';
          return `<div class="delta-row ${cls}"><span>${label}</span><span>${arrow} ${d > 0 ? '+' : ''}${d.toFixed(1)}</span></div>`;
        }).join('')}
      </div>
      <div class="result-explanations">
        ${exp.details.map(d => `<p class="result-detail">${d}</p>`).join('')}
      </div>
    `;
  }

  // --------------------------------------------------------
  // BATTLE UI
  // --------------------------------------------------------
  function renderBattleSetup(onStart) {
    const panel = document.getElementById('battle-setup');
    if (!panel) return;

    // Enemy selector
    let enemyHTML = '<div class="battle-section-title">Choose Opponent</div><div class="enemy-grid">';
    Object.keys(DATA.ENEMY_ARCHETYPES).forEach(key => {
      const e = DATA.ENEMY_ARCHETYPES[key];
      enemyHTML += `
        <button class="enemy-card" data-enemy="${key}">
          <div class="enemy-dot" style="background:${e.tintColor}"></div>
          <div class="enemy-name">${e.label}</div>
          <div class="enemy-desc">${e.description}</div>
        </button>
      `;
    });
    enemyHTML += '</div>';

    // Arena selector
    let arenaHTML = '<div class="battle-section-title">Choose Arena</div><div class="arena-grid">';
    Object.keys(DATA.BATTLE_CONFIG.arenas).forEach(key => {
      const a = DATA.BATTLE_CONFIG.arenas[key];
      arenaHTML += `<button class="arena-btn" data-arena="${key}">${a.label}</button>`;
    });
    arenaHTML += '</div>';

    // Speed control
    const speedHTML = `
      <div class="battle-section-title">Battle Speed</div>
      <div class="speed-control">
        <button class="speed-btn active" data-speed="normal">Normal</button>
        <button class="speed-btn" data-speed="fast">Fast</button>
      </div>
    `;

    panel.innerHTML = enemyHTML + arenaHTML + speedHTML + `
      <button class="btn-primary btn-start-battle" id="btn-start-battle" disabled>Start Battle</button>
    `;

    // Wire selections
    let selectedEnemy = null;
    let selectedArena = 'plains';
    let selectedSpeed = 'normal';

    panel.querySelectorAll('.enemy-card').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.enemy-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEnemy = btn.dataset.enemy;
        document.getElementById('btn-start-battle').disabled = !selectedEnemy;
      });
    });

    // Default arena
    panel.querySelectorAll('.arena-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.arena-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedArena = btn.dataset.arena;
      });
    });
    panel.querySelector('.arena-btn').classList.add('active');

    panel.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSpeed = btn.dataset.speed;
      });
    });

    document.getElementById('btn-start-battle').addEventListener('click', () => {
      if (selectedEnemy && onStart) onStart(selectedEnemy, selectedArena, selectedSpeed);
    });
  }

  function renderBattleInProgress(state, tickIndex) {
    const panel = document.getElementById('battle-display');
    if (!panel) return;

    const p = state.player;
    const e = state.enemy;

    panel.innerHTML = `
      <div class="battle-hud">
        <div class="combatant-hud player-hud">
          <div class="combatant-name">${p.name}</div>
          ${renderBar('HP', p.hp, 100, 'hp')}
          ${renderBar('Stamina', p.stamina, 100, 'stamina')}
          ${renderBar('Fire System', p.fireSystem, 100, 'fire')}
          <div class="last-action">Action: ${p.lastAction ? window.Battle.getActionLabel(p.lastAction) : '—'}</div>
        </div>
        <div class="battle-vs">VS</div>
        <div class="combatant-hud enemy-hud">
          <div class="combatant-name">${e.name}</div>
          ${renderBar('HP', e.hp, 100, 'hp')}
          ${renderBar('Stamina', e.stamina, 100, 'stamina')}
          ${renderBar('Fire System', e.fireSystem, 100, 'fire')}
          <div class="last-action">Action: ${e.lastAction ? window.Battle.getActionLabel(e.lastAction) : '—'}</div>
        </div>
      </div>
      <div class="battle-tick-counter">Round ${state.tick} / ${DATA.BATTLE_CONFIG.maxTicks}</div>
      <div class="battle-log" id="battle-log">
        ${state.log.slice(Math.max(0, tickIndex - 6), tickIndex + 1).map(tick =>
          `<div class="log-entry"><span class="log-tick">R${tick.tick}</span> ${tick.events.join(' ')}</div>`
        ).join('')}
      </div>
    `;

    // Auto-scroll log
    const logEl = document.getElementById('battle-log');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  function renderBar(label, value, max, type) {
    const pct = Math.max(0, (value / max) * 100);
    return `
      <div class="battle-bar">
        <span class="bar-label">${label}</span>
        <div class="bar-track"><div class="bar-fill bar-${type}" style="width:${pct}%"></div></div>
        <span class="bar-value">${Math.round(value)}</span>
      </div>
    `;
  }

  function renderBattleSummary(state) {
    const panel = document.getElementById('battle-display');
    if (!panel) return;

    const report = window.Explanations.battleReport(state);

    panel.innerHTML = `
      <div class="battle-summary">
        <div class="battle-result ${state.winner === 'player' ? 'result-win' : state.winner === 'draw' ? 'result-draw' : 'result-loss'}">
          ${state.winner === 'player' ? 'VICTORY' : state.winner === 'draw' ? 'DRAW' : 'DEFEAT'}
        </div>
        <div class="battle-summary-text">${report.summary}</div>
        ${report.details.map(d => `<p class="battle-detail">${d}</p>`).join('')}
        ${report.recommendations.length > 0 ? `
          <div class="battle-recs-title">Recommendations</div>
          ${report.recommendations.map(r => `<p class="battle-rec">${r}</p>`).join('')}
        ` : ''}
        <button class="btn-primary" id="btn-battle-again">Battle Again</button>
        <button class="btn-secondary" id="btn-return-lab">Return to Lab</button>
      </div>
    `;
  }

  // --------------------------------------------------------
  // SCIENCE NOTES
  // --------------------------------------------------------
  function renderScienceNotes() {
    const container = document.getElementById('science-notes-content');
    if (!container) return;

    const categories = {};
    DATA.SCIENCE_NOTES.forEach(note => {
      if (!categories[note.category]) categories[note.category] = [];
      categories[note.category].push(note);
    });

    const categoryLabels = {
      flight: 'Aerodynamics & Flight',
      fire: 'Fire Systems',
      energy: 'Energy & Metabolism',
      structure: 'Structural Biology',
      ecology: 'Ecology & Adaptation',
      combat: 'Combat Science'
    };

    let html = '<div class="science-notes-grid">';
    Object.keys(categories).forEach(cat => {
      html += `<div class="science-category"><div class="science-cat-label">${categoryLabels[cat] || cat}</div>`;
      categories[cat].forEach(note => {
        html += `
          <div class="science-note-card">
            <div class="note-title">${note.title}</div>
            <div class="note-content">${note.content}</div>
          </div>
        `;
      });
      html += '</div>';
    });
    html += '</div>';

    // Glossary
    html += '<div class="glossary-section"><div class="science-cat-label">Glossary</div><div class="glossary-grid">';
    Object.keys(DATA.SCIENCE_GLOSSARY).forEach(key => {
      const g = DATA.SCIENCE_GLOSSARY[key];
      html += `<div class="glossary-item"><strong>${g.term}</strong>: ${g.definition}</div>`;
    });
    html += '</div></div>';

    container.innerHTML = html;
  }

  // --------------------------------------------------------
  // PRESETS DROPDOWN
  // --------------------------------------------------------
  function renderPresets(onSelect) {
    const container = document.getElementById('presets-container');
    if (!container) return;

    let html = '';
    Object.keys(DATA.PRESETS).forEach(key => {
      const p = DATA.PRESETS[key];
      html += `<button class="preset-btn" data-preset="${key}" title="${p.description}">${p.label}</button>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (onSelect) onSelect(btn.dataset.preset);
      });
    });
  }

  // --------------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------------
  function showNotification(msg, type) {
    const el = document.createElement('div');
    el.className = 'notification notification-' + (type || 'info');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  // --------------------------------------------------------
  // HIGHLIGHT ELEMENT (for tutorial)
  // --------------------------------------------------------
  function highlightElement(selector) {
    // Remove existing highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    if (selector) {
      const el = document.querySelector(selector);
      if (el) el.classList.add('tutorial-highlight');
    }
  }

  return {
    initTabs, switchTab, renderSliders, updateSliders, updateFireCompat,
    renderResults, renderHabitatSelector, renderHabitatResults,
    renderBattleSetup, renderBattleInProgress, renderBattleSummary,
    renderScienceNotes, renderPresets, showNotification, highlightElement
  };
})();

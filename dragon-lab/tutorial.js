// ============================================================
// Dragon Engineering Lab — Tutorial System
// Interactive onboarding with guided steps, focus rings,
// callout cards, and contextual help integration.
// ============================================================

window.Tutorial = (function() {
  const DATA = window.DragonData;
  const STEPS = DATA.TUTORIAL_STEPS;

  let active = false;
  let currentStep = 0;
  let overlay = null;
  let waitingFor = null;
  let eventCleanups = [];

  // --------------------------------------------------------
  // INIT — check if first run
  // --------------------------------------------------------
  function init() {
    if (!window.Dragon.isTutorialComplete()) {
      // Small delay to let the app render first
      setTimeout(() => start(), 800);
    }
  }

  // --------------------------------------------------------
  // START / STOP
  // --------------------------------------------------------
  function start() {
    active = true;
    currentStep = 0;
    createOverlay();
    showStep(0);
  }

  function skip() {
    active = false;
    window.Dragon.setTutorialComplete(true);
    removeOverlay();
    clearWait();
    window.UI.highlightElement(null);
  }

  function reset() {
    window.Dragon.setTutorialComplete(false);
    start();
  }

  // --------------------------------------------------------
  // OVERLAY
  // --------------------------------------------------------
  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // --------------------------------------------------------
  // SHOW STEP
  // --------------------------------------------------------
  function showStep(index) {
    if (index >= STEPS.length) {
      skip();
      return;
    }

    currentStep = index;
    const step = STEPS[index];

    // Switch tab if needed
    if (step.tab) {
      window.UI.switchTab(step.tab);
    }

    // Highlight target
    window.UI.highlightElement(step.target);

    // Build callout
    overlay.innerHTML = '';
    const callout = document.createElement('div');
    callout.className = 'tutorial-callout';

    // Position callout near target
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        // Try to position to the right or below the target
        if (rect.right + 340 < viewW) {
          callout.style.left = (rect.right + 16) + 'px';
          callout.style.top = Math.max(20, rect.top) + 'px';
        } else if (rect.bottom + 200 < viewH) {
          callout.style.left = Math.max(20, rect.left) + 'px';
          callout.style.top = (rect.bottom + 16) + 'px';
        } else {
          callout.style.left = Math.max(20, rect.left - 340) + 'px';
          callout.style.top = Math.max(20, rect.top) + 'px';
        }
      }
    } else {
      // Center
      callout.style.left = '50%';
      callout.style.top = '50%';
      callout.style.transform = 'translate(-50%, -50%)';
    }

    // Step indicator
    const dots = STEPS.map((_, i) =>
      `<span class="step-dot ${i === index ? 'active' : i < index ? 'done' : ''}"></span>`
    ).join('');

    callout.innerHTML = `
      <div class="tutorial-title">${step.title}</div>
      <div class="tutorial-text">${step.text}</div>
      <div class="tutorial-dots">${dots}</div>
      <div class="tutorial-buttons">
        ${step.waitFor ? '' : `<button class="tutorial-next" id="tutorial-next">Next</button>`}
        <button class="tutorial-skip" id="tutorial-skip">Skip Tutorial</button>
      </div>
    `;

    overlay.appendChild(callout);

    // Wire buttons
    const nextBtn = document.getElementById('tutorial-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => advance());
    }
    const skipBtn = document.getElementById('tutorial-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => skip());
    }

    // Wait for user action if required
    if (step.waitFor) {
      setupWait(step.waitFor);
    }
  }

  // --------------------------------------------------------
  // WAIT FOR USER ACTION
  // --------------------------------------------------------
  function setupWait(waitType) {
    clearWait();
    waitingFor = waitType;

    switch (waitType) {
      case 'slider_change': {
        const handler = () => {
          clearWait();
          // Show brief feedback then advance
          setTimeout(() => advance(), 600);
        };
        document.querySelectorAll('.trait-slider input[type="range"]').forEach(s => {
          s.addEventListener('input', handler, { once: true });
          eventCleanups.push(() => s.removeEventListener('input', handler));
        });
        break;
      }
      case 'simulation_run': {
        // Listen for the simulate button click
        const btn = document.getElementById('btn-simulate');
        if (btn) {
          const handler = () => {
            clearWait();
            setTimeout(() => advance(), 800);
          };
          btn.addEventListener('click', handler, { once: true });
          eventCleanups.push(() => btn.removeEventListener('click', handler));
        } else {
          // Fallback: auto-advance after delay
          const tid = setTimeout(() => advance(), 3000);
          eventCleanups.push(() => clearTimeout(tid));
        }
        break;
      }
      case 'habitat_select': {
        const handler = () => {
          clearWait();
          setTimeout(() => advance(), 800);
        };
        document.querySelectorAll('.habitat-btn').forEach(b => {
          b.addEventListener('click', handler, { once: true });
          eventCleanups.push(() => b.removeEventListener('click', handler));
        });
        break;
      }
      default:
        // Unknown wait type, auto-advance
        const tid = setTimeout(() => advance(), 3000);
        eventCleanups.push(() => clearTimeout(tid));
    }
  }

  function clearWait() {
    waitingFor = null;
    eventCleanups.forEach(fn => fn());
    eventCleanups = [];
  }

  // --------------------------------------------------------
  // ADVANCE
  // --------------------------------------------------------
  function advance() {
    if (!active) return;
    currentStep++;
    if (currentStep >= STEPS.length) {
      skip();
      window.UI.showNotification('Tutorial complete — experiment freely!', 'success');
    } else {
      showStep(currentStep);
    }
  }

  // --------------------------------------------------------
  // PUBLIC
  // --------------------------------------------------------
  return { init, start, skip, reset };
})();

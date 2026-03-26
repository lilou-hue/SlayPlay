// ============================================================
// Dragon Engineering Lab — Explanation System
// Generates plain-language result text, "why this happened"
// explanations, recommendations, and battle reports.
// ============================================================

window.Explanations = (function() {

  // --------------------------------------------------------
  // FLIGHT EXPLANATIONS
  // --------------------------------------------------------
  function flight(results) {
    const f = results.flight;
    const summary = f.flightClass;
    const details = [];
    const recommendations = [];

    // Takeoff
    if (f.takeoff < 25) {
      details.push('This dragon cannot generate enough force for takeoff. The wing area and muscle power are insufficient relative to its body weight.');
    } else if (f.takeoff < 50) {
      details.push('Takeoff is possible under ideal conditions but requires a running start or cliff launch. Muscle power is marginal for the current mass.');
    } else if (f.takeoff < 75) {
      details.push('Takeoff capability is good — the dragon can launch from standing with reasonable effort.');
    } else {
      details.push('Exceptional takeoff power. This dragon can launch vertically with energy to spare.');
    }

    // Sustained flight
    if (f.sustained < 25) {
      details.push('Sustained flight is not viable. The dragon will lose altitude rapidly after any brief airborne period.');
      recommendations.push('Increase wing area and wingspan, or significantly reduce body mass to improve lift-to-weight ratio.');
    } else if (f.sustained < 50) {
      details.push('Short burst flight is possible, but the dragon cannot maintain altitude for extended periods. Energy drain is severe.');
      recommendations.push('Reduce effective load by lowering bone density or scale thickness, or increase wing area for better sustained lift.');
    } else if (f.sustained < 75) {
      details.push('Sustained flight is achievable with moderate energy expenditure. The dragon can travel reasonable distances.');
    } else {
      details.push('Highly efficient sustained flight. This design is well-optimized for aerial operation.');
    }

    // Glide
    if (f.glide >= 70) {
      details.push('Excellent glide ratio — the dragon can cover long distances with minimal energy by riding thermals and descending gradually.');
    } else if (f.glide >= 40) {
      details.push('Adequate glide capability for controlled descent and energy-saving transit between active flight phases.');
    } else {
      details.push('Poor glide performance. Without active flapping, this dragon drops quickly.');
    }

    // Maneuverability
    if (f.maneuverability < 30) {
      details.push('Maneuverability is severely limited. This dragon turns slowly and cannot pursue agile targets or navigate tight spaces.');
      recommendations.push('Increase tail size for better balance or reduce body mass for improved agility.');
    } else if (f.maneuverability >= 70) {
      details.push('Highly maneuverable — capable of tight turns, rapid direction changes, and aerial combat positioning.');
    }

    return { summary, details, recommendations };
  }

  // --------------------------------------------------------
  // FIRE EXPLANATIONS
  // --------------------------------------------------------
  function fire(results) {
    const f = results.fire;
    const summary = f.fireClass;
    const details = [];
    const recommendations = [];

    // Compatibility
    if (f.overallCompat < 0.8) {
      details.push(`Poor system compatibility (${(f.overallCompat * 100).toFixed(0)}%). The ${f.fuelType.label} fuel works poorly with the ${f.ignitionMethod.label} ignition and ${f.deliveryType.label} delivery. This combination wastes energy and increases failure risk.`);
      recommendations.push('Try a different fuel-ignition-delivery combination. Check compatibility indicators for green pairings.');
    } else if (f.overallCompat >= 1.2) {
      details.push(`Excellent system compatibility (${(f.overallCompat * 100).toFixed(0)}%). The ${f.fuelType.label}, ${f.ignitionMethod.label}, and ${f.deliveryType.label} combination works synergistically.`);
    } else {
      details.push(`Acceptable system compatibility (${(f.overallCompat * 100).toFixed(0)}%). The fire system components work together adequately.`);
    }

    // Output
    if (f.fireOutput < 20) {
      details.push('Fire output is negligible. The fuel gland is too small or the ignition system too weak to produce meaningful flame.');
      recommendations.push('Increase fuel gland size and ignition efficiency for baseline fire capability.');
    } else if (f.fireOutput >= 70) {
      details.push('Powerful fire output. This dragon can deliver devastating flame attacks, but the energy and safety costs must be managed.');
    }

    // Stability
    if (f.stability < 30) {
      details.push('Fire system is highly unstable. Repeated use risks combustion failure, misfires, and unpredictable output.');
      recommendations.push('Improve ignition efficiency, increase heat tolerance, or choose a less volatile fuel type.');
    } else if (f.stability >= 70) {
      details.push('Stable, reliable fire production. The dragon can use fire repeatedly with consistent results.');
    }

    // Blowback
    if (f.blowbackRisk > 60) {
      details.push(`WARNING: Severe blowback risk (${Math.round(f.blowbackRisk)}%). Fuel may ignite inside the throat or gland, causing critical internal damage.`);
      recommendations.push('Increase scale thickness and heat tolerance, or switch to a less dangerous fuel type. Consider reducing fuel gland size.');
    } else if (f.blowbackRisk > 35) {
      details.push(`Moderate blowback risk (${Math.round(f.blowbackRisk)}%). Extended fire use carries some internal danger.`);
    }

    // Failure modes
    f.failureModes.forEach(fm => {
      details.push(`FAILURE MODE — ${fm.label}: ${fm.description}`);
    });

    return { summary, details, recommendations };
  }

  // --------------------------------------------------------
  // ENERGY EXPLANATIONS
  // --------------------------------------------------------
  function energy(results) {
    const e = results.energy;
    const summary = e.energyClass;
    const details = [];
    const recommendations = [];

    if (e.sustainability < 25) {
      details.push('This dragon\'s energy demands are biologically impossible to sustain. It would need to eat constantly and still lose body mass rapidly.');
      recommendations.push('This is a critical design flaw. Reduce body mass, muscle power, or metabolism. Increase stomach capacity.');
    } else if (e.sustainability < 50) {
      details.push('Extreme food demands. This dragon would need to hunt successfully multiple times daily and spend most of its active time feeding.');
      recommendations.push('Reduce metabolic demands by lowering metabolism or muscle power, or increase stomach capacity for better nutrient storage.');
    } else if (e.sustainability < 70) {
      details.push('Energy balance is tight but manageable. This dragon must feed regularly and cannot afford long periods of intense activity.');
    } else {
      details.push('Sustainable energy profile. This dragon can maintain its systems without excessive food requirements.');
    }

    if (e.flightCost > 50) {
      details.push('Flight is energetically expensive for this design. Sustained aerial operation will rapidly deplete energy reserves.');
    }
    if (e.fireCost > 40) {
      details.push('Fire production places a significant burden on the energy budget. Frequent fire use will accelerate exhaustion.');
    }

    return { summary, details, recommendations };
  }

  // --------------------------------------------------------
  // DURABILITY EXPLANATIONS
  // --------------------------------------------------------
  function durability(results) {
    const d = results.durability;
    const summary = d.durabilityClass;
    const details = [];
    const recommendations = [];

    if (d.total < 25) {
      details.push('Extremely fragile construction. This dragon\'s skeleton and armor cannot withstand serious physical stress or combat damage.');
      recommendations.push('Increase bone density and scale thickness. Even moderate improvements make a significant difference in survivability.');
    } else if (d.total < 50) {
      details.push('Lightly built — adequate for avoiding danger but vulnerable in direct confrontation. This design relies on not being hit.');
    } else if (d.total >= 75) {
      details.push('Heavily armored and structurally robust. This dragon can absorb significant damage, but the weight cost impacts flight and energy.');
    } else {
      details.push('Balanced structural integrity. This dragon can handle moderate physical stress without critical failure.');
    }

    return { summary, details, recommendations };
  }

  // --------------------------------------------------------
  // SURVIVAL EXPLANATIONS
  // --------------------------------------------------------
  function survival(results) {
    const s = results.survival;
    const summary = s.survivalClass;
    const details = [];
    const recommendations = [];

    if (s.rating < 30) {
      details.push('This dragon has critical survival deficiencies. Multiple systems are too weak to support long-term viability in any environment.');
      recommendations.push('Focus on the weakest subsystem first — usually energy sustainability or flight capability.');
    } else if (s.rating < 50) {
      details.push('Survival is marginal. This dragon could persist in favorable conditions but would struggle against competition or environmental stress.');
    } else if (s.rating >= 75) {
      details.push('Strong overall survival capacity. This design can adapt to challenges and sustain itself effectively.');
    }

    if (s.hunting < 40) {
      details.push('Hunting efficiency is poor. Low mobility or intelligence limits the dragon\'s ability to locate and capture prey.');
      recommendations.push('Increase intelligence for better hunting tactics, or improve flight capability for aerial pursuit.');
    } else if (s.hunting >= 70) {
      details.push('Excellent hunting efficiency. High intelligence and mobility make this dragon an effective predator.');
    }

    return { summary, details, recommendations };
  }

  // --------------------------------------------------------
  // HABITAT EXPLANATIONS
  // --------------------------------------------------------
  function habitat(habitatResults) {
    if (!habitatResults) return { summary: 'No habitat selected', details: [], recommendations: [] };

    const h = habitatResults;
    const name = h.habitat.label;
    const details = [];
    const recommendations = [];

    if (h.viability >= 70) {
      details.push(`This dragon is well-suited for the ${name}. Its design aligns with the environmental demands.`);
    } else if (h.viability >= 45) {
      details.push(`This dragon can survive in the ${name} but faces meaningful challenges from the environmental conditions.`);
    } else {
      details.push(`This dragon is poorly suited for the ${name}. Several critical systems are penalized by the environment.`);
    }

    // Report significant deltas
    const d = h.deltas;
    if (d.flight_sustained < -10) details.push(`Flight capability is significantly reduced (${d.flight_sustained.toFixed(0)}) in this environment.`);
    if (d.flight_sustained > 10) details.push(`Flight performance improves (${'+' + d.flight_sustained.toFixed(0)}) due to favorable air conditions.`);
    if (d.fire_output < -10) details.push(`Fire output is suppressed (${d.fire_output.toFixed(0)}) by environmental conditions.`);
    if (d.fire_output > 10) details.push(`Fire output is amplified (${'+' + d.fire_output.toFixed(0)}) by ambient heat or atmospheric composition.`);
    if (d.energy_sustainability < -10) details.push(`Energy sustainability drops (${d.energy_sustainability.toFixed(0)}) due to environmental metabolic stress.`);
    if (d.survival_rating < -15) details.push(`Overall survival rating drops sharply (${d.survival_rating.toFixed(0)}). This habitat exposes critical weaknesses.`);
    if (d.survival_rating > 10) details.push(`Survival improves (${'+' + d.survival_rating.toFixed(0)}) — this dragon's traits match the environment well.`);

    return { summary: `${name} Viability: ${Math.round(h.viability)}%`, details, recommendations };
  }

  // --------------------------------------------------------
  // CLASSIFICATION EXPLANATION
  // --------------------------------------------------------
  function classification(rule, results) {
    return rule.description || 'This dragon\'s overall profile matches the ' + rule.name + ' classification.';
  }

  // --------------------------------------------------------
  // BATTLE REPORT
  // --------------------------------------------------------
  function battleReport(battleResult) {
    if (!battleResult) return { summary: 'No battle data', details: [], recommendations: [] };

    const details = [];
    const recommendations = [];
    const winner = battleResult.winner;
    const log = battleResult.log;
    const playerWon = winner === 'player';

    // Find decisive moment
    let biggestSwing = 0;
    let decisiveTick = 0;
    for (let i = 1; i < log.length; i++) {
      const hpDelta = Math.abs(
        (log[i].playerState.hp - log[i-1].playerState.hp) -
        (log[i].enemyState.hp - log[i-1].enemyState.hp)
      );
      if (hpDelta > biggestSwing) {
        biggestSwing = hpDelta;
        decisiveTick = i;
      }
    }

    const summary = playerWon
      ? `Victory in ${log.length} rounds`
      : winner === 'draw'
        ? `Draw after ${log.length} rounds`
        : `Defeat in ${log.length} rounds`;

    if (playerWon) {
      details.push('Your dragon design proved superior in this matchup.');
    } else if (winner === 'draw') {
      details.push('Neither dragon could achieve a decisive advantage. Both designs reached exhaustion simultaneously.');
    } else {
      details.push('The enemy dragon\'s design advantages overcame your build in this arena.');
    }

    if (decisiveTick > 0 && log[decisiveTick]) {
      const dt = log[decisiveTick];
      details.push(`The decisive moment came at round ${decisiveTick + 1}: ${dt.events.join(' ')}`);
    }

    // Analyze why
    const finalTick = log[log.length - 1];
    if (finalTick) {
      if (finalTick.playerState.stamina <= 0) {
        details.push('Your dragon collapsed from stamina exhaustion — energy sustainability was the critical weakness.');
        recommendations.push('Improve stamina by increasing stomach capacity or reducing metabolism.');
      }
      if (finalTick.playerState.hp <= 0 && finalTick.playerState.stamina > 0) {
        details.push('Your dragon was defeated through accumulated damage — durability and evasion were insufficient.');
        recommendations.push('Increase scale thickness and bone density for better damage resistance, or improve mobility to avoid hits.');
      }
      if (finalTick.enemyState.stamina <= 0 && playerWon) {
        details.push('The enemy ran out of stamina — your design\'s endurance outlasted their aggression.');
      }
      if (finalTick.playerState.fireSystem <= 0) {
        details.push('Your fire system suffered catastrophic failure during battle — blowback risk materialized under combat stress.');
        recommendations.push('Reduce blowback risk by improving fuel-ignition compatibility or increasing heat tolerance.');
      }
    }

    return { summary, details, recommendations, decisiveTick };
  }

  // --------------------------------------------------------
  // TRAIT IMPACT (for contextual help)
  // --------------------------------------------------------
  function traitImpact(traitId, value) {
    const impacts = {
      bodyMass: [
        'Very light — easy to lift but fragile and weak in combat.',
        'Light build — good flight potential, limited durability.',
        'Moderate mass — balanced between flight and ground capability.',
        'Heavy — strong and durable but flight becomes difficult.',
        'Extremely heavy — dominant on the ground but nearly impossible to fly.'
      ],
      wingspan: [
        'Vestigial wings — no meaningful flight capability.',
        'Short wings — limited glide, cannot sustain flight.',
        'Medium wingspan — functional flight with moderate efficiency.',
        'Broad wings — excellent glide and stable sustained flight.',
        'Enormous wingspan — maximum lift but reduced agility in tight spaces.'
      ],
      wingArea: [
        'Minimal membrane — cannot generate meaningful lift.',
        'Small wing surface — struggles to support body weight.',
        'Adequate wing area — functional lift for moderate loads.',
        'Large membrane surface — strong lift generation.',
        'Vast wing area — maximum lift but significant drag.'
      ],
      musclePower: [
        'Atrophied muscles — barely functional, cannot fly or fight effectively.',
        'Lean musculature — efficient but weak in physical confrontation.',
        'Athletic build — good balance of power and efficiency.',
        'Powerful muscles — strong flyer and fighter, but high calorie demands.',
        'Herculean strength — devastating physical power, extreme energy cost.'
      ],
      boneDensity: [
        'Hollow bones — ultralight but extremely fragile.',
        'Light skeleton — good for flight, vulnerable to impacts.',
        'Standard bone density — reasonable durability.',
        'Dense bones — strong structure, significant weight penalty.',
        'Fortified skeleton — near-indestructible but extremely heavy.'
      ],
      metabolism: [
        'Torpid metabolism — minimal energy use, slow to act.',
        'Slow metabolism — energy efficient but limited peak performance.',
        'Normal metabolic rate — balanced energy turnover.',
        'Fast metabolism — supports intense activity, demands frequent feeding.',
        'Hyperdrive metabolism — maximum energy output, constant hunger.'
      ],
      stomachCapacity: [
        'Tiny stomach — can barely sustain basic functions.',
        'Small capacity — frequent feeding required.',
        'Average digestive system — adequate nutrient storage.',
        'Large stomach — excellent energy reserves for sustained activity.',
        'Cavernous digestive system — can store massive energy reserves.'
      ],
      insulation: [
        'No insulation — vulnerable to cold, loses heat rapidly.',
        'Thin insulation — minimal cold protection.',
        'Moderate insulation — comfortable in temperate environments.',
        'Thick insulation — well-protected against cold.',
        'Arctic-grade insulation — thrives in extreme cold, may overheat in warm habitats.'
      ],
      intelligence: [
        'Primitive neural system — relies on instinct, poor tactical ability.',
        'Basic cognition — simple problem-solving only.',
        'Cunning hunter — effective tactical decisions.',
        'Sharp intellect — excellent fire control and combat strategy.',
        'Genius-level — maximizes every advantage, minimizes every risk.'
      ],
      fuelGlandSize: [
        'No fuel gland — fire breathing is impossible.',
        'Small gland — minimal fuel production.',
        'Medium gland — functional fire capability.',
        'Large gland — strong fire output, noticeable internal heat.',
        'Massive gland — devastating fire potential, serious internal hazard.'
      ],
      ignitionEfficiency: [
        'Nonfunctional ignition — cannot reliably start combustion.',
        'Unreliable — frequent misfires and inconsistent output.',
        'Functional — adequate ignition for most fuel types.',
        'Reliable — consistent, precise ignition control.',
        'Precision ignition — instant, perfectly controlled combustion.'
      ],
      scaleThickness: [
        'Paper-thin scales — almost no protection.',
        'Light scales — minimal armor, low weight impact.',
        'Plated armor — meaningful protection against damage.',
        'Heavy armor — strong protection, significant weight.',
        'Fortress-grade plating — maximum protection, extreme weight.'
      ],
      tailSize: [
        'Stub tail — poor balance, limited maneuverability.',
        'Short tail — basic stability.',
        'Medium tail — good balance and aerial control.',
        'Long tail — excellent maneuverability and combat reach.',
        'Massive tail — maximum balance and striking power, adds weight.'
      ],
      neckLength: [
        'Compact neck — short strike range, stable structure.',
        'Short neck — limited reach, good structural support.',
        'Medium neck — balanced reach and stability.',
        'Long neck — extended strike range and fire projection.',
        'Serpentine neck — maximum reach, structural instability at extremes.'
      ]
    };

    const texts = impacts[traitId] || ['', '', '', '', ''];
    const idx = Math.min(Math.floor((value - 1) / 2), 4);
    return texts[idx];
  }

  return {
    flight, fire, energy, durability, survival,
    habitat, classification, battleReport, traitImpact
  };
})();

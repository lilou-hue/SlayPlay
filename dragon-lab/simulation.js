// ============================================================
// Dragon Engineering Lab — Simulation Engine
// All formulas, derived stats, system evaluations, classification,
// habitat testing, battle stat derivation, and lab report generation.
// ============================================================

window.Simulation = (function() {
  const DATA = window.DragonData;
  const W = DATA.FORMULA_WEIGHTS;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // --------------------------------------------------------
  // FLIGHT SYSTEM
  // --------------------------------------------------------
  function evaluateFlight(traits) {
    const f = W.flight;
    // Effective load: everything that adds weight
    const effectiveLoad = traits.bodyMass * f.loadMass
      + traits.boneDensity * f.loadBones
      + traits.scaleThickness * f.loadScales
      + traits.tailSize * f.loadTail
      + traits.neckLength * f.loadNeck;

    // Lift force from wing geometry and muscle
    const liftForce = traits.wingArea * f.liftWingArea
      + traits.wingspan * f.liftWingspan
      + traits.musclePower * f.liftMuscle;

    // Lift-to-load ratio (core flight metric)
    const liftRatio = effectiveLoad > 0 ? clamp(liftForce / effectiveLoad * 50, 0, 100) : 0;

    const takeoff = clamp(liftRatio * f.takeoffLiftMult + traits.musclePower * f.takeoffMuscleMult, 0, 100);
    const sustained = clamp(liftRatio * f.sustainedLiftMult + traits.metabolism * f.sustainedMetabolism + (10 - traits.bodyMass) * f.sustainedMassReduction, 0, 100);
    const glide = clamp(traits.wingspan * f.glideWingspan + traits.wingArea * f.glideArea - traits.bodyMass * f.glideMassPenalty, 0, 100);
    const maneuverability = clamp(traits.tailSize * f.maneuverTail + (10 - traits.bodyMass) * f.maneuverMassReduction + traits.intelligence * f.maneuverIntelligence, 0, 100);

    // Overall flight rating
    const overall = clamp((takeoff * 0.25 + sustained * 0.35 + glide * 0.2 + maneuverability * 0.2), 0, 100);

    // Flight classification
    let flightClass;
    if (sustained >= 70) flightClass = 'Efficient Flyer';
    else if (sustained >= 50) flightClass = 'Stable Flyer';
    else if (sustained >= 30) flightClass = 'Strained Flyer';
    else if (glide >= 50) flightClass = 'Glider';
    else flightClass = 'Grounded';

    return {
      effectiveLoad, liftForce, liftRatio,
      takeoff, sustained, glide, maneuverability, overall,
      flightClass
    };
  }

  // --------------------------------------------------------
  // FIRE SYSTEM (Advanced Modular)
  // --------------------------------------------------------
  function evaluateFire(traits, fireDesign) {
    const fw = W.fire;
    const fuelType = DATA.FIRE_FUELS.find(f => f.id === fireDesign.fuel) || DATA.FIRE_FUELS[0];
    const ignitionMethod = DATA.FIRE_IGNITIONS.find(i => i.id === fireDesign.ignition) || DATA.FIRE_IGNITIONS[0];
    const deliveryType = DATA.FIRE_DELIVERIES.find(d => d.id === fireDesign.delivery) || DATA.FIRE_DELIVERIES[0];

    // Compatibility ratings
    const fuelIgnitionCompat = (DATA.FIRE_COMPATIBILITY[fuelType.id] || {})[ignitionMethod.id] || 1.0;
    const fuelDeliveryCompat = (DATA.FIRE_DELIVERY_COMPAT[fuelType.id] || {})[deliveryType.id] || 1.0;
    const overallCompat = (fuelIgnitionCompat + fuelDeliveryCompat) / 2;

    // Base calculations
    const baseFuel = traits.fuelGlandSize * fuelType.powerMult * fw.fuelGlandMult + traits.metabolism * fw.fuelMetabolism;
    const baseIgnition = traits.ignitionEfficiency * ignitionMethod.reliabilityMult * fw.ignitionMult + traits.intelligence * fw.ignitionIntelligence;

    // Heat tolerance from physical traits
    const heatTolerance = clamp(
      traits.scaleThickness * fw.heatScales + traits.insulation * fw.heatInsulation + traits.boneDensity * fw.heatBones,
      0, 100
    );

    // Fire output — modified by compatibility
    const fireOutput = clamp(
      baseFuel * fw.outputFuel + baseIgnition * fw.outputIgnition * fuelIgnitionCompat + traits.metabolism * fw.outputMetabolism,
      0, 100
    );

    // Stability — how reliably the system works
    const stability = clamp(
      baseIgnition * fw.stabilityIgnition * fuelIgnitionCompat
      + heatTolerance * fw.stabilityHeat
      + traits.intelligence * fw.stabilityIntelligence
      - fuelType.internalDanger * 15,
      0, 100
    );

    // Blowback risk
    const blowbackRisk = clamp(
      traits.fuelGlandSize * fuelType.internalDanger * fw.blowbackFuel
      + ignitionMethod.blowbackMod * 15
      - heatTolerance * fw.blowbackHeatReduction
      - traits.scaleThickness * fw.blowbackScaleReduction
      - (fuelIgnitionCompat - 1.0) * 20, // good compat reduces blowback
      0, 100
    );

    // Fuel efficiency
    const fuelEfficiency = clamp(
      100 - fuelType.energyCost * 5 - fuelType.storageBurden * 3
      + traits.stomachCapacity * 2
      - ignitionMethod.energyUsage * 2,
      0, 100
    );

    // Delivery effectiveness
    const deliveryPower = clamp(fireOutput * deliveryType.precision * 0.01 * fuelDeliveryCompat, 0, 100);
    const deliveryRange = deliveryType.range;

    // Detect failure modes
    const failureModes = [];
    if (baseIgnition < 20) failureModes.push({ id: 'misfire', label: 'Misfire Risk', description: 'Ignition system too weak to reliably ignite fuel.' });
    if (blowbackRisk > 70 && fuelIgnitionCompat < 0.9) failureModes.push({ id: 'backfire', label: 'Backfire Danger', description: 'Incompatible fuel-ignition combination causes reverse combustion.' });
    if (stability < 30 && fireOutput > 50) failureModes.push({ id: 'unstable_combustion', label: 'Unstable Combustion', description: 'High output with poor stability creates erratic, uncontrollable flame.' });
    if (traits.fuelGlandSize > 8 && deliveryType.id === 'stream' && heatTolerance < 40) failureModes.push({ id: 'pressure_overload', label: 'Pressure Overload', description: 'Sustained delivery of large fuel volume overwhelms heat management.' });
    if (fuelType.id === 'acid' && heatTolerance < 50) failureModes.push({ id: 'corrosive_damage', label: 'Corrosive Self-Damage', description: 'Acidic fuel damages internal tissues due to insufficient protection.' });
    if (fuelType.viscosity === 'liquid' && deliveryType.id === 'scatter') failureModes.push({ id: 'poor_atomization', label: 'Poor Atomization', description: 'Liquid fuel cannot scatter effectively — uneven, sputtering output.' });
    if (traits.ignitionEfficiency < 3 && fuelType.ignitionDifficulty > 0.6) failureModes.push({ id: 'weak_ignition', label: 'Weak Ignition', description: 'This fuel is too difficult to ignite with the current organ efficiency.' });
    if (heatTolerance < 30 && fireOutput > 60) failureModes.push({ id: 'overheat', label: 'Overheat After Use', description: 'Repeated fire use will cause dangerous internal temperature buildup.' });

    // Fire classification
    let fireClass;
    if (fireOutput < 15) fireClass = 'Cannot Ignite';
    else if (fireOutput < 30) fireClass = 'Weak Flare';
    else if (stability > 60 && blowbackRisk < 30) fireClass = 'Stable Fire Breath';
    else if (fireOutput > 70 && blowbackRisk > 50) fireClass = 'Volatile Fire';
    else if (fireOutput > 50) fireClass = 'Functional Burst';
    else fireClass = 'Weak Flare';

    if (blowbackRisk > 75) fireClass = 'Catastrophic Blowback Risk';

    return {
      fuelType, ignitionMethod, deliveryType,
      fuelIgnitionCompat, fuelDeliveryCompat, overallCompat,
      baseFuel, baseIgnition, heatTolerance,
      fireOutput: clamp(fireOutput, 0, 100),
      stability: clamp(stability, 0, 100),
      blowbackRisk: clamp(blowbackRisk, 0, 100),
      fuelEfficiency: clamp(fuelEfficiency, 0, 100),
      deliveryPower: clamp(deliveryPower, 0, 100),
      deliveryRange,
      failureModes,
      fireClass
    };
  }

  // --------------------------------------------------------
  // ENERGY SYSTEM
  // --------------------------------------------------------
  function evaluateEnergy(traits, flightResults, fireResults) {
    const e = W.energy;
    const baseCost = traits.metabolism * e.basalMetabolism + traits.bodyMass * e.basalMass + traits.musclePower * e.basalMuscle;
    const flightCost = Math.max(0, (100 - flightResults.sustained) * e.flightSustainedOffset + traits.metabolism * e.flightMetabolism);
    const fireCost = fireResults.fireOutput * e.fireOutputCost + traits.fuelGlandSize * e.fireFuelCost;
    const totalStrain = clamp((baseCost + flightCost * e.strainFlightMult + fireCost * e.strainFireMult) / e.strainDivisor, 0, 100);
    const sustainability = clamp(100 - totalStrain + traits.stomachCapacity * e.sustainStomach, 0, 100);

    // Energy classification
    let energyClass;
    if (sustainability >= 80) energyClass = 'Sustainable';
    else if (sustainability >= 60) energyClass = 'Demanding but Plausible';
    else if (sustainability >= 40) energyClass = 'Extreme Food Demands';
    else if (sustainability >= 20) energyClass = 'Nearly Impossible';
    else energyClass = 'Biologically Impossible';

    return {
      baseCost: clamp(baseCost, 0, 100),
      flightCost: clamp(flightCost, 0, 100),
      fireCost: clamp(fireCost, 0, 100),
      totalStrain: clamp(totalStrain, 0, 100),
      sustainability: clamp(sustainability, 0, 100),
      energyClass
    };
  }

  // --------------------------------------------------------
  // DURABILITY SYSTEM
  // --------------------------------------------------------
  function evaluateDurability(traits) {
    const d = W.durability;
    const total = clamp(
      traits.boneDensity * d.boneDensity
      + traits.scaleThickness * d.scaleThickness
      + traits.bodyMass * d.bodyMass
      + traits.musclePower * d.musclePower,
      0, 100
    );

    let durabilityClass;
    if (total >= 80) durabilityClass = 'Tank-Like';
    else if (total >= 60) durabilityClass = 'Durable';
    else if (total >= 40) durabilityClass = 'Balanced';
    else if (total >= 25) durabilityClass = 'Lightly Built';
    else durabilityClass = 'Fragile';

    return { total, durabilityClass };
  }

  // --------------------------------------------------------
  // SURVIVAL / INTELLIGENCE SYSTEM
  // --------------------------------------------------------
  function evaluateSurvival(traits, flightResults, fireResults, energyResults, durabilityResults) {
    const s = W.survival;
    const mobility = (flightResults.sustained * 0.3 + flightResults.maneuverability * 0.3 + flightResults.takeoff * 0.2 + flightResults.glide * 0.2);
    const hunting = clamp(traits.intelligence * 3 + mobility * 0.3 + fireResults.fireOutput * 0.2, 0, 100);
    const rating = clamp(
      traits.intelligence * s.intelligence * 10
      + mobility * s.mobility * 4
      + durabilityResults.total * s.durability * 4
      + energyResults.sustainability * s.sustainability * 4
      + hunting * s.hunting * 4,
      0, 100
    );

    let survivalClass;
    if (rating >= 80) survivalClass = 'Apex Survivor';
    else if (rating >= 60) survivalClass = 'Strong';
    else if (rating >= 40) survivalClass = 'Viable';
    else if (rating >= 25) survivalClass = 'Struggling';
    else survivalClass = 'Critical';

    return { mobility, hunting, rating, survivalClass };
  }

  // --------------------------------------------------------
  // HABITAT TESTING
  // --------------------------------------------------------
  function evaluateHabitat(traits, fireDesign, habitatKey) {
    const habitat = DATA.HABITATS[habitatKey];
    if (!habitat) return null;

    // Run base simulation
    const base = evaluateAll(traits, fireDesign);
    const mods = habitat.modifiers;

    // Apply modifiers
    const modified = {
      flight: {
        ...base.flight,
        glide: clamp(base.flight.glide * (mods.flight_glide || 1), 0, 100),
        maneuverability: clamp(base.flight.maneuverability * (mods.flight_maneuverability || 1), 0, 100),
        sustained: clamp(base.flight.sustained * (mods.flight_sustained || 1), 0, 100)
      },
      fire: {
        ...base.fire,
        fireOutput: clamp(base.fire.fireOutput * (mods.fire_output || 1), 0, 100)
      },
      energy: {
        ...base.energy,
        sustainability: clamp(base.energy.sustainability * (mods.energy_sustainability || 1), 0, 100)
      },
      durability: {
        ...base.durability,
        total: clamp(base.durability.total * (mods.durability_total || 1), 0, 100)
      },
      survival: {
        ...base.survival,
        rating: clamp(base.survival.rating * (mods.survival_rating || 1), 0, 100)
      }
    };

    // Special habitat checks
    if (mods.bodyMassPenalty && traits.bodyMass > 7) {
      modified.flight.sustained *= mods.bodyMassPenalty;
      modified.flight.maneuverability *= mods.bodyMassPenalty;
    }
    if (mods.insulationBonus && traits.insulation >= 6) {
      modified.survival.rating = clamp(modified.survival.rating * mods.insulationBonus, 0, 100);
    }
    if (mods.lowInsulationPenalty && traits.insulation < 4) {
      modified.survival.rating = clamp(modified.survival.rating * mods.lowInsulationPenalty, 0, 100);
      modified.energy.sustainability = clamp(modified.energy.sustainability * 0.8, 0, 100);
    }
    if (mods.heatToleranceBonus && base.fire.heatTolerance > 50) {
      modified.survival.rating = clamp(modified.survival.rating * 1.2, 0, 100);
    }
    if (mods.lowHeatPenalty && base.fire.heatTolerance < 30) {
      modified.survival.rating = clamp(modified.survival.rating * mods.lowHeatPenalty, 0, 100);
    }
    if (mods.intelligenceBonus && traits.intelligence >= 6) {
      modified.survival.rating = clamp(modified.survival.rating * mods.intelligenceBonus, 0, 100);
    }
    if (mods.wingspanPenalty && traits.wingspan > 7) {
      modified.flight.sustained = clamp(modified.flight.sustained * mods.wingspanPenalty, 0, 100);
      modified.flight.maneuverability = clamp(modified.flight.maneuverability * 0.8, 0, 100);
    }

    // Habitat viability score
    const viability = clamp(
      (modified.flight.overall || modified.flight.sustained * 0.5 + modified.flight.glide * 0.3 + modified.flight.maneuverability * 0.2) * 0.25
      + modified.fire.fireOutput * 0.15
      + modified.energy.sustainability * 0.25
      + modified.durability.total * 0.15
      + modified.survival.rating * 0.2,
      0, 100
    );

    return {
      habitatKey, habitat,
      base, modified, viability,
      deltas: {
        flight_sustained: modified.flight.sustained - base.flight.sustained,
        flight_glide: modified.flight.glide - base.flight.glide,
        flight_maneuverability: modified.flight.maneuverability - base.flight.maneuverability,
        fire_output: modified.fire.fireOutput - base.fire.fireOutput,
        energy_sustainability: modified.energy.sustainability - base.energy.sustainability,
        durability_total: modified.durability.total - base.durability.total,
        survival_rating: modified.survival.rating - base.survival.rating
      }
    };
  }

  // --------------------------------------------------------
  // CLASSIFICATION
  // --------------------------------------------------------
  function classify(results) {
    for (const rule of DATA.CLASSIFICATION_RULES) {
      const conds = rule.conditions;
      let match = true;
      for (const key of Object.keys(conds)) {
        const val = resolveResultPath(results, key);
        if (val === null) { match = false; break; }
        if (conds[key].min !== undefined && val < conds[key].min) { match = false; break; }
        if (conds[key].max !== undefined && val > conds[key].max) { match = false; break; }
      }
      if (match) return rule;
    }
    // Fallback
    return DATA.CLASSIFICATION_RULES[DATA.CLASSIFICATION_RULES.length - 1];
  }

  // Resolve dot-separated result path like "flight_sustained" to actual value
  function resolveResultPath(results, path) {
    const parts = path.split('_');
    if (parts.length === 2) {
      const section = results[parts[0]];
      if (section && section[parts[1]] !== undefined) return section[parts[1]];
    }
    // Try direct top-level
    if (results[path] !== undefined) return results[path];
    return null;
  }

  // --------------------------------------------------------
  // BATTLE STATS DERIVATION
  // --------------------------------------------------------
  function deriveBattleStats(traits, results) {
    const mobility = clamp(
      results.flight.maneuverability * 0.4 + results.flight.sustained * 0.3 + (10 - traits.bodyMass) * 3, 0, 100);
    const burstSpeed = clamp(
      traits.musclePower * 4 + (10 - traits.bodyMass) * 3 + traits.tailSize * 1, 0, 100);
    const attackPower = clamp(
      traits.musclePower * 3 + traits.bodyMass * 2 + traits.boneDensity * 2 + traits.neckLength * 1, 0, 100);
    const fireAttack = clamp(
      results.fire.fireOutput * 0.5 + results.fire.stability * 0.2 + results.fire.deliveryPower * 0.3, 0, 100);
    const fireReliability = clamp(results.fire.stability * 0.6 + results.fire.fuelIgnitionCompat * 20, 0, 100);
    const stamina = clamp(
      results.energy.sustainability * 0.5 + traits.stomachCapacity * 2 + (10 - traits.metabolism) * 2, 0, 100);
    const resilience = clamp(
      results.durability.total * 0.6 + results.fire.heatTolerance * 0.2 + traits.bodyMass * 2, 0, 100);
    const tacticalEfficiency = clamp(
      traits.intelligence * 5 + results.flight.maneuverability * 0.2 + results.fire.stability * 0.1, 0, 100);

    // Fire-specific battle stats
    const fireRange = results.fire.deliveryRange || 4;
    const fireCooldown = (results.fire.deliveryType ? results.fire.deliveryType.cooldown : 2) || 2;
    const fireStaminaCost = (results.fire.deliveryType ? results.fire.deliveryType.staminaCost : 15) || 15;

    return {
      mobility, burstSpeed, attackPower, fireAttack, fireReliability,
      stamina, resilience, tacticalEfficiency,
      fireRange, fireCooldown, fireStaminaCost
    };
  }

  // --------------------------------------------------------
  // LAB REPORT GENERATION
  // --------------------------------------------------------
  function generateLabReport(dragon, results) {
    const classification = results.classification;

    // Find strongest and weakest
    const systems = [
      { name: 'Flight', score: results.flight.overall, key: 'flight' },
      { name: 'Fire Output', score: results.fire.fireOutput, key: 'fire' },
      { name: 'Energy Sustainability', score: results.energy.sustainability, key: 'energy' },
      { name: 'Durability', score: results.durability.total, key: 'durability' },
      { name: 'Survival', score: results.survival.rating, key: 'survival' }
    ];

    systems.sort((a, b) => b.score - a.score);
    const strongest = systems[0];
    const weakest = systems[systems.length - 1];

    // Generate scientific reason
    let reason = '';
    if (weakest.key === 'energy') {
      reason = `This dragon's metabolic demands (metabolism ${dragon.traits.metabolism}, mass ${dragon.traits.bodyMass}) exceed what its stomach capacity (${dragon.traits.stomachCapacity}) can sustain. The energy budget is the critical bottleneck.`;
    } else if (weakest.key === 'flight') {
      reason = `With a body mass of ${dragon.traits.bodyMass} and wing area of only ${dragon.traits.wingArea}, the lift-to-weight ratio is insufficient for reliable flight. The effective load exceeds what the wings can support.`;
    } else if (weakest.key === 'fire') {
      reason = `The fire system underperforms due to ${results.fire.failureModes.length > 0 ? results.fire.failureModes[0].description.toLowerCase() : 'limited fuel gland capacity and ignition reliability'}.`;
    } else if (weakest.key === 'durability') {
      reason = `Low bone density (${dragon.traits.boneDensity}) and thin scales (${dragon.traits.scaleThickness}) leave this dragon structurally vulnerable. A single serious impact could cause catastrophic failure.`;
    } else {
      reason = `The survival system is limited by the combination of ${weakest.name.toLowerCase()} deficiency and the overall design's inability to compensate through other strengths.`;
    }

    // Generate improvement suggestion
    let suggestion = '';
    if (weakest.key === 'energy') {
      suggestion = 'Increase stomach capacity or reduce metabolic demands by lowering metabolism, body mass, or muscle power.';
    } else if (weakest.key === 'flight') {
      suggestion = 'Increase wing area and wingspan, or reduce body mass and bone density to improve the lift ratio.';
    } else if (weakest.key === 'fire') {
      suggestion = 'Check fuel-ignition compatibility, increase fuel gland size or ignition efficiency, and ensure adequate heat tolerance.';
    } else if (weakest.key === 'durability') {
      suggestion = 'Increase bone density and scale thickness for better structural integrity, accepting the weight penalty.';
    } else {
      suggestion = 'Increase intelligence for better hunting efficiency, or improve mobility and energy sustainability.';
    }

    return {
      classification: classification.name,
      badge: classification.badge,
      strongestFeature: strongest.name,
      strongestScore: Math.round(strongest.score),
      biggestWeakness: weakest.name,
      weakestScore: Math.round(weakest.score),
      scientificReason: reason,
      suggestedImprovement: suggestion,
      fireWarnings: results.fire.failureModes.map(f => f.label)
    };
  }

  // --------------------------------------------------------
  // FULL EVALUATION
  // --------------------------------------------------------
  function evaluateAll(traits, fireDesign) {
    const flight = evaluateFlight(traits);
    const fire = evaluateFire(traits, fireDesign);
    const energy = evaluateEnergy(traits, flight, fire);
    const durability = evaluateDurability(traits);
    const survival = evaluateSurvival(traits, flight, fire, energy, durability);
    return { flight, fire, energy, durability, survival };
  }

  function evaluate(dragon) {
    const results = evaluateAll(dragon.traits, dragon.fireDesign);
    results.classification = classify(results);
    results.battleStats = deriveBattleStats(dragon.traits, results);
    results.labReport = generateLabReport(dragon, results);
    return results;
  }

  return {
    evaluate, evaluateAll, evaluateFlight, evaluateFire, evaluateEnergy,
    evaluateDurability, evaluateSurvival, evaluateHabitat,
    classify, deriveBattleStats, generateLabReport
  };
})();

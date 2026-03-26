// ============================================================
// Dragon Engineering Lab — Central Configuration
// All tuning constants, trait configs, fire system data,
// presets, enemies, habitats, battle config, and educational content.
// Edit values here to rebalance the entire game.
// ============================================================

window.DragonData = {

  // --------------------------------------------------------
  // 14 PLAYER-ADJUSTABLE TRAITS
  // --------------------------------------------------------
  TRAITS: [
    {
      id: 'bodyMass', label: 'Body Mass', min: 1, max: 10, default: 5,
      unit: 'tons', group: 'physical',
      description: 'Overall body weight and bulk — improves durability and impact but hurts flight and increases energy costs.',
      descriptors: [
        { max: 2, label: 'Lightweight' }, { max: 4, label: 'Light' },
        { max: 6, label: 'Medium' }, { max: 8, label: 'Heavy' }, { max: 10, label: 'Massive' }
      ]
    },
    {
      id: 'wingspan', label: 'Wingspan', min: 1, max: 10, default: 5,
      unit: 'm equiv', group: 'flight',
      description: 'Wing tip-to-tip span — wider wings improve glide and stability but can reduce agility in tight spaces.',
      descriptors: [
        { max: 2, label: 'Vestigial' }, { max: 4, label: 'Short' },
        { max: 6, label: 'Medium' }, { max: 8, label: 'Broad' }, { max: 10, label: 'Enormous' }
      ]
    },
    {
      id: 'wingArea', label: 'Wing Area', min: 1, max: 10, default: 5,
      unit: 'm² equiv', group: 'flight',
      description: 'Total wing surface area — the primary driver of lift, but larger membranes add drag and structural demands.',
      descriptors: [
        { max: 2, label: 'Minimal' }, { max: 4, label: 'Small' },
        { max: 6, label: 'Moderate' }, { max: 8, label: 'Large' }, { max: 10, label: 'Vast' }
      ]
    },
    {
      id: 'musclePower', label: 'Muscle Power', min: 1, max: 10, default: 5,
      unit: 'rating', group: 'physical',
      description: 'Raw muscular strength — powers takeoff, sustained flight, and physical attacks but increases caloric demands.',
      descriptors: [
        { max: 2, label: 'Atrophied' }, { max: 4, label: 'Lean' },
        { max: 6, label: 'Athletic' }, { max: 8, label: 'Powerful' }, { max: 10, label: 'Herculean' }
      ]
    },
    {
      id: 'boneDensity', label: 'Bone Density', min: 1, max: 10, default: 5,
      unit: 'rating', group: 'structure',
      description: 'Skeletal mass and rigidity — stronger bones resist damage but add significant weight.',
      descriptors: [
        { max: 2, label: 'Hollow' }, { max: 4, label: 'Light' },
        { max: 6, label: 'Standard' }, { max: 8, label: 'Dense' }, { max: 10, label: 'Fortified' }
      ]
    },
    {
      id: 'metabolism', label: 'Metabolism', min: 1, max: 10, default: 5,
      unit: 'rate', group: 'energy',
      description: 'Metabolic turnover speed — higher metabolism supports intense activity and fire production but demands more food.',
      descriptors: [
        { max: 2, label: 'Torpid' }, { max: 4, label: 'Slow' },
        { max: 6, label: 'Normal' }, { max: 8, label: 'Fast' }, { max: 10, label: 'Hyperdrive' }
      ]
    },
    {
      id: 'stomachCapacity', label: 'Stomach Capacity', min: 1, max: 10, default: 5,
      unit: 'volume', group: 'energy',
      description: 'Digestive volume and nutrient absorption — larger capacity sustains high-demand builds but adds bulk.',
      descriptors: [
        { max: 2, label: 'Tiny' }, { max: 4, label: 'Small' },
        { max: 6, label: 'Average' }, { max: 8, label: 'Large' }, { max: 10, label: 'Cavernous' }
      ]
    },
    {
      id: 'insulation', label: 'Insulation', min: 1, max: 10, default: 4,
      unit: 'rating', group: 'survival',
      description: 'Thermal insulation layer — essential for cold habitats, can also buffer internal heat from fire organs.',
      descriptors: [
        { max: 2, label: 'None' }, { max: 4, label: 'Thin' },
        { max: 6, label: 'Moderate' }, { max: 8, label: 'Thick' }, { max: 10, label: 'Arctic-Grade' }
      ]
    },
    {
      id: 'intelligence', label: 'Intelligence', min: 1, max: 10, default: 5,
      unit: 'neural index', group: 'survival',
      description: 'Neural complexity — improves hunting, fire control precision, and tactical combat decisions, but cannot override bad anatomy.',
      descriptors: [
        { max: 2, label: 'Primitive' }, { max: 4, label: 'Basic' },
        { max: 6, label: 'Cunning' }, { max: 8, label: 'Sharp' }, { max: 10, label: 'Genius' }
      ]
    },
    {
      id: 'fuelGlandSize', label: 'Fuel Gland Size', min: 0, max: 10, default: 3,
      unit: 'volume', group: 'fire',
      description: 'Internal fuel reservoir — larger glands produce more fire potential but increase internal hazard and energy burden.',
      descriptors: [
        { max: 1, label: 'Absent' }, { max: 3, label: 'Small' },
        { max: 5, label: 'Medium' }, { max: 7, label: 'Large' }, { max: 10, label: 'Massive' }
      ]
    },
    {
      id: 'ignitionEfficiency', label: 'Ignition Efficiency', min: 0, max: 10, default: 5,
      unit: 'rating', group: 'fire',
      description: 'Ignition organ reliability — higher efficiency means consistent ignition, but depends on compatibility with fuel type.',
      descriptors: [
        { max: 1, label: 'Nonfunctional' }, { max: 3, label: 'Unreliable' },
        { max: 5, label: 'Functional' }, { max: 7, label: 'Reliable' }, { max: 10, label: 'Precision' }
      ]
    },
    {
      id: 'scaleThickness', label: 'Scale Thickness', min: 1, max: 10, default: 4,
      unit: 'mm equiv', group: 'structure',
      description: 'Armor plating density — protects from damage and internal heat but adds significant weight.',
      descriptors: [
        { max: 2, label: 'Paper-thin' }, { max: 4, label: 'Light' },
        { max: 6, label: 'Plated' }, { max: 8, label: 'Armored' }, { max: 10, label: 'Fortress' }
      ]
    },
    {
      id: 'tailSize', label: 'Tail Size', min: 1, max: 10, default: 5,
      unit: 'length', group: 'physical',
      description: 'Tail length and mass — improves balance, maneuverability, and combat stability but adds weight.',
      descriptors: [
        { max: 2, label: 'Stub' }, { max: 4, label: 'Short' },
        { max: 6, label: 'Medium' }, { max: 8, label: 'Long' }, { max: 10, label: 'Massive' }
      ]
    },
    {
      id: 'neckLength', label: 'Neck Length', min: 1, max: 10, default: 5,
      unit: 'length', group: 'physical',
      description: 'Cervical length — extends strike range and fire projection but adds structural instability at extremes.',
      descriptors: [
        { max: 2, label: 'Compact' }, { max: 4, label: 'Short' },
        { max: 6, label: 'Medium' }, { max: 8, label: 'Long' }, { max: 10, label: 'Serpentine' }
      ]
    }
  ],

  // --------------------------------------------------------
  // FORMULA WEIGHTS — all tuning multipliers by system
  // --------------------------------------------------------
  FORMULA_WEIGHTS: {
    flight: {
      liftWingArea: 8,       liftWingspan: 5,       liftMuscle: 3,
      loadMass: 10,          loadBones: 3,           loadScales: 4,
      loadTail: 2,           loadNeck: 1,
      takeoffLiftMult: 0.7,  takeoffMuscleMult: 3,
      sustainedLiftMult: 0.5, sustainedMetabolism: 2, sustainedMassReduction: 1.5,
      glideWingspan: 6,      glideArea: 4,           glideMassPenalty: 2,
      maneuverTail: 4,       maneuverMassReduction: 3, maneuverIntelligence: 2
    },
    fire: {
      fuelGlandMult: 8,      fuelMetabolism: 2,
      ignitionMult: 7,       ignitionIntelligence: 2,
      heatScales: 5,         heatInsulation: 2,      heatBones: 1,
      outputFuel: 0.4,       outputIgnition: 0.3,    outputMetabolism: 3,
      stabilityIgnition: 0.5, stabilityHeat: 0.3,    stabilityIntelligence: 2,
      blowbackFuel: 6,       blowbackHeatReduction: 0.5, blowbackScaleReduction: 2
    },
    energy: {
      basalMetabolism: 5,    basalMass: 3,           basalMuscle: 2,
      flightSustainedOffset: 0.5, flightMetabolism: 2,
      fireOutputCost: 0.3,   fireFuelCost: 2,
      strainFlightMult: 0.3, strainFireMult: 0.3,    strainDivisor: 2,
      sustainStomach: 3
    },
    durability: {
      boneDensity: 4, scaleThickness: 3, bodyMass: 2, musclePower: 1
    },
    survival: {
      intelligence: 2, mobility: 0.25, durability: 0.2, sustainability: 0.15, hunting: 0.15
    }
  },

  // --------------------------------------------------------
  // ADVANCED FIRE SYSTEM — Fuel, Ignition, Delivery
  // --------------------------------------------------------
  FIRE_FUELS: [
    {
      id: 'methane', label: 'Methane Gas',
      description: 'Lightweight flammable gas — easy to ignite, moderate power, low storage burden.',
      powerMult: 1.0, ignitionDifficulty: 0.3, internalDanger: 0.4,
      energyCost: 3, storageBurden: 2, viscosity: 'gas',
      icon: '🔵'
    },
    {
      id: 'hydrogen', label: 'Hydrogen-Rich Gas',
      description: 'Extremely volatile — highest power output but dangerous to store and ignite safely.',
      powerMult: 1.5, ignitionDifficulty: 0.2, internalDanger: 0.9,
      energyCost: 4, storageBurden: 3, viscosity: 'gas',
      icon: '⚡'
    },
    {
      id: 'oil', label: 'Oily Liquid Fuel',
      description: 'Dense petrochemical — sustained burn, high energy content, but harder to atomize.',
      powerMult: 1.2, ignitionDifficulty: 0.6, internalDanger: 0.5,
      energyCost: 5, storageBurden: 5, viscosity: 'liquid',
      icon: '🟤'
    },
    {
      id: 'acid', label: 'Acidic Aerosol',
      description: 'Corrosive mist — less explosive but effective against armor. Risk of self-damage if heat tolerance is low.',
      powerMult: 0.8, ignitionDifficulty: 0.7, internalDanger: 0.6,
      energyCost: 4, storageBurden: 4, viscosity: 'liquid',
      icon: '🟢'
    },
    {
      id: 'steam', label: 'Superheated Steam',
      description: 'Pressurized thermal blast — no combustion needed, but requires extreme internal heat generation.',
      powerMult: 0.7, ignitionDifficulty: 0.9, internalDanger: 0.3,
      energyCost: 6, storageBurden: 3, viscosity: 'gas',
      icon: '🌫️'
    },
    {
      id: 'particulate', label: 'Particulate Cloud',
      description: 'Metallic dust explosion — devastating area effect but extremely hard to control.',
      powerMult: 1.4, ignitionDifficulty: 0.8, internalDanger: 0.7,
      energyCost: 5, storageBurden: 6, viscosity: 'solid',
      icon: '🔸'
    }
  ],

  FIRE_IGNITIONS: [
    {
      id: 'spark', label: 'Spark Organ',
      description: 'Piezoelectric crystals generate sparks — fast, reliable with gases, poor with dense fuels.',
      reliabilityMult: 1.2, energyUsage: 2, startupSpeed: 9,
      blowbackMod: 0.3, controlPrecision: 0.7
    },
    {
      id: 'friction', label: 'Friction Plates',
      description: 'Grinding keratinous plates — reliable ignition for any fuel, but slow startup and high wear.',
      reliabilityMult: 1.0, energyUsage: 3, startupSpeed: 4,
      blowbackMod: 0.2, controlPrecision: 0.5
    },
    {
      id: 'catalytic', label: 'Catalytic Enzyme',
      description: 'Enzymatic catalyst chamber — excellent with liquid fuels, very safe, but limited by metabolic production rate.',
      reliabilityMult: 1.1, energyUsage: 4, startupSpeed: 6,
      blowbackMod: 0.1, controlPrecision: 0.8
    },
    {
      id: 'heatedTooth', label: 'Heated Tooth Chamber',
      description: 'Superheated dental plates — great for oil-based fuels, moderate speed, generates residual heat.',
      reliabilityMult: 0.9, energyUsage: 5, startupSpeed: 5,
      blowbackMod: 0.4, controlPrecision: 0.6
    },
    {
      id: 'electricArc', label: 'Electric Arc Organ',
      description: 'Bioelectric discharge — instant ignition, excellent control, but high energy cost and nervous system strain.',
      reliabilityMult: 1.3, energyUsage: 7, startupSpeed: 10,
      blowbackMod: 0.2, controlPrecision: 0.9
    },
    {
      id: 'compression', label: 'Compression Sac',
      description: 'Pressurized ignition chamber — works well with gases and particulates, but explosion risk with volatile fuels.',
      reliabilityMult: 0.8, energyUsage: 3, startupSpeed: 3,
      blowbackMod: 0.7, controlPrecision: 0.4
    }
  ],

  FIRE_DELIVERIES: [
    {
      id: 'burst', label: 'Short Burst',
      description: 'Quick controlled pulse — low cost, fast cooldown, limited damage.',
      range: 4, spread: 2, precision: 8, staminaCost: 8,
      cooldown: 1, areaControl: 1, role: 'skirmish'
    },
    {
      id: 'stream', label: 'Sustained Stream',
      description: 'Continuous pressurized flame — high damage over time, but exhausting and overheats the dragon.',
      range: 6, spread: 3, precision: 7, staminaCost: 20,
      cooldown: 3, areaControl: 4, role: 'siege'
    },
    {
      id: 'cone', label: 'Cone Blast',
      description: 'Wide fan of flame — excellent area denial, but low precision and high fuel consumption.',
      range: 3, spread: 8, precision: 3, staminaCost: 15,
      cooldown: 2, areaControl: 8, role: 'area'
    },
    {
      id: 'jet', label: 'Focused Jet',
      description: 'Narrow high-pressure stream — maximum range and piercing power, but requires precise aim.',
      range: 9, spread: 1, precision: 9, staminaCost: 14,
      cooldown: 2, areaControl: 1, role: 'sniper'
    },
    {
      id: 'glob', label: 'Explosive Glob',
      description: 'Launched incendiary projectile — devastating on impact, but slow and easy to dodge.',
      range: 7, spread: 4, precision: 4, staminaCost: 18,
      cooldown: 3, areaControl: 5, role: 'artillery'
    },
    {
      id: 'cloud', label: 'Lingering Cloud',
      description: 'Dispersed vapor that ignites on delay — area denial over time, but wind and terrain can disperse it.',
      range: 5, spread: 7, precision: 2, staminaCost: 16,
      cooldown: 4, areaControl: 9, role: 'control'
    },
    {
      id: 'scatter', label: 'Scatter Spray',
      description: 'Shotgun-style burst of burning fragments — effective at close range, unpredictable at distance.',
      range: 3, spread: 9, precision: 2, staminaCost: 12,
      cooldown: 1, areaControl: 6, role: 'brawl'
    }
  ],

  // Fuel × Ignition compatibility matrix (0.5 = terrible, 1.0 = neutral, 1.5 = excellent)
  FIRE_COMPATIBILITY: {
    //              spark  friction catalytic heatedTooth electricArc compression
    methane:      { spark: 1.4, friction: 0.9, catalytic: 0.8, heatedTooth: 1.0, electricArc: 1.3, compression: 1.2 },
    hydrogen:     { spark: 1.3, friction: 0.7, catalytic: 0.6, heatedTooth: 0.8, electricArc: 1.5, compression: 0.5 },
    oil:          { spark: 0.7, friction: 1.0, catalytic: 1.4, heatedTooth: 1.3, electricArc: 0.9, compression: 0.6 },
    acid:         { spark: 0.6, friction: 0.8, catalytic: 1.5, heatedTooth: 1.1, electricArc: 0.7, compression: 0.8 },
    steam:        { spark: 0.5, friction: 0.6, catalytic: 0.7, heatedTooth: 1.4, electricArc: 1.2, compression: 1.3 },
    particulate:  { spark: 1.1, friction: 1.2, catalytic: 0.6, heatedTooth: 0.9, electricArc: 1.0, compression: 1.4 }
  },

  // Fuel × Delivery compatibility (some fuels can't do certain deliveries well)
  FIRE_DELIVERY_COMPAT: {
    //              burst stream cone  jet   glob  cloud scatter
    methane:      { burst:1.2, stream:1.1, cone:1.3, jet:0.8, glob:0.5, cloud:1.4, scatter:0.7 },
    hydrogen:     { burst:1.3, stream:1.0, cone:1.2, jet:1.1, glob:0.4, cloud:1.3, scatter:0.6 },
    oil:          { burst:0.9, stream:1.4, cone:0.8, jet:1.3, glob:1.5, cloud:0.5, scatter:0.7 },
    acid:         { burst:1.0, stream:1.2, cone:1.1, jet:1.0, glob:1.2, cloud:1.3, scatter:1.4 },
    steam:        { burst:1.1, stream:1.3, cone:1.4, jet:1.2, glob:0.4, cloud:1.5, scatter:0.6 },
    particulate:  { burst:0.8, stream:0.6, cone:1.3, jet:0.7, glob:1.1, cloud:1.4, scatter:1.5 }
  },

  // --------------------------------------------------------
  // HABITATS
  // --------------------------------------------------------
  HABITATS: {
    mountains: {
      label: 'Mountain Range',
      description: 'Jagged peaks and thin air reward efficient gliders and agile flyers.',
      color: '#4a6741',
      modifiers: {
        flight_glide: 1.3, flight_maneuverability: 1.2, flight_sustained: 1.1,
        energy_sustainability: 0.9, durability_total: 0.95,
        survival_rating: 1.0, fire_output: 0.95,
        bodyMassPenalty: 0.85
      }
    },
    tundra: {
      label: 'Frozen Tundra',
      description: 'Extreme cold rewards insulated, energy-efficient designs and punishes poor thermal regulation.',
      color: '#6a8fa7',
      modifiers: {
        flight_glide: 1.0, flight_maneuverability: 0.95, flight_sustained: 0.9,
        energy_sustainability: 1.2, durability_total: 1.1,
        survival_rating: 1.1, fire_output: 0.8,
        insulationBonus: 1.3, lowInsulationPenalty: 0.6
      }
    },
    volcanic: {
      label: 'Volcanic Region',
      description: 'Intense heat amplifies fire systems but punishes dragons with poor thermal tolerance.',
      color: '#8b3a2a',
      modifiers: {
        flight_glide: 0.95, flight_maneuverability: 1.0, flight_sustained: 0.9,
        energy_sustainability: 0.9, durability_total: 1.05,
        survival_rating: 0.95, fire_output: 1.3,
        heatToleranceBonus: 1.4, lowHeatPenalty: 0.5
      }
    },
    forest: {
      label: 'Dense Forest',
      description: 'Tight canopy rewards agile, moderate-sized hunters and punishes oversized wings.',
      color: '#2d5a27',
      modifiers: {
        flight_glide: 0.7, flight_maneuverability: 1.3, flight_sustained: 0.8,
        energy_sustainability: 1.1, durability_total: 1.0,
        survival_rating: 1.1, fire_output: 0.85,
        intelligenceBonus: 1.2, wingspanPenalty: 0.7
      }
    },
    plains: {
      label: 'Open Plains',
      description: 'Wide open terrain rewards endurance, pursuit hunting, and sustained mobility.',
      color: '#7a6b3a',
      modifiers: {
        flight_glide: 1.05, flight_maneuverability: 1.0, flight_sustained: 1.1,
        energy_sustainability: 1.1, durability_total: 1.0,
        survival_rating: 1.05, fire_output: 1.0,
        huntingBonus: 1.2, mobilityBonus: 1.2
      }
    }
  },

  // --------------------------------------------------------
  // CLASSIFICATION RULES — checked in order, first match wins
  // --------------------------------------------------------
  CLASSIFICATION_RULES: [
    {
      name: 'Apex Dragon', badge: 'apex',
      description: 'A near-perfect design that excels across all major systems.',
      conditions: { survival_rating: { min: 80 }, flight_sustained: { min: 65 }, fire_output: { min: 55 }, energy_sustainability: { min: 60 } }
    },
    {
      name: 'Sky Striker', badge: 'excellent',
      description: 'A dominant aerial combatant built for speed and maneuverability.',
      conditions: { flight_sustained: { min: 75 }, flight_maneuverability: { min: 70 } }
    },
    {
      name: 'Fire Wyrm', badge: 'excellent',
      description: 'A devastating fire-focused build with stable offensive output.',
      conditions: { fire_output: { min: 80 }, fire_stability: { min: 55 } }
    },
    {
      name: 'Efficient Predator', badge: 'good',
      description: 'A well-balanced hunter with sustainable energy and effective hunting capability.',
      conditions: { energy_sustainability: { min: 75 }, survival_hunting: { min: 60 } }
    },
    {
      name: 'Endurance Hunter', badge: 'good',
      description: 'A patient design built for long-term survival and sustained operation.',
      conditions: { energy_sustainability: { min: 70 }, survival_rating: { min: 55 } }
    },
    {
      name: 'Grounded Tank', badge: 'warning',
      description: 'Extremely durable but earthbound — a fortress that trades sky for armor.',
      conditions: { flight_sustained: { max: 30 }, durability_total: { min: 75 } }
    },
    {
      name: 'Fragile Glider', badge: 'warning',
      description: 'Elegant in the air but structurally vulnerable — one hit away from failure.',
      conditions: { flight_glide: { min: 70 }, durability_total: { max: 40 } }
    },
    {
      name: 'Volatile Berserker', badge: 'danger',
      description: 'Devastating firepower but dangerously unstable — as much a threat to itself as to enemies.',
      conditions: { fire_output: { min: 65 }, fire_blowbackRisk: { min: 50 }, durability_total: { max: 50 } }
    },
    {
      name: 'Unstable Prototype', badge: 'warning',
      description: 'A design with potential but significant fire system instability that must be addressed.',
      conditions: { fire_blowbackRisk: { min: 55 } }
    },
    {
      name: 'Catastrophic Failure', badge: 'danger',
      description: 'This design cannot sustain itself biologically — a scientific dead end.',
      conditions: { energy_sustainability: { max: 20 } }
    },
    {
      name: 'Balanced Drake', badge: 'neutral',
      description: 'A functional but unremarkable design — jack of all trades, master of none.',
      conditions: {}
    }
  ],

  // --------------------------------------------------------
  // PRESET BUILDS
  // --------------------------------------------------------
  PRESETS: {
    balanced: {
      label: 'Balanced Prototype',
      description: 'A middle-of-the-road design for baseline comparison.',
      tintColor: '#4a7a6a',
      traits: {
        bodyMass: 5, wingspan: 5, wingArea: 5, musclePower: 5, boneDensity: 5,
        metabolism: 5, stomachCapacity: 5, insulation: 5, intelligence: 5,
        fuelGlandSize: 5, ignitionEfficiency: 5, scaleThickness: 5, tailSize: 5, neckLength: 5
      },
      fireDesign: { fuel: 'methane', ignition: 'spark', delivery: 'burst' }
    },
    aerial: {
      label: 'Aerial Specialist',
      description: 'Optimized for flight efficiency — light, wide-winged, and agile.',
      tintColor: '#5588cc',
      traits: {
        bodyMass: 2, wingspan: 9, wingArea: 8, musclePower: 7, boneDensity: 3,
        metabolism: 6, stomachCapacity: 4, insulation: 3, intelligence: 6,
        fuelGlandSize: 2, ignitionEfficiency: 3, scaleThickness: 2, tailSize: 7, neckLength: 4
      },
      fireDesign: { fuel: 'methane', ignition: 'spark', delivery: 'burst' }
    },
    tank: {
      label: 'Armored Tank',
      description: 'Maximum durability and ground dominance — flight is sacrificed for survival.',
      tintColor: '#7a7a7a',
      traits: {
        bodyMass: 9, wingspan: 3, wingArea: 3, musclePower: 7, boneDensity: 9,
        metabolism: 4, stomachCapacity: 7, insulation: 6, intelligence: 4,
        fuelGlandSize: 3, ignitionEfficiency: 4, scaleThickness: 9, tailSize: 6, neckLength: 3
      },
      fireDesign: { fuel: 'oil', ignition: 'heatedTooth', delivery: 'stream' }
    },
    inferno: {
      label: 'Volatile Inferno',
      description: 'Extreme fire output with dangerous instability — high risk, high reward.',
      tintColor: '#cc5533',
      traits: {
        bodyMass: 4, wingspan: 5, wingArea: 5, musclePower: 5, boneDensity: 4,
        metabolism: 8, stomachCapacity: 6, insulation: 3, intelligence: 5,
        fuelGlandSize: 9, ignitionEfficiency: 8, scaleThickness: 4, tailSize: 4, neckLength: 6
      },
      fireDesign: { fuel: 'hydrogen', ignition: 'electricArc', delivery: 'stream' }
    },
    hunter: {
      label: 'Endurance Hunter',
      description: 'Built for sustained operation — intelligent, efficient, and self-sufficient.',
      tintColor: '#55aa66',
      traits: {
        bodyMass: 4, wingspan: 7, wingArea: 7, musclePower: 5, boneDensity: 5,
        metabolism: 3, stomachCapacity: 8, insulation: 5, intelligence: 8,
        fuelGlandSize: 3, ignitionEfficiency: 4, scaleThickness: 4, tailSize: 6, neckLength: 5
      },
      fireDesign: { fuel: 'acid', ignition: 'catalytic', delivery: 'cloud' }
    }
  },

  // --------------------------------------------------------
  // ENEMY ARCHETYPES
  // --------------------------------------------------------
  ENEMY_ARCHETYPES: {
    agileDuelist: {
      label: 'Wind Dancer',
      description: 'Lightning-fast aerial combatant that strikes and retreats.',
      tintColor: '#4488dd',
      traits: {
        bodyMass: 2, wingspan: 8, wingArea: 7, musclePower: 7, boneDensity: 3,
        metabolism: 7, stomachCapacity: 4, insulation: 2, intelligence: 7,
        fuelGlandSize: 2, ignitionEfficiency: 3, scaleThickness: 2, tailSize: 8, neckLength: 5
      },
      fireDesign: { fuel: 'methane', ignition: 'spark', delivery: 'burst' },
      behavior: { aggression: 0.4, patience: 0.3, firePreference: 0.1 }
    },
    armoredBruiser: {
      label: 'Iron Fortress',
      description: 'Immovable wall of armor that advances relentlessly.',
      tintColor: '#666666',
      traits: {
        bodyMass: 9, wingspan: 2, wingArea: 2, musclePower: 8, boneDensity: 9,
        metabolism: 4, stomachCapacity: 7, insulation: 5, intelligence: 3,
        fuelGlandSize: 2, ignitionEfficiency: 3, scaleThickness: 10, tailSize: 7, neckLength: 3
      },
      fireDesign: { fuel: 'oil', ignition: 'friction', delivery: 'stream' },
      behavior: { aggression: 0.8, patience: 0.2, firePreference: 0.1 }
    },
    fireBurst: {
      label: 'Fireborn Wyrm',
      description: 'Volatile fire specialist that overwhelms enemies with devastating flame attacks.',
      tintColor: '#dd4422',
      traits: {
        bodyMass: 5, wingspan: 5, wingArea: 5, musclePower: 4, boneDensity: 4,
        metabolism: 9, stomachCapacity: 6, insulation: 3, intelligence: 6,
        fuelGlandSize: 10, ignitionEfficiency: 9, scaleThickness: 5, tailSize: 4, neckLength: 7
      },
      fireDesign: { fuel: 'hydrogen', ignition: 'electricArc', delivery: 'cone' },
      behavior: { aggression: 0.5, patience: 0.4, firePreference: 0.9 }
    },
    enduranceHunter: {
      label: 'Stalker Prime',
      description: 'Patient predator that outlasts opponents through superior efficiency.',
      tintColor: '#44aa55',
      traits: {
        bodyMass: 5, wingspan: 6, wingArea: 6, musclePower: 5, boneDensity: 5,
        metabolism: 3, stomachCapacity: 9, insulation: 5, intelligence: 9,
        fuelGlandSize: 3, ignitionEfficiency: 5, scaleThickness: 5, tailSize: 6, neckLength: 5
      },
      fireDesign: { fuel: 'acid', ignition: 'catalytic', delivery: 'cloud' },
      behavior: { aggression: 0.3, patience: 0.8, firePreference: 0.2 }
    },
    balancedPredator: {
      label: 'Elder Drake',
      description: 'Veteran all-rounder with no critical weaknesses.',
      tintColor: '#8866aa',
      traits: {
        bodyMass: 6, wingspan: 6, wingArea: 6, musclePower: 6, boneDensity: 6,
        metabolism: 5, stomachCapacity: 6, insulation: 5, intelligence: 7,
        fuelGlandSize: 5, ignitionEfficiency: 6, scaleThickness: 6, tailSize: 6, neckLength: 5
      },
      fireDesign: { fuel: 'oil', ignition: 'catalytic', delivery: 'jet' },
      behavior: { aggression: 0.5, patience: 0.5, firePreference: 0.5 }
    },
    glassCannon: {
      label: 'Deathblossom',
      description: 'Extreme offensive power packed into a fragile frame — wins fast or dies trying.',
      tintColor: '#ff6644',
      traits: {
        bodyMass: 3, wingspan: 5, wingArea: 5, musclePower: 8, boneDensity: 2,
        metabolism: 9, stomachCapacity: 4, insulation: 1, intelligence: 6,
        fuelGlandSize: 9, ignitionEfficiency: 8, scaleThickness: 1, tailSize: 4, neckLength: 6
      },
      fireDesign: { fuel: 'hydrogen', ignition: 'electricArc', delivery: 'jet' },
      behavior: { aggression: 0.9, patience: 0.1, firePreference: 0.7 }
    }
  },

  // --------------------------------------------------------
  // BATTLE CONFIGURATION
  // --------------------------------------------------------
  BATTLE_CONFIG: {
    maxTicks: 40,
    tickDelay: { normal: 800, fast: 200 },
    hpBase: 100,
    staminaBase: 100,
    fireSystemBase: 100,
    staminaRegenPerTick: 3,
    closeRange: 3,

    actions: {
      reposition:    { staminaCost: 5,  label: 'Reposition',     baseDamage: 0 },
      lunge:         { staminaCost: 10, label: 'Lunge',          baseDamage: 5 },
      bite:          { staminaCost: 12, label: 'Bite',           baseDamage: 15, rangeRequired: 'close' },
      claw:          { staminaCost: 10, label: 'Claw Strike',    baseDamage: 12, rangeRequired: 'close' },
      tailStrike:    { staminaCost: 8,  label: 'Tail Strike',    baseDamage: 10, rangeRequired: 'close', knockback: true },
      fireBurst:     { staminaCost: 15, label: 'Fire Burst',     baseDamage: 20, fireSystemCost: 8 },
      sustainedFire: { staminaCost: 20, label: 'Sustained Fire', baseDamage: 30, fireSystemCost: 15, duration: 2 },
      evade:         { staminaCost: 8,  label: 'Evade',          baseDamage: 0 },
      brace:         { staminaCost: 5,  label: 'Brace',          baseDamage: 0 },
      recover:       { staminaCost: 0,  label: 'Recover',        baseDamage: 0, staminaRecovery: 15 },
      seekDistance:   { staminaCost: 6,  label: 'Seek Distance',  baseDamage: 0 },
      pressure:      { staminaCost: 7,  label: 'Pressure',       baseDamage: 3 }
    },

    arenas: {
      mountains: {
        label: 'Mountain Peaks',
        description: 'High altitude favors agile flyers with strong glide capability.',
        modifiers: { mobilityBonus: 1.2, fireDamage: 0.9, coverFactor: 0.2, staminaDrain: 1.1 }
      },
      tundra: {
        label: 'Frozen Tundra',
        description: 'Bitter cold drains stamina faster and punishes poor insulation.',
        modifiers: { mobilityBonus: 0.8, fireDamage: 1.1, coverFactor: 0.1, staminaDrain: 1.3, insulationCheck: true }
      },
      volcanic: {
        label: 'Volcanic Crater',
        description: 'Intense ambient heat amplifies fire attacks and rewards heat tolerance.',
        modifiers: { mobilityBonus: 0.9, fireDamage: 1.4, coverFactor: 0.1, staminaDrain: 1.0, heatCheck: true }
      },
      forest: {
        label: 'Dense Forest',
        description: 'Tight quarters punish large wings and reward agility.',
        modifiers: { mobilityBonus: 0.7, fireDamage: 0.8, coverFactor: 0.4, staminaDrain: 0.9, wingspanPenalty: true }
      },
      plains: {
        label: 'Open Plains',
        description: 'Wide open terrain rewards endurance and pursuit.',
        modifiers: { mobilityBonus: 1.1, fireDamage: 1.0, coverFactor: 0.0, staminaDrain: 0.9 }
      }
    }
  },

  // --------------------------------------------------------
  // SCIENCE GLOSSARY — tooltip definitions
  // --------------------------------------------------------
  SCIENCE_GLOSSARY: {
    lift: {
      term: 'Lift',
      definition: 'The upward force generated by wings moving through air. Created by pressure differences between the upper and lower wing surfaces.'
    },
    drag: {
      term: 'Drag',
      definition: 'Air resistance opposing forward movement. Larger body cross-sections and wider wings increase drag significantly.'
    },
    metabolism: {
      term: 'Metabolism',
      definition: 'The rate at which an organism converts food into energy. Higher metabolism supports intense activity but demands more frequent feeding.'
    },
    wingLoading: {
      term: 'Wing Loading',
      definition: 'The ratio of body weight to wing area. Lower wing loading means easier flight; higher loading means the dragon needs more speed or power to stay airborne.'
    },
    thrust: {
      term: 'Thrust',
      definition: 'Forward force generated by wing beats. Sustained flight requires thrust greater than drag, powered by muscle contractions.'
    },
    boneDensity: {
      term: 'Bone Density',
      definition: 'The mineral content and structural rigidity of the skeleton. Denser bones resist fractures but weigh significantly more.'
    },
    insulation: {
      term: 'Insulation',
      definition: 'The thermal barrier between the organism and its environment. Critical for maintaining body temperature in extreme climates.'
    },
    fuelGland: {
      term: 'Fuel Gland',
      definition: 'A specialized organ that synthesizes combustible compounds from metabolic byproducts. Larger glands produce more fuel but require more energy and create internal heat.'
    },
    ignitionOrgan: {
      term: 'Ignition Organ',
      definition: 'The biological mechanism that initiates combustion of expelled fuel. Different ignition methods vary in speed, reliability, and energy cost.'
    },
    ecologicalNiche: {
      term: 'Ecological Niche',
      definition: 'The specific role and environment an organism occupies. A dragon\'s design determines which habitats it can survive in and how it competes for resources.'
    },
    energyBudget: {
      term: 'Energy Budget',
      definition: 'The total caloric input minus all metabolic costs. A dragon must consume enough food to cover resting metabolism, movement, thermoregulation, and fire production.'
    },
    structuralIntegrity: {
      term: 'Structural Integrity',
      definition: 'The skeleton and armor\'s ability to withstand physical stress, impacts, and internal forces from flight and fire production.'
    },
    blowback: {
      term: 'Blowback',
      definition: 'Dangerous reverse combustion when fuel ignites prematurely inside the throat or gland. Often caused by incompatible fuel-ignition combinations or poor heat tolerance.'
    },
    maneuverability: {
      term: 'Maneuverability',
      definition: 'The ability to change direction rapidly in flight or on the ground. Influenced by tail size, body mass, wing geometry, and neural processing speed.'
    },
    heatTolerance: {
      term: 'Heat Tolerance',
      definition: 'The organism\'s resistance to thermal damage from its own fire system and environmental heat sources. Dependent on scale thickness, insulation, and bone composition.'
    },
    wingArea: {
      term: 'Wing Area',
      definition: 'The total surface area of the wing membranes. The primary generator of lift — larger area supports heavier loads but creates more drag.'
    },
    fuelChemistry: {
      term: 'Fuel Chemistry',
      definition: 'The chemical composition of the fire gland\'s output. Different fuel types vary in volatility, energy density, ignition requirements, and safety profile.'
    },
    deliveryType: {
      term: 'Breath Delivery',
      definition: 'The physical mechanism for expelling fire. Determines range, spread pattern, precision, and stamina cost of breath attacks.'
    },
    compatibility: {
      term: 'System Compatibility',
      definition: 'How well the fuel type, ignition method, and delivery system work together. Poor compatibility reduces output and increases blowback risk.'
    },
    atomization: {
      term: 'Atomization',
      definition: 'Breaking liquid fuel into fine droplets for efficient combustion. Poor atomization reduces fire output and can cause uneven, sputtering flames.'
    }
  },

  // --------------------------------------------------------
  // SCIENCE NOTES — lab database entries
  // --------------------------------------------------------
  SCIENCE_NOTES: [
    {
      id: 'flight_basics', title: 'Principles of Dragon Flight', category: 'flight',
      content: 'A dragon generates lift when air flows faster over the curved upper wing surface than the lower, creating a pressure differential that pushes the wing upward. The total lift must exceed the dragon\'s weight for sustained flight. This is why wing area and body mass have such a direct relationship — double the mass and you need roughly double the wing area, or significantly more muscle power for active flapping.'
    },
    {
      id: 'wing_loading', title: 'Wing Loading and Flight Style', category: 'flight',
      content: 'Wing loading — the ratio of weight to wing area — determines a dragon\'s flight character. Low wing loading (light body, large wings) produces effortless soaring and tight turning. High wing loading (heavy body, small wings) demands fast speed, powerful muscles, and limits maneuverability. Most real-world large flyers keep wing loading low, which is why heavy armored dragons struggle to fly.'
    },
    {
      id: 'fire_chemistry', title: 'Biological Fire Production', category: 'fire',
      content: 'The fuel gland synthesizes combustible compounds from dietary metabolites — the biological equivalent of a chemical refinery. Different fuel chemistries offer different tradeoffs: gases ignite easily but dissipate quickly, oils burn longer but are harder to ignite, and exotic compounds like metallic particulates produce devastating effects at the cost of complex biology. Every fuel type imposes unique demands on the ignition and delivery systems.'
    },
    {
      id: 'fire_safety', title: 'Internal Fire Safety', category: 'fire',
      content: 'The greatest threat from a biological fire system is often the dragon itself. Blowback occurs when fuel ignites inside the throat or gland chamber, causing severe internal damage. Heat-resistant scales, compatible ignition systems, and intelligent fire control all reduce this risk. Notably, the most powerful fuel-ignition combinations often carry the highest blowback risk — raw firepower and safety are fundamentally opposed.'
    },
    {
      id: 'metabolism_scaling', title: 'Metabolic Scaling Laws', category: 'energy',
      content: 'Metabolic rate scales with body mass, but not linearly. Larger creatures are relatively more efficient per kilogram, but their absolute energy needs are enormous. A dragon with high muscle power and active flight burns calories at an extraordinary rate. Without sufficient stomach capacity and feeding frequency, even a well-designed dragon can starve — the fire-breathing biological jet engine demands constant fuel.'
    },
    {
      id: 'energy_budget', title: 'The Energy Budget Problem', category: 'energy',
      content: 'Every biological system draws from the same energy pool. Flight muscles need calories. Fire production consumes metabolic resources. Even maintaining body temperature costs energy. The most common failure mode in dragon design is not building a dragon that can\'t fly or breathe fire — it\'s building one that can do both but cannot eat enough to sustain either. Energy sustainability is the hidden constraint that separates viable designs from impressive failures.'
    },
    {
      id: 'bone_architecture', title: 'Skeletal Architecture', category: 'structure',
      content: 'Dragon bones must balance contradictory requirements: light enough for flight, strong enough to anchor flight muscles, and rigid enough to protect internal organs. Real flying animals solve this with hollow pneumatic bones reinforced by internal struts. A dragon with extremely dense bones gains structural toughness but pays a severe weight penalty. The skeleton is the foundation — every other system depends on what the bones can support.'
    },
    {
      id: 'thermal_regulation', title: 'Thermal Regulation Systems', category: 'structure',
      content: 'A fire-breathing dragon faces a unique thermoregulatory challenge: its own weapon generates extreme internal heat. Scale thickness provides external armor and heat shielding. Insulation helps maintain core temperature in cold environments but can cause overheating in volcanic regions. The interplay between internal fire production and thermal management creates some of the most interesting design tradeoffs in dragon engineering.'
    },
    {
      id: 'ecological_niche', title: 'Ecological Niche Theory', category: 'ecology',
      content: 'No organism exists in isolation — every design occupies an ecological niche defined by its habitat, diet, competitors, and physical capabilities. A dragon optimized for mountain peaks may be catastrophically unfit for dense forests. Understanding niche requirements means understanding that "best" is always relative to environment. The apex predator of the tundra might be a helpless liability in the tropics.'
    },
    {
      id: 'structural_tradeoffs', title: 'The Weight-Protection Tradeoff', category: 'ecology',
      content: 'Armor is heavy. Every gram of scale thickness, every increase in bone density, every layer of protective tissue adds mass that the wings must lift and the metabolism must feed. This fundamental tradeoff explains why the most durable dragons are often grounded — they traded sky for survival. Conversely, the most agile flyers are often fragile. Nature rarely allows excellence in both.'
    },
    {
      id: 'combat_biomechanics', title: 'Combat Biomechanics', category: 'combat',
      content: 'Dragon combat is governed by the same physical laws as all biological conflict: mass creates impact force, speed creates evasion potential, and endurance determines who collapses first. A heavy dragon hits harder but turns slowly. A light dragon dodges well but can\'t absorb punishment. Intelligence allows better target selection and energy conservation. The winner is rarely the strongest — it\'s the design whose strengths best exploit the opponent\'s weaknesses.'
    },
    {
      id: 'habitat_adaptation', title: 'Environmental Adaptation', category: 'ecology',
      content: 'Each habitat imposes specific selection pressures on dragon physiology. Mountains demand efficient gliding and altitude management. Tundra demands thermal insulation and caloric efficiency. Volcanic regions demand heat tolerance. Forests demand agility and compact wingspans. Open plains demand endurance and pursuit speed. A truly versatile dragon design is possible but requires sacrificing peak performance in any single environment.'
    },
    {
      id: 'fire_delivery', title: 'Breath Weapon Delivery Systems', category: 'fire',
      content: 'How fire reaches the target matters as much as the fire itself. A focused jet concentrates energy for maximum penetration at range. A cone blast denies area but wastes fuel. Explosive globs deliver devastating point damage but are slow and predictable. The delivery system must match the fuel chemistry — liquid fuels can\'t scatter effectively, and gases can\'t form cohesive projectiles. Delivery choice defines the dragon\'s combat role.'
    },
    {
      id: 'intelligence_survival', title: 'Neural Complexity and Survival', category: 'combat',
      content: 'Intelligence doesn\'t fix bad anatomy, but it amplifies good design. A smart dragon hunts more efficiently, conserves energy during combat, and avoids fights it cannot win. In battle, higher neural complexity translates to better action selection — avoiding wasted attacks, exploiting positioning, and managing fire system cooldowns. Intelligence is the multiplier, not the foundation.'
    }
  ],

  // --------------------------------------------------------
  // TUTORIAL STEPS
  // --------------------------------------------------------
  TUTORIAL_STEPS: [
    {
      id: 'welcome',
      title: 'Welcome to Dragon Engineering Lab',
      text: 'You are a dragon bioengineer. Your job: design a dragon that can actually survive, fly, and breathe fire under real scientific constraints. Every choice creates tradeoffs.',
      target: null,
      tab: null,
      waitFor: null
    },
    {
      id: 'builder',
      title: 'The Dragon Builder',
      text: 'These sliders control your dragon\'s anatomy and physiology. Each trait affects multiple systems — heavier armor improves protection but makes flight harder.',
      target: '#controls-panel',
      tab: 'build',
      waitFor: null
    },
    {
      id: 'try_slider',
      title: 'Try It — Adjust Body Mass',
      text: 'Drag the Body Mass slider and watch the dragon change in real time. Notice how the body grows — but remember, more mass means more weight for the wings to lift.',
      target: '[data-trait="bodyMass"]',
      tab: 'build',
      waitFor: 'slider_change'
    },
    {
      id: 'simulate',
      title: 'Run Your First Simulation',
      text: 'Click "Run Simulation" to test your dragon\'s viability. The lab will evaluate flight, fire, energy, durability, and survival.',
      target: '#btn-simulate',
      tab: 'simulate',
      waitFor: 'simulation_run'
    },
    {
      id: 'results',
      title: 'Reading the Results',
      text: 'Each system gets a score and explanation. Look for warnings — they reveal which traits are hurting your design. The classification at the top summarizes your dragon\'s overall profile.',
      target: '#results-panel',
      tab: 'simulate',
      waitFor: null
    },
    {
      id: 'habitat',
      title: 'Habitat Testing',
      text: 'Different environments reward different designs. Try selecting a habitat to see how your dragon performs in mountains, tundra, volcanic regions, forests, or open plains.',
      target: '#habitat-selector',
      tab: 'habitat',
      waitFor: 'habitat_select'
    },
    {
      id: 'battle_intro',
      title: 'Battle Testing',
      text: 'Battle mode pits your dragon against AI opponents. It\'s a stress test — you\'ll see how your design performs under pressure, and which traits matter most in combat.',
      target: '#battle-panel',
      tab: 'battle',
      waitFor: null
    },
    {
      id: 'fire_lab',
      title: 'The Fire Design Lab',
      text: 'Advanced players can customize fire chemistry, ignition method, and breath delivery. Different combinations create unique combat roles — but watch for compatibility warnings.',
      target: '#fire-design-panel',
      tab: 'build',
      waitFor: null
    },
    {
      id: 'freeplay',
      title: 'You\'re Ready',
      text: 'Experiment freely. Try the presets for inspiration, randomize for surprises, and check the Science Notes to understand the systems deeper. Every failure teaches something.',
      target: null,
      tab: null,
      waitFor: null
    }
  ]
};

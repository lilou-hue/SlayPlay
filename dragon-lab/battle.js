// ============================================================
// Dragon Engineering Lab — Battle Engine
// Tick-based combat system with AI, arena modifiers, and
// speed control. Runs to completion, then played back visually.
// ============================================================

window.Battle = (function() {
  const DATA = window.DragonData;
  const BC = DATA.BATTLE_CONFIG;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // --------------------------------------------------------
  // CREATE BATTLE STATE
  // --------------------------------------------------------
  function create(playerDragon, enemyArchetypeKey, arenaKey) {
    const playerResults = window.Simulation.evaluate(playerDragon);
    const playerBattle = playerResults.battleStats;

    // Build enemy dragon
    const archetype = DATA.ENEMY_ARCHETYPES[enemyArchetypeKey] || DATA.ENEMY_ARCHETYPES.balancedPredator;
    const enemyDragon = window.Dragon.create({
      name: archetype.label,
      traits: { ...archetype.traits },
      fireDesign: { ...archetype.fireDesign }
    });
    const enemyResults = window.Simulation.evaluate(enemyDragon);
    const enemyBattle = enemyResults.battleStats;

    const arena = BC.arenas[arenaKey] || BC.arenas.plains;

    return {
      player: {
        dragon: playerDragon,
        results: playerResults,
        stats: playerBattle,
        hp: BC.hpBase,
        stamina: BC.staminaBase,
        fireSystem: BC.fireSystemBase,
        position: 0,
        lastAction: null,
        evading: false,
        bracing: false,
        sustainedFireTicks: 0,
        name: playerDragon.name || 'Your Dragon'
      },
      enemy: {
        dragon: enemyDragon,
        results: enemyResults,
        stats: enemyBattle,
        hp: BC.hpBase,
        stamina: BC.staminaBase,
        fireSystem: BC.fireSystemBase,
        position: 10,
        lastAction: null,
        evading: false,
        bracing: false,
        sustainedFireTicks: 0,
        behavior: archetype.behavior,
        name: archetype.label
      },
      arena: arena,
      arenaKey: arenaKey,
      archetypeKey: enemyArchetypeKey,
      tick: 0,
      log: [],
      winner: null,
      phase: 'active'
    };
  }

  // --------------------------------------------------------
  // AI ACTION SELECTION
  // --------------------------------------------------------
  function chooseAction(combatant, opponent, state) {
    const distance = Math.abs(state.player.position - state.enemy.position);
    const isClose = distance <= BC.closeRange;
    const hpRatio = combatant.hp / BC.hpBase;
    const staminaRatio = combatant.stamina / BC.staminaBase;
    const fireRatio = combatant.fireSystem / BC.fireSystemBase;
    const beh = combatant.behavior || { aggression: 0.5, patience: 0.5, firePreference: 0.5 };

    const scores = {};

    if (isClose) {
      // Melee options
      scores.bite = combatant.stats.attackPower * beh.aggression * 0.8;
      scores.claw = combatant.stats.attackPower * beh.aggression * 0.6;
      scores.tailStrike = combatant.stats.attackPower * 0.4 + (beh.patience * 10); // knockback utility
    } else {
      // Ranged / approach options
      scores.lunge = beh.aggression * combatant.stats.burstSpeed * 0.4;
      scores.pressure = beh.aggression * 20;
      scores.seekDistance = (1 - beh.aggression) * 25;
    }

    // Fire options (range-independent but affected by distance)
    if (fireRatio > 0.2 && combatant.stats.fireAttack > 15) {
      const fireViable = combatant.results.fire.stability > 25;
      const inRange = distance <= combatant.stats.fireRange;
      if (inRange && fireViable) {
        scores.fireBurst = combatant.stats.fireAttack * beh.firePreference * 0.7;
        if (fireRatio > 0.4 && staminaRatio > 0.3) {
          scores.sustainedFire = combatant.stats.fireAttack * beh.firePreference * 0.9;
        }
      }
    }

    // Defensive options
    scores.evade = (1 - hpRatio) * combatant.stats.mobility * 0.3 + (1 - beh.aggression) * 15;
    scores.brace = beh.patience * combatant.stats.resilience * 0.2;

    // Recovery
    if (staminaRatio < 0.4) {
      scores.recover = (1 - staminaRatio) * 40 * beh.patience;
    }

    // Reposition
    scores.reposition = combatant.stats.mobility * 0.15;

    // Intelligence-based tactical bonus: boost the best action
    const tacticalMod = combatant.stats.tacticalEfficiency * 0.01;
    let bestAction = null;
    let bestScore = -1;
    Object.keys(scores).forEach(a => {
      if (scores[a] > bestScore) { bestScore = scores[a]; bestAction = a; }
    });
    if (bestAction) scores[bestAction] *= (1 + tacticalMod);

    // Add noise inversely proportional to intelligence
    const noiseFactor = (1 - (combatant.dragon ? combatant.dragon.traits.intelligence : 5) * 0.08);
    Object.keys(scores).forEach(a => {
      scores[a] += Math.random() * 12 * noiseFactor;
    });

    // Pick highest scoring action that can be afforded
    const actionDefs = BC.actions;
    let chosen = 'recover'; // fallback
    let chosenScore = -Infinity;
    Object.keys(scores).forEach(a => {
      const def = actionDefs[a];
      if (!def) return;
      // Check stamina affordability
      if (combatant.stamina < def.staminaCost) return;
      // Check fire system cost
      if (def.fireSystemCost && combatant.fireSystem < def.fireSystemCost) return;
      // Check range requirement
      if (def.rangeRequired === 'close' && !isClose) return;
      if (scores[a] > chosenScore) {
        chosenScore = scores[a];
        chosen = a;
      }
    });

    return chosen;
  }

  // Simple player action selection (mirrors AI but uses player dragon traits)
  function choosePlayerAction(combatant, opponent, state) {
    // Player dragon uses same AI logic but without behavior object (defaults to balanced)
    const temp = { ...combatant, behavior: { aggression: 0.5, patience: 0.5, firePreference: 0.4 } };
    return chooseAction(temp, opponent, state);
  }

  // --------------------------------------------------------
  // RESOLVE ONE TICK
  // --------------------------------------------------------
  function tick(state) {
    if (state.phase !== 'active') return state;

    state.tick++;
    const events = [];
    const arena = state.arena;
    const mods = arena.modifiers;

    // Clear per-tick flags
    state.player.evading = false;
    state.player.bracing = false;
    state.enemy.evading = false;
    state.enemy.bracing = false;

    // Choose actions
    const playerAction = choosePlayerAction(state.player, state.enemy, state);
    const enemyAction = chooseAction(state.enemy, state.player, state);

    state.player.lastAction = playerAction;
    state.enemy.lastAction = enemyAction;

    // Determine action order by burst speed
    const playerFirst = state.player.stats.burstSpeed >= state.enemy.stats.burstSpeed;
    const order = playerFirst
      ? [{ actor: state.player, target: state.enemy, action: playerAction, isPlayer: true },
         { actor: state.enemy, target: state.player, action: enemyAction, isPlayer: false }]
      : [{ actor: state.enemy, target: state.player, action: enemyAction, isPlayer: false },
         { actor: state.player, target: state.enemy, action: playerAction, isPlayer: true }];

    let playerDmgDealt = 0;
    let enemyDmgDealt = 0;

    for (const turn of order) {
      const { actor, target, action, isPlayer } = turn;
      const actionDef = BC.actions[action];
      if (!actionDef) continue;

      const actorName = isPlayer ? state.player.name : state.enemy.name;

      // Pay stamina cost
      actor.stamina = Math.max(0, actor.stamina - actionDef.staminaCost);

      // Pay fire system cost
      if (actionDef.fireSystemCost) {
        actor.fireSystem = Math.max(0, actor.fireSystem - actionDef.fireSystemCost);
      }

      const distance = Math.abs(state.player.position - state.enemy.position);

      // Resolve action effects
      switch (action) {
        case 'reposition': {
          const move = actor.stats.mobility * 0.03 * (mods.mobilityBonus || 1);
          if (isPlayer) state.player.position += (state.player.position < state.enemy.position ? move : -move);
          else state.enemy.position += (state.enemy.position < state.player.position ? move : -move);
          events.push(`${actorName} repositions for better ground.`);
          break;
        }
        case 'lunge': {
          const lungeDistance = actor.stats.burstSpeed * 0.05 * (mods.mobilityBonus || 1);
          if (isPlayer) state.player.position += (state.player.position < state.enemy.position ? lungeDistance : -lungeDistance);
          else state.enemy.position += (state.enemy.position < state.player.position ? lungeDistance : -lungeDistance);
          // Small impact damage
          let dmg = actionDef.baseDamage * (actor.stats.attackPower / 50);
          if (target.bracing) dmg *= 0.5;
          if (target.evading && Math.random() < target.stats.mobility * 0.007) {
            events.push(`${actorName} lunges forward but misses!`);
          } else {
            target.hp = Math.max(0, target.hp - dmg);
            if (isPlayer) playerDmgDealt += dmg; else enemyDmgDealt += dmg;
            events.push(`${actorName} lunges forward, dealing ${dmg.toFixed(1)} damage.`);
          }
          break;
        }
        case 'bite':
        case 'claw': {
          let dmg = actionDef.baseDamage * (actor.stats.attackPower / 50);
          if (target.bracing) dmg *= (1 - target.stats.resilience * 0.004);
          if (target.evading && Math.random() < target.stats.mobility * 0.008) {
            events.push(`${actorName} attacks with ${action} but the target evades!`);
          } else {
            target.hp = Math.max(0, target.hp - dmg);
            if (isPlayer) playerDmgDealt += dmg; else enemyDmgDealt += dmg;
            events.push(`${actorName} lands a ${actionDef.label} for ${dmg.toFixed(1)} damage.`);
          }
          break;
        }
        case 'tailStrike': {
          let dmg = actionDef.baseDamage * (actor.stats.attackPower / 60);
          if (target.evading && Math.random() < target.stats.mobility * 0.006) {
            events.push(`${actorName}'s tail strike misses!`);
          } else {
            target.hp = Math.max(0, target.hp - dmg);
            if (isPlayer) playerDmgDealt += dmg; else enemyDmgDealt += dmg;
            // Knockback
            if (actionDef.knockback) {
              const kb = 1.5;
              if (isPlayer) state.enemy.position += kb;
              else state.player.position -= kb;
              events.push(`${actorName}'s tail strike deals ${dmg.toFixed(1)} damage and knocks the opponent back!`);
            } else {
              events.push(`${actorName}'s tail strike deals ${dmg.toFixed(1)} damage.`);
            }
          }
          break;
        }
        case 'fireBurst':
        case 'sustainedFire': {
          let dmg = actionDef.baseDamage * (actor.stats.fireAttack / 50) * (mods.fireDamage || 1);
          // Cover reduces fire damage
          if (mods.coverFactor > 0 && Math.random() < mods.coverFactor * 0.5) {
            dmg *= 0.6;
            events.push(`Cover reduces the fire's effectiveness.`);
          }
          if (target.evading && Math.random() < target.stats.mobility * 0.005) {
            events.push(`${actorName} unleashes ${actionDef.label} but the target dodges the flame!`);
          } else {
            target.hp = Math.max(0, target.hp - dmg);
            if (isPlayer) playerDmgDealt += dmg; else enemyDmgDealt += dmg;
            events.push(`${actorName} unleashes ${actionDef.label} for ${dmg.toFixed(1)} fire damage!`);
          }
          // Blowback check
          const blowbackChance = actor.results.fire.blowbackRisk * 0.005;
          if (Math.random() < blowbackChance) {
            const selfDmg = 5 + actor.results.fire.blowbackRisk * 0.15;
            actor.hp = Math.max(0, actor.hp - selfDmg);
            actor.fireSystem = Math.max(0, actor.fireSystem - 10);
            events.push(`BLOWBACK! ${actorName} suffers ${selfDmg.toFixed(1)} internal fire damage!`);
          }
          break;
        }
        case 'evade': {
          actor.evading = true;
          events.push(`${actorName} takes evasive action.`);
          break;
        }
        case 'brace': {
          actor.bracing = true;
          events.push(`${actorName} braces for impact.`);
          break;
        }
        case 'recover': {
          const recovery = actionDef.staminaRecovery + actor.stats.stamina * 0.1;
          actor.stamina = Math.min(BC.staminaBase, actor.stamina + recovery);
          events.push(`${actorName} recovers ${recovery.toFixed(0)} stamina.`);
          break;
        }
        case 'seekDistance': {
          const dist = actor.stats.mobility * 0.04 * (mods.mobilityBonus || 1);
          if (isPlayer) state.player.position -= dist;
          else state.enemy.position += dist;
          events.push(`${actorName} seeks distance.`);
          break;
        }
        case 'pressure': {
          const closeDist = actor.stats.burstSpeed * 0.03 * (mods.mobilityBonus || 1);
          if (isPlayer) state.player.position += closeDist;
          else state.enemy.position -= closeDist;
          let dmg = actionDef.baseDamage * (actor.stats.attackPower / 80);
          target.hp = Math.max(0, target.hp - dmg);
          if (isPlayer) playerDmgDealt += dmg; else enemyDmgDealt += dmg;
          events.push(`${actorName} pressures aggressively, dealing ${dmg.toFixed(1)} chip damage.`);
          break;
        }
      }
    }

    // Per-tick stamina regen
    state.player.stamina = Math.min(BC.staminaBase, state.player.stamina + BC.staminaRegenPerTick);
    state.enemy.stamina = Math.min(BC.staminaBase, state.enemy.stamina + BC.staminaRegenPerTick);

    // Arena stamina drain
    const staminaDrain = (mods.staminaDrain || 1) - 1;
    if (staminaDrain > 0) {
      state.player.stamina = Math.max(0, state.player.stamina - staminaDrain * 3);
      state.enemy.stamina = Math.max(0, state.enemy.stamina - staminaDrain * 3);

      // Tundra insulation check
      if (mods.insulationCheck) {
        if (state.player.dragon.traits.insulation < 4) {
          state.player.stamina = Math.max(0, state.player.stamina - 2);
          if (state.tick % 5 === 0) events.push(`${state.player.name} shivers in the cold — poor insulation drains stamina.`);
        }
        if (state.enemy.dragon.traits.insulation < 4) {
          state.enemy.stamina = Math.max(0, state.enemy.stamina - 2);
        }
      }

      // Volcanic heat check
      if (mods.heatCheck) {
        if (state.player.results.fire.heatTolerance < 30) {
          state.player.hp = Math.max(0, state.player.hp - 1);
          if (state.tick % 4 === 0) events.push(`Ambient heat damages ${state.player.name} — low heat tolerance.`);
        }
        if (state.enemy.results.fire.heatTolerance < 30) {
          state.enemy.hp = Math.max(0, state.enemy.hp - 1);
        }
      }
    }

    // Forest wingspan penalty
    if (mods.wingspanPenalty) {
      if (state.player.dragon.traits.wingspan > 7) {
        state.player.stamina = Math.max(0, state.player.stamina - 1);
      }
      if (state.enemy.dragon.traits.wingspan > 7) {
        state.enemy.stamina = Math.max(0, state.enemy.stamina - 1);
      }
    }

    // Clamp positions
    state.player.position = clamp(state.player.position, -5, 15);
    state.enemy.position = clamp(state.enemy.position, -5, 15);

    // Build tick record
    const record = {
      tick: state.tick,
      playerAction: playerAction,
      enemyAction: enemyAction,
      playerDamageDealt: playerDmgDealt,
      enemyDamageDealt: enemyDmgDealt,
      playerState: { hp: state.player.hp, stamina: state.player.stamina, fireSystem: state.player.fireSystem },
      enemyState: { hp: state.enemy.hp, stamina: state.enemy.stamina, fireSystem: state.enemy.fireSystem },
      distance: Math.abs(state.player.position - state.enemy.position),
      events: events
    };
    state.log.push(record);

    // Check win conditions
    checkWinConditions(state);

    return state;
  }

  // --------------------------------------------------------
  // WIN CONDITIONS
  // --------------------------------------------------------
  function checkWinConditions(state) {
    const playerDead = state.player.hp <= 0;
    const enemyDead = state.enemy.hp <= 0;
    const playerExhausted = state.player.stamina <= 0 && state.player.hp < 20;
    const enemyExhausted = state.enemy.stamina <= 0 && state.enemy.hp < 20;

    if (playerDead && enemyDead) {
      state.winner = 'draw';
      state.phase = 'ended';
    } else if (playerDead || playerExhausted) {
      state.winner = 'enemy';
      state.phase = 'ended';
    } else if (enemyDead || enemyExhausted) {
      state.winner = 'player';
      state.phase = 'ended';
    } else if (state.tick >= BC.maxTicks) {
      // Timeout — winner by remaining HP
      if (state.player.hp > state.enemy.hp) state.winner = 'player';
      else if (state.enemy.hp > state.player.hp) state.winner = 'enemy';
      else state.winner = 'draw';
      state.phase = 'ended';
    }
  }

  // --------------------------------------------------------
  // RUN FULL BATTLE
  // --------------------------------------------------------
  function runFull(state) {
    while (state.phase === 'active' && state.tick < BC.maxTicks) {
      tick(state);
    }
    // Ensure ended
    if (state.phase !== 'ended') {
      if (state.player.hp > state.enemy.hp) state.winner = 'player';
      else if (state.enemy.hp > state.player.hp) state.winner = 'enemy';
      else state.winner = 'draw';
      state.phase = 'ended';
    }
    return state;
  }

  // --------------------------------------------------------
  // UTILITY
  // --------------------------------------------------------
  function isOver(state) {
    return state.phase === 'ended';
  }

  function getActionLabel(actionId) {
    const def = BC.actions[actionId];
    return def ? def.label : actionId;
  }

  return {
    create, tick, runFull, isOver, chooseAction, getActionLabel
  };
})();

export const the_offer = {
  id: 'the_offer',
  type: 'storylet',
  title: 'The Offer',
  weight: 3,
  stages: {
    s1: {
      prose: `It's Tuesday. Ana finds you between things — between one meeting and the next — and mentions, almost carefully, that she's received an offer. Not a resignation. A mention. She's giving you something. You're not yet sure what.`,
      choices: [
        {
          id: 'negotiate',
          label: 'What would it take for you to stay?',
          resolveProse: 'You asked directly. The conversation happened.',
          effects: { foundersNerve: -1 },
          hiddenEffects: { internalCultureHealth: -2 },
          delayed: [
            {
              weeksFromNow: 2,
              hiddenEffects: { staffTrust: -1 },
              prose: null, // silent drift
            },
          ],
          nextStage: 's2a',
        },
        {
          id: 'release',
          label: 'I think you should take it.',
          resolveProse: 'Ana went quiet. No response this week.',
          effects: { staffTrust: -1 },
          hiddenEffects: { internalCultureHealth: 3 },
          delayed: [
            {
              weeksFromNow: 1,
              // Conditional: if communityHealth >= 6, Ana comes back
              condition: 'communityHealth >= 6',
              effects: { staffTrust: 2 },
              hiddenEffects: { internalCultureHealth: 2 },
              prose: 'Ana came back Monday. She didn\'t explain. She just sat down and started working.',
            },
            {
              weeksFromNow: 1,
              condition: 'communityHealth < 6',
              effects: { staffTrust: -1, operationalCalm: -1 },
              hiddenEffects: {},
              prose: 'Ana didn\'t come back.',
            },
          ],
          nextStage: 's2b',
        },
        {
          id: 'curiosity',
          label: 'Walk me through what draws you to it.',
          resolveProse: 'The conversation extended. No resolution.',
          effects: {},
          hiddenEffects: { internalCultureHealth: 1 },
          delayed: [],
          nextStage: 's2c',
        },
      ],
    },

    s2a: {
      prose: `Ana stayed. No number was ever named, but the conversation happened. This week you notice Dayo — your newest hire — asking Ana questions he used to bring to you. You are not sure when that started.`,
      choices: [
        {
          id: 'surface',
          label: 'Bring it up with Ana directly.',
          resolveProse: 'You named it. The air cleared slightly.',
          effects: { operationalCalm: -1 },
          hiddenEffects: { internalCultureHealth: 2 },
          delayed: [],
          nextStage: 's3',
        },
        {
          id: 'wait',
          label: 'Say nothing. Let it settle.',
          resolveProse: 'You watched. So did everyone else.',
          effects: {},
          hiddenEffects: { internalCultureHealth: -1 },
          delayed: [],
          nextStage: 's3',
        },
        {
          id: 'restructure',
          label: 'Restructure Ana\'s responsibilities formally.',
          resolveProse: 'You made it official. Ana read the email twice.',
          effects: { operationalCalm: 1, staffTrust: -2 },
          hiddenEffects: { internalCultureHealth: -3 },
          delayed: [],
          nextStage: 's3_departure',
        },
      ],
    },

    s2b: {
      prose: `She took a week. She's back. She didn't take the job — she never said why. She just appeared on Monday like nothing had changed, except she's moved her desk slightly. You pretend not to notice. She pretends not to notice that you noticed.`,
      choices: [
        {
          id: 'acknowledge',
          label: 'Acknowledge it. Simply.',
          resolveProse: '"I\'m glad you\'re here." That was all.',
          effects: { staffTrust: 2, foundersNerve: 1 },
          hiddenEffects: { internalCultureHealth: 4 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'match',
          label: 'Don\'t mention it. Match her energy.',
          resolveProse: 'Neither of you made it a thing.',
          effects: {},
          hiddenEffects: { internalCultureHealth: 2 },
          delayed: [],
          nextStage: 'done',
        },
      ],
    },

    s2c: {
      prose: `Two weeks since the conversation. Ana hasn't mentioned the offer again. You don't know if she took it quietly, or decided against it, or considers the whole thing closed. She's still here. Last Thursday she reorganised the family intake process without asking.`,
      choices: [
        {
          id: 'wait_quietly',
          label: '[ No action available. You wait. ]',
          resolveProse: 'Something is different. You can\'t tell if it\'s better.',
          effects: {},
          hiddenEffects: { internalCultureHealth: 3 },
          delayed: [],
          nextStage: 's3',
        },
      ],
    },

    s3: {
      // Prose changes if The Bergmanns is also active — checked in component
      prose: `A family asks Ana directly — in front of you, in front of everyone. "Are you staying?" Kids talk. So do parents.`,
      proseBergmannsActive: `The Bergmanns ask Ana directly, in front of the other families: "Are you staying?" Lena Bergmann heard something from another family. She wanted to ask before the rumours did it for her.`,
      choices: [
        {
          id: 'let_her',
          label: 'Let Ana answer for herself.',
          resolveProse: 'Ana looked at you once, then answered.',
          effects: { communityHealth: 1, staffTrust: 2 },
          hiddenEffects: { internalCultureHealth: 3 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'answer_for_her',
          label: '"Ana\'s with us."',
          resolveProse: 'The family looked reassured. Ana\'s expression did not.',
          effects: { communityHealth: 2, staffTrust: -1 },
          hiddenEffects: { internalCultureHealth: -2 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'deflect',
          label: 'Deflect: "Let\'s focus on the intake schedule."',
          resolveProse: 'The meeting stayed on track.',
          effects: { operationalCalm: 1 },
          hiddenEffects: { internalCultureHealth: -2 },
          delayed: [
            {
              weeksFromNow: 1,
              effects: {},
              hiddenEffects: {},
              prose: 'At the next all-hands, someone asks: "Is the team stable?" You have no clean answer.',
            },
          ],
          nextStage: 'done',
        },
      ],
    },

    s3_departure: {
      prose: `Ana requests a meeting. She has something written. She reads it to you, which you didn't expect. It isn't angry. It's clear in the way that makes anger feel almost easier to receive.`,
      choices: [
        {
          id: 'listen',
          label: 'Let her finish.',
          resolveProse: 'She finished. You thanked her. She left at end of month.',
          effects: { staffTrust: -2, operationalCalm: -2 },
          hiddenEffects: { internalCultureHealth: 1 }, // grace note: you listened
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'counter',
          label: 'Make a counter-offer mid-speech.',
          resolveProse: 'She stopped reading. She left anyway.',
          effects: { staffTrust: -3, foundersNerve: -1, operationalCalm: -2 },
          hiddenEffects: { internalCultureHealth: -3 },
          delayed: [],
          nextStage: 'done',
        },
      ],
    },
  },
};

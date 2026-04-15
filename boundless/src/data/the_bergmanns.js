export const the_bergmanns = {
  id: 'the_bergmanns',
  type: 'storylet',
  title: 'The Bergmanns',
  weight: 3,
  stages: {
    s1: {
      prose: `It's nine o'clock on a Wednesday evening. Lena Bergmann emails: her daughter isn't adjusting. The other children have formed a group. Hers is outside it. She wants to know what you're going to do about it.`,
      choices: [
        {
          id: 'direct',
          label: 'Call Lena back the same evening.',
          resolveProse: 'She didn\'t expect you to call. Neither did you, really.',
          effects: { communityHealth: 1 },
          hiddenEffects: { internalCultureHealth: 1 },
          delayed: [],
          nextStage: 's2_engaged',
        },
        {
          id: 'delegate',
          label: 'Ask Ana to handle the follow-up.',
          resolveProse: 'You forwarded it. Ana responded within the hour.',
          effects: {},
          hiddenEffects: { internalCultureHealth: -1 }, // mild: you passed it
          delayed: [],
          nextStage: 's2_delegated',
        },
        {
          id: 'wait',
          label: 'Give it a few days. Kids find their footing.',
          resolveProse: 'You marked it to revisit.',
          effects: { operationalCalm: 1 },
          hiddenEffects: { internalCultureHealth: -2 },
          delayed: [
            {
              weeksFromNow: 1,
              effects: { communityHealth: -1 },
              hiddenEffects: {},
              prose: 'Lena emailed again. The tone was different this time.',
            },
          ],
          nextStage: 's2_waiting',
        },
      ],
    },

    s2_engaged: {
      // Prose shifts if ICH is already degraded from The Offer
      prose: `The call went well. Lena Bergmann is direct but not aggressive — she's frightened, which is more manageable than angry. Halfway through, she asks if your staff actually like working here. You weren't expecting that question.`,
      proseLowICH: `The call went well enough. Halfway through, Lena asks — almost casually — whether your staff actually like working here. Something in how she says it. She's listening for more than your answer.`,
      choices: [
        {
          id: 'honest',
          label: '"Most days, yes. This stretch has been hard."',
          resolveProse: 'She appreciated that. You could tell.',
          effects: { communityHealth: 2, foundersNerve: -1 },
          hiddenEffects: { internalCultureHealth: 1 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'reassure',
          label: '"The team is great. We\'re all committed."',
          resolveProse: 'She said okay. She didn\'t sound convinced.',
          effects: { communityHealth: 1 },
          hiddenEffects: { internalCultureHealth: -1 },
          delayed: [],
          nextStage: 'done',
        },
      ],
    },

    s2_delegated: {
      prose: `Ana handled it. The Bergmanns seem settled for now. This morning Lena sends a short thank-you to the group chat. It's addressed to Ana by name. Not to you.`,
      choices: [
        {
          id: 'fine',
          label: 'Good. That\'s what the team is for.',
          resolveProse: 'You moved on.',
          effects: {},
          hiddenEffects: { internalCultureHealth: 0 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'check_in',
          label: 'Check in with Ana about how it went.',
          resolveProse: 'Ana told you more than you expected. She\'d been worried about the Bergmanns for a week.',
          effects: { staffTrust: 1 },
          hiddenEffects: { internalCultureHealth: 2 },
          delayed: [],
          nextStage: 'done',
        },
      ],
    },

    s2_waiting: {
      prose: `Lena emailed again. She cc'd her partner this time. The tone is different — less asking, more documenting. The daughter still hasn't found her footing. Another family told Lena they'd had similar concerns, but figured you'd get around to it.`,
      choices: [
        {
          id: 'address_now',
          label: 'Call both families this afternoon.',
          resolveProse: 'You spent two hours on calls you could have made last week.',
          effects: { communityHealth: 1, operationalCalm: -2 },
          hiddenEffects: { internalCultureHealth: -1 },
          delayed: [],
          nextStage: 'done',
        },
        {
          id: 'group_meeting',
          label: 'Organize a group check-in for all families.',
          resolveProse: 'Visible action. Took three days to schedule.',
          effects: { communityHealth: 2, operationalCalm: -1 },
          hiddenEffects: {},
          delayed: [],
          nextStage: 'done',
        },
      ],
    },
  },
};

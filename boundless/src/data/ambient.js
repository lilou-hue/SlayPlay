// Filler cards — one-shot, no staging, pad the pool so storylets don't dominate every draw

export const ambient_cards = [
  {
    id: 'the_late_invoice',
    type: 'ambient',
    title: 'The Late Invoice',
    weight: 1,
    stages: {
      default: {
        prose: `A vendor invoice from last month is still unpaid. Your accounting tool flagged it. The vendor hasn't followed up yet.`,
        choices: [
          {
            id: 'pay_now',
            label: 'Pay it now.',
            resolveProse: 'Handled.',
            effects: { operationalCalm: 1 },
            hiddenEffects: {},
            delayed: [],
            nextStage: 'done',
          },
          {
            id: 'defer',
            label: 'Flag it for next week.',
            resolveProse: 'Still open.',
            effects: {},
            hiddenEffects: {},
            delayed: [
              {
                weeksFromNow: 1,
                effects: { operationalCalm: -1 },
                hiddenEffects: {},
                prose: 'The vendor followed up. Tersely.',
              },
            ],
            nextStage: 'done',
          },
        ],
      },
    },
  },

  {
    id: 'the_wifi_complaint',
    type: 'ambient',
    title: 'The Wi-Fi Complaint',
    weight: 1,
    stages: {
      default: {
        prose: `Three families have mentioned the co-working internet in passing. One of them mentioned it twice. The building manager is hard to reach.`,
        choices: [
          {
            id: 'escalate',
            label: 'Escalate to the building manager directly.',
            resolveProse: 'Left a message. No callback yet.',
            effects: { communityHealth: 1, operationalCalm: -1 },
            hiddenEffects: {},
            delayed: [],
            nextStage: 'done',
          },
          {
            id: 'workaround',
            label: 'Set up a backup hotspot from your own data plan.',
            resolveProse: 'Families were grateful. You were slightly less so.',
            effects: { communityHealth: 2 },
            hiddenEffects: { internalCultureHealth: -1 },
            delayed: [],
            nextStage: 'done',
          },
          {
            id: 'acknowledge',
            label: 'Acknowledge it in the group chat. "Working on it."',
            resolveProse: 'Two thumbs up. One read receipt.',
            effects: {},
            hiddenEffects: {},
            delayed: [],
            nextStage: 'done',
          },
        ],
      },
    },
  },

  {
    id: 'the_good_week',
    type: 'ambient',
    title: 'A Good Week',
    weight: 1,
    stages: {
      default: {
        prose: `No crises this week. One family said, unprompted, that this is the best thing they've done. You're not sure what to do with that.`,
        choices: [
          {
            id: 'note_it',
            label: 'Write it down somewhere.',
            resolveProse: 'You wrote it down. You haven\'t reread it.',
            effects: { foundersNerve: 1 },
            hiddenEffects: { internalCultureHealth: 1 },
            delayed: [],
            nextStage: 'done',
          },
          {
            id: 'share_it',
            label: 'Share it with the team.',
            resolveProse: 'Dayo read it out loud. Ana smiled.',
            effects: { staffTrust: 1, foundersNerve: 1 },
            hiddenEffects: { internalCultureHealth: 2 },
            delayed: [],
            nextStage: 'done',
          },
        ],
      },
    },
  },
];

import { the_offer } from './the_offer.js';
import { the_bergmanns } from './the_bergmanns.js';
import { ambient_cards } from './ambient.js';

// Flat lookup: id -> card definition
export const CARDS = {};

for (const card of [the_offer, the_bergmanns, ...ambient_cards]) {
  CARDS[card.id] = card;
}

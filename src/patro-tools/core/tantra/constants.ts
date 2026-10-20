export interface NityaDevi {
  id: number;
  name: string;
  sanskritName: string;
  mantra: string;
  attribute: string;
  /** Directional placement is lineage-specific and intentionally not asserted here. */
  direction: string;
}

export const NITYA_DEVIS: NityaDevi[] = [
  { id: 1, name: "Kameshvari", sanskritName: "कामेश्वरी", mantra: "Om Kameshvaryai Namah", attribute: "Fulfillment of desires & creative impulse", direction: "Lineage-dependent" },
  { id: 2, name: "Bhagamalini", sanskritName: "भगमालिनी", mantra: "Om Bhagamalinyai Namah", attribute: "Attraction & solar radiance", direction: "Lineage-dependent" },
  { id: 3, name: "Nityaklinna", sanskritName: "नित्यक्लिन्ना", mantra: "Om Nityaklinnayai Namah", attribute: "Compassion & fluidity", direction: "Lineage-dependent" },
  { id: 4, name: "Bherunda", sanskritName: "भेरुण्डा", mantra: "Om Bherundayai Namah", attribute: "Protection & inner strength", direction: "Lineage-dependent" },
  { id: 5, name: "Vahnivasini", sanskritName: "वह्निवासिनी", mantra: "Om Vahnivasinyai Namah", attribute: "Transformative fire energy", direction: "Lineage-dependent" },
  { id: 6, name: "Mahavajreshvari", sanskritName: "महावज्रेश्वरी", mantra: "Om Mahavajreshvaryai Namah", attribute: "Indestructible clarity", direction: "Lineage-dependent" },
  { id: 7, name: "Shivaduti", sanskritName: "शिवदूती", mantra: "Om Shivadutyai Namah", attribute: "Integration of Shiva/Shakti forces", direction: "Lineage-dependent" },
  { id: 8, name: "Tvarita", sanskritName: "त्वरिता", mantra: "Om Tvaritayai Namah", attribute: "Swift spiritual realization", direction: "Lineage-dependent" },
  { id: 9, name: "Kulasundari", sanskritName: "कुलसुन्दरी", mantra: "Om Kulasundaryai Namah", attribute: "Harmony in relationships & family", direction: "Lineage-dependent" },
  { id: 10, name: "Nitya", sanskritName: "नित्या", mantra: "Om Nityayai Namah", attribute: "Perpetual movement & rhythm", direction: "Lineage-dependent" },
  { id: 11, name: "Nilapataka", sanskritName: "नीलपताका", mantra: "Om Nilapatakayai Namah", attribute: "Victory over internal blockages", direction: "Lineage-dependent" },
  { id: 12, name: "Vijaya", sanskritName: "विजया", mantra: "Om Vijayayai Namah", attribute: "Success in Sadhana and work", direction: "Lineage-dependent" },
  { id: 13, name: "Sarvamangala", sanskritName: "सर्वमङ्गला", mantra: "Om Sarvamangalayai Namah", attribute: "All-pervading auspiciousness", direction: "Lineage-dependent" },
  { id: 14, name: "Jwalamalini", sanskritName: "ज्वालामालिनी", mantra: "Om Jwalamalinyai Namah", attribute: "Purification through light", direction: "Lineage-dependent" },
  { id: 15, name: "Chitra", sanskritName: "चित्रा", mantra: "Om Chitrayai Namah", attribute: "Multidimensional expression & art", direction: "Lineage-dependent" }
];

/**
 * AafnaiPatro's transparent five-by-24-minute visualization convention.
 * This is not presented as a universal Svarodaya breathing schedule: public Svarodaya
 * descriptions also give a one-hour svara cycle with varying tattva durations.
 */
export const PANCHA_TATWAS = [
  { id: "prithvi", name: "Prithvi", element: "Earth", durationMin: 24, recommended: "Grounding, stability, building, physical work", color: "#d97706" },
  { id: "aap", name: "Aap / Jala", element: "Water", durationMin: 24, recommended: "Fluidity, emotional work, social bonding, rest", color: "#2563eb" },
  { id: "tejas", name: "Tejas / Agni", element: "Fire", durationMin: 24, recommended: "Focus, transformation, athletic effort, sharp tasks", color: "#dc2626" },
  { id: "vayu", name: "Vayu", element: "Air", durationMin: 24, recommended: "Intellectual work, movement, strategy, ideation", color: "#059669" },
  { id: "akash", name: "Akash", element: "Ether / Space", durationMin: 24, recommended: "Meditation, inner Sadhana, solitude, silence", color: "#7c3aed" }
] as const;

export interface YoginiNivas {
  id: number;
  name: string;
  direction: string;
  nature: "Benign" | "Mixed" | "Fierce";
  tithis: number[];
  blockedDirection: string;
}

/** One publicly documented eight-Yogini Disha table. Tithis are ordinal within a paksha (1–15). */
export const YOGINI_NIVAS: YoginiNivas[] = [
  { id: 1, name: "Mangala", direction: "North", nature: "Mixed", tithis: [1, 9], blockedDirection: "North" },
  { id: 2, name: "Pingala", direction: "South", nature: "Fierce", tithis: [2, 10], blockedDirection: "South" },
  { id: 3, name: "Dhanya", direction: "East", nature: "Benign", tithis: [3, 11], blockedDirection: "East" },
  { id: 4, name: "Bhramari", direction: "West", nature: "Fierce", tithis: [4, 12], blockedDirection: "West" },
  { id: 5, name: "Bhadrika", direction: "North-East", nature: "Mixed", tithis: [5, 13], blockedDirection: "North-East" },
  { id: 6, name: "Ulka", direction: "South-East", nature: "Fierce", tithis: [6, 14], blockedDirection: "South-East" },
  { id: 7, name: "Siddha", direction: "South-West", nature: "Benign", tithis: [7, 15], blockedDirection: "South-West" },
  { id: 8, name: "Sankata", direction: "North-West", nature: "Fierce", tithis: [8], blockedDirection: "North-West" }
];

export function yoginiForTithi(tithiWithinPaksha: number): YoginiNivas {
  if (!Number.isInteger(tithiWithinPaksha) || tithiWithinPaksha < 1 || tithiWithinPaksha > 15) {
    throw new Error("invalid_tithi_within_paksha");
  }
  return YOGINI_NIVAS.find((yogini) => yogini.tithis.includes(tithiWithinPaksha))!;
}

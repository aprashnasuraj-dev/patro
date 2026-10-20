export interface NityaDevi {
  id: number;
  name: string;
  sanskritName: string;
  mantra: string;
  attribute: string;
  direction: string;
}

/** Traditional interpretive labels; spellings and attributions can vary by lineage. */
export const NITYA_DEVIS: NityaDevi[] = [
  { id: 1, name: "Kameshvari", sanskritName: "कामेश्वरी", mantra: "Om Kameshvaryai Namah", attribute: "Fulfillment of desires & creative impulse", direction: "East" },
  { id: 2, name: "Bhagamalini", sanskritName: "भगमालिनी", mantra: "Om Bhagamalinyai Namah", attribute: "Attraction & solar radiance", direction: "South-East" },
  { id: 3, name: "Nityaklinna", sanskritName: "नित्यक्लिन्ना", mantra: "Om Nityaklinnayai Namah", attribute: "Compassion & fluidity", direction: "South" },
  { id: 4, name: "Bherunda", sanskritName: "भेरुण्डा", mantra: "Om Bherundayai Namah", attribute: "Protection & inner strength", direction: "South-West" },
  { id: 5, name: "Vahnivasini", sanskritName: "वह्निवासिनी", mantra: "Om Vahnivasinyai Namah", attribute: "Transformative fire energy", direction: "West" },
  { id: 6, name: "Vajreshwari", sanskritName: "वज्रेश्वरी", mantra: "Om Vajreshvaryai Namah", attribute: "Indestructible clarity", direction: "North-West" },
  { id: 7, name: "Shivaduti", sanskritName: "शिवदूती", mantra: "Om Shivadutyai Namah", attribute: "Integration of Shiva/Shakti forces", direction: "North" },
  { id: 8, name: "Tvarita", sanskritName: "त्वरिता", mantra: "Om Tvaritayai Namah", attribute: "Swift spiritual realization", direction: "North-East" },
  { id: 9, name: "Kulasundari", sanskritName: "कुलसुन्दरी", mantra: "Om Kulasundaryai Namah", attribute: "Harmony in relationships & family", direction: "Center" },
  { id: 10, name: "Nitya", sanskritName: "नित्या", mantra: "Om Nityayai Namah", attribute: "Perpetual movement & rhythm", direction: "Above" },
  { id: 11, name: "Nilapataka", sanskritName: "निलपताका", mantra: "Om Nilapatakayai Namah", attribute: "Victory over internal blockages", direction: "Below" },
  { id: 12, name: "Vijaya", sanskritName: "विजया", mantra: "Om Vijayayai Namah", attribute: "Success in Sadhana and work", direction: "East" },
  { id: 13, name: "Sarvamangala", sanskritName: "सर्वमङ्गला", mantra: "Om Sarvamangalayai Namah", attribute: "All-pervading auspiciousness", direction: "South" },
  { id: 14, name: "Jwalamalini", sanskritName: "ज्वालामालिनी", mantra: "Om Jwalamalinyai Namah", attribute: "Purification through light", direction: "West" },
  { id: 15, name: "Chitra", sanskritName: "चित्रा", mantra: "Om Chitrayai Namah", attribute: "Multidimensional expression & art", direction: "North" }
];

export const PANCHA_TATWAS = [
  { id: "prithvi", name: "Prithvi", element: "Earth", durationMin: 24, recommended: "Grounding, stability, building, physical work", color: "#d97706" },
  { id: "aap", name: "Aap / Jala", element: "Water", durationMin: 24, recommended: "Fluidity, emotional work, social bonding, rest", color: "#2563eb" },
  { id: "tejas", name: "Tejas / Agni", element: "Fire", durationMin: 24, recommended: "Focus, transformation, athletic effort, sharp tasks", color: "#dc2626" },
  { id: "vayu", name: "Vayu", element: "Air", durationMin: 24, recommended: "Intellectual work, movement, strategy, ideation", color: "#059669" },
  { id: "akash", name: "Akash", element: "Ether / Space", durationMin: 24, recommended: "Meditation, inner Sadhana, solitude, silence", color: "#7c3aed" }
] as const;

/** Traditional Yogini Nivas directional lookup keyed by the 1–15 Nitya index. */
export const YOGINI_POSITIONS: Record<number, string> = {
  1: "East", 2: "North-East", 3: "South-East", 4: "South-West",
  5: "South", 6: "West", 7: "North-West", 8: "North",
  9: "East", 10: "North-East", 11: "South-East", 12: "South-West",
  13: "South", 14: "West", 15: "Center / Sky"
};

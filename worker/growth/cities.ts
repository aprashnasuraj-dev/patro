/**
 * Cities for location-specific timing pages.
 * US list = largest metros + the main Nepali-American and Indian-American hubs
 * (Pew/ACS 2023: Dallas, New York, Washington DC are the top Nepalese metros; Texas leads by state).
 * Coordinates are city centres, rounded to 4 decimals. Height in metres (affects rise/set by seconds only).
 */
export interface GrowthCity {
  slug: string;
  name: string;
  region: string; // state / country shown to users
  country: "US" | "CA" | "GB" | "AU" | "NP" | "AE" | "QA" | "IN";
  lat: number;
  lon: number;
  tz: string;
  height?: number;
  /** extra search names (Indian/Nepali hubs inside a metro) */
  aka?: string[];
}

export const US_CITIES: GrowthCity[] = [
  { slug: "new-york", name: "New York", region: "NY", country: "US", lat: 40.7128, lon: -74.006, tz: "America/New_York", height: 10, aka: ["NYC", "Queens", "Jackson Heights"] },
  { slug: "edison-nj", name: "Edison", region: "NJ", country: "US", lat: 40.5187, lon: -74.4121, tz: "America/New_York", height: 30, aka: ["New Jersey", "Iselin", "Jersey City"] },
  { slug: "los-angeles", name: "Los Angeles", region: "CA", country: "US", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles", height: 90 },
  { slug: "chicago", name: "Chicago", region: "IL", country: "US", lat: 41.8781, lon: -87.6298, tz: "America/Chicago", height: 180 },
  { slug: "dallas", name: "Dallas", region: "TX", country: "US", lat: 32.7767, lon: -96.797, tz: "America/Chicago", height: 140, aka: ["Irving", "Fort Worth", "DFW"] },
  { slug: "houston", name: "Houston", region: "TX", country: "US", lat: 29.7604, lon: -95.3698, tz: "America/Chicago", height: 15 },
  { slug: "austin", name: "Austin", region: "TX", country: "US", lat: 30.2672, lon: -97.7431, tz: "America/Chicago", height: 150 },
  { slug: "washington-dc", name: "Washington", region: "DC", country: "US", lat: 38.9072, lon: -77.0369, tz: "America/New_York", height: 20, aka: ["Northern Virginia", "Maryland", "DMV"] },
  { slug: "philadelphia", name: "Philadelphia", region: "PA", country: "US", lat: 39.9526, lon: -75.1652, tz: "America/New_York", height: 15 },
  { slug: "boston", name: "Boston", region: "MA", country: "US", lat: 42.3601, lon: -71.0589, tz: "America/New_York", height: 10 },
  { slug: "atlanta", name: "Atlanta", region: "GA", country: "US", lat: 33.749, lon: -84.388, tz: "America/New_York", height: 300 },
  { slug: "miami", name: "Miami", region: "FL", country: "US", lat: 25.7617, lon: -80.1918, tz: "America/New_York", height: 2 },
  { slug: "charlotte", name: "Charlotte", region: "NC", country: "US", lat: 35.2271, lon: -80.8431, tz: "America/New_York", height: 230 },
  { slug: "raleigh", name: "Raleigh", region: "NC", country: "US", lat: 35.7796, lon: -78.6382, tz: "America/New_York", height: 100 },
  { slug: "columbus", name: "Columbus", region: "OH", country: "US", lat: 39.9612, lon: -82.9988, tz: "America/New_York", height: 240 },
  { slug: "detroit", name: "Detroit", region: "MI", country: "US", lat: 42.3314, lon: -83.0458, tz: "America/Detroit", height: 190 },
  { slug: "minneapolis", name: "Minneapolis", region: "MN", country: "US", lat: 44.9778, lon: -93.265, tz: "America/Chicago", height: 260 },
  { slug: "denver", name: "Denver", region: "CO", country: "US", lat: 39.7392, lon: -104.9903, tz: "America/Denver", height: 1609 },
  { slug: "phoenix", name: "Phoenix", region: "AZ", country: "US", lat: 33.4484, lon: -112.074, tz: "America/Phoenix", height: 330 },
  { slug: "las-vegas", name: "Las Vegas", region: "NV", country: "US", lat: 36.1699, lon: -115.1398, tz: "America/Los_Angeles", height: 610 },
  { slug: "san-francisco", name: "San Francisco", region: "CA", country: "US", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles", height: 15, aka: ["Bay Area", "Oakland"] },
  { slug: "san-jose", name: "San Jose", region: "CA", country: "US", lat: 37.3382, lon: -121.8863, tz: "America/Los_Angeles", height: 25, aka: ["Silicon Valley", "Fremont"] },
  { slug: "sacramento", name: "Sacramento", region: "CA", country: "US", lat: 38.5816, lon: -121.4944, tz: "America/Los_Angeles", height: 9 },
  { slug: "seattle", name: "Seattle", region: "WA", country: "US", lat: 47.6062, lon: -122.3321, tz: "America/Los_Angeles", height: 50 },
  { slug: "baltimore", name: "Baltimore", region: "MD", country: "US", lat: 39.2904, lon: -76.6122, tz: "America/New_York", height: 10 },
  { slug: "anchorage", name: "Anchorage", region: "AK", country: "US", lat: 61.2181, lon: -149.9003, tz: "America/Anchorage", height: 30 },
  { slug: "honolulu", name: "Honolulu", region: "HI", country: "US", lat: 21.3069, lon: -157.8583, tz: "Pacific/Honolulu", height: 5 },
];

export const WORLD_CITIES: GrowthCity[] = [
  { slug: "toronto", name: "Toronto", region: "Canada", country: "CA", lat: 43.6532, lon: -79.3832, tz: "America/Toronto", height: 76 },
  { slug: "london", name: "London", region: "UK", country: "GB", lat: 51.5074, lon: -0.1278, tz: "Europe/London", height: 11 },
  { slug: "sydney", name: "Sydney", region: "Australia", country: "AU", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney", height: 30 },
  { slug: "dubai", name: "Dubai", region: "UAE", country: "AE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai", height: 5 },
  { slug: "doha", name: "Doha", region: "Qatar", country: "QA", lat: 25.2854, lon: 51.531, tz: "Asia/Qatar", height: 10 },
  { slug: "kathmandu", name: "Kathmandu", region: "Nepal", country: "NP", lat: 27.7172, lon: 85.324, tz: "Asia/Kathmandu", height: 1400 },
  { slug: "delhi", name: "New Delhi", region: "India", country: "IN", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata", height: 216 },
];

export const ALL_CITIES = [...US_CITIES, ...WORLD_CITIES];
export const CITY_BY_SLUG = new Map(ALL_CITIES.map((c) => [c.slug, c]));
export const DEFAULT_US_CITY = US_CITIES[0];

export const cityLabel = (c: GrowthCity) => `${c.name}, ${c.region}`;

import {
  ArrowLeftRight, Baby, Banknote, Bell, BookOpen, BookOpenText, Bot, CalendarCheck, CalendarClock,
  CalendarDays, Calculator, Cake, CheckCircle2, Clock3, Coins, CloudSun, Compass, Database, Fuel,
  Globe2, HeartHandshake, History, Hourglass, Keyboard, Languages, Mail, Mic, Moon, MoonStar, Mountain,
  Newspaper, Orbit, PanelsTopLeft, Percent, QrCode, Radio, Receipt, Ruler, Scale, Scan, Settings,
  Sparkles, StickyNote, Telescope, Tv, Type, Users, Volume2, Wallet, Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Canonical icon mapping for primary navigation, launcher search and tools.
 * Route aliases stay together so a feature is recognizable wherever it appears.
 */
const ROUTE_ICONS: Record<string, LucideIcon> = {
  "/": CalendarDays, "/#home-weather": CloudSun, "/convert": ArrowLeftRight,
  "/tools/bstoad": CalendarDays, "/tools/adtobs": CalendarDays, "/tools/calc": Calculator,
  "/tools/age": Cake, "/tools/tithi-reminder": CalendarClock, "/time-machine": Hourglass,
  "/on-this-day": History, "/tools/clock": Globe2, "/mytime": Clock3,
  "/janmapatro": Orbit, "/janmapatro/milan.html": HeartHandshake, "/tools/astro": Telescope,
  "/astro": Telescope, "/panchang": CalendarClock, "/muhurat": Sparkles, "/jyotish": Orbit,
  "/jyotish/china": Orbit, "/planets": Orbit, "/nepal-calendar": CalendarDays,
  "/rashifal": MoonStar, "/samachar": Newspaper, "/fm": Radio, "/tv": Tv, "/samudaya": Users,
  "/nepal-sambat/mandala": Compass, "/samudaya/lhosar": Sparkles, "/samudaya/tharu": Users,
  "/samudaya/mithila": Sparkles, "/samudaya/kirat": Mountain, "/samudaya/hijri": Moon,
  "/samudaya/chakra": Compass, "/tool/nepalidictionary": BookOpenText,
  "/tools/nepali-typing": Keyboard, "/tools/preeti-converter": Languages,
  "/tools/spell-check": CheckCircle2, "/tools/voice-typing": Mic, "/tools/ocr": Scan,
  "/tools/read-aloud": Volume2, "/tools/words": Type, "/tools/forex": Banknote,
  "/tools/gold": Coins, "/tools/emi": Wallet, "/tools/vat": Percent, "/tools/incometax": Receipt,
  "/tools/landconverter": Ruler, "/tools/units": Scale, "/tools/fuelprice": Fuel,
  "/tools/nepaliqr": QrCode, "/tools/sait": Sparkles, "/tools/baby-names": Baby,
  "/tools/name-check": CheckCircle2, "/tools/janmadin-akhbar": Newspaper,
  "/tools/future-letter": Mail, "/tools/patro-bot": Bot, "/me/diary": BookOpen,
  "/me/notes": StickyNote, "/me/planner": CalendarCheck, "/me/family": Users,
  "/me/reminders": Bell, "/me/cards": PanelsTopLeft, "/me/settings": Settings,
  "/me/data": Database, "/tools": Wrench
};

export type IconPaperTheme =
  | "calendar" | "astrology" | "astronomy" | "language" | "finance"
  | "measurement" | "media" | "personal" | "create" | "utility";

/** Semantic paper-seal family: meaning drives the palette, not card position. */
export function getToolIconTheme(href: string): IconPaperTheme {
  if (["/panchang", "/muhurat", "/jyotish", "/jyotish/rashifal", "/jyotish/china", "/janmapatro", "/janmapatro/milan.html", "/rashifal", "/tools/sait", "/tools/baby-names", "/tools/name-check", "/samudaya/hijri"].includes(href)) return "astrology";
  if (["/#home-weather", "/mytime", "/tools/clock", "/astro", "/tools/astro", "/planets"].includes(href)) return "astronomy";
  if (["/samachar", "/fm", "/tv"].includes(href)) return "media";
  if (["/tools/nepali-typing", "/tools/preeti-converter", "/tool/nepalidictionary", "/tools/spell-check", "/tools/voice-typing", "/tools/ocr", "/tools/read-aloud", "/tools/words"].includes(href)) return "language";
  if (["/tools/forex", "/tools/gold", "/tools/emi", "/tools/vat", "/tools/incometax", "/tools/fuelprice"].includes(href)) return "finance";
  if (["/tools/landconverter", "/tools/units", "/tools/calc", "/tools/age", "/tools/adtobs", "/tools/bstoad"].includes(href)) return "measurement";
  if (["/me/diary", "/me/notes", "/me/planner", "/me/family", "/me/reminders", "/me/cards", "/me/settings", "/me/data", "/my-diary", "/my-diary?tab=due", "/my-diary?tab=family", "/my-diary?tab=documents", "/my-diary?tab=festival", "/settings"].includes(href)) return "personal";
  if (["/tools/nepaliqr", "/tools/janmadin-akhbar", "/tools/future-letter", "/tools/patro-bot", "/me/diary"].includes(href)) return "create";
  if (["/", "/convert", "/tools/tithi-reminder", "/nepal-calendar", "/nepal-sambat/mandala", "/time-machine", "/on-this-day", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/chakra"].includes(href)) return "calendar";
  return "utility";
}

export function getToolIcon(href: string): LucideIcon {
  return ROUTE_ICONS[href] ?? Sparkles;
}

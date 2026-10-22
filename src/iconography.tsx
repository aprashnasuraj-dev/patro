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

export function getToolIcon(href: string): LucideIcon {
  return ROUTE_ICONS[href] ?? Sparkles;
}

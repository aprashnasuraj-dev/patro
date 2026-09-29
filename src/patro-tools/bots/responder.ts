/**
 * Channel-agnostic replies. Viber, Telegram, WhatsApp and SMS adapters all call reply().
 */
import { addDays, localDate } from '../core/astro';
import { BS_MONTHS, formatLunarDate, NAKSHATRAS, toNepaliDigits, WEEKDAYS } from '../core/names';
import { defaultPanchang, type PanchangProvider } from '../core/provider';
import type { BsAdapter } from '../core/types';
import { nextFestivalDate } from '../festivals/festivals';
import type { Intent } from './intents';

export interface BotDeps {
  bs: BsAdapter;
  provider?: PanchangProvider;
  /** official festival dates by festival id */
  officialFestivals?: Record<string, string[]>;
  /** your existing rashifal source */
  rashifal?: (rashi: number, date: string) => Promise<string>;
  appUrl: string;
}

const hhmm = (d: Date) => toNepaliDigits(d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' }));

function bsLabel(iso: string, bs: BsAdapter) {
  const [y, m, d] = iso.split('-').map(Number);
  const b = bs.toBS({ year: y, month: m, day: d });
  return `${toNepaliDigits(b.year)} ${BS_MONTHS[b.month - 1]} ${toNepaliDigits(b.day)}`;
}

export function dayCard(iso: string, deps: BotDeps, title = 'आज'): string {
  const p = (deps.provider ?? defaultPanchang).day(iso);
  return [
    `📅 ${title}: ${bsLabel(iso, deps.bs)}, ${WEEKDAYS[p.weekday]}`,
    `🌙 ${formatLunarDate(p.monthIndex, p.paksha, p.tithi, p.lunarMonth.adhik)} (${hhmm(p.tithiEnds)} सम्म)`,
    `✨ नक्षत्र: ${NAKSHATRAS[p.nakshatra]}`,
    `🌅 ${hhmm(p.sunrise)}  🌇 ${hhmm(p.sunset)}`,
    `🗓 ${iso}`,
  ].join('\n');
}

export async function reply(intent: Intent, deps: BotDeps, now = new Date()): Promise<string> {
  const today = localDate(now, 'Asia/Kathmandu');
  switch (intent.type) {
    case 'today': return `${dayCard(today, deps)}\n\nपूरा पात्रो: ${deps.appUrl}`;
    case 'tomorrow': return dayCard(addDays(today, 1), deps, 'भोलि');
    case 'festival': {
      const d = nextFestivalDate(intent.festival, today, deps.officialFestivals);
      const days = Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
      return `🎉 ${intent.festival.name}: ${bsLabel(d, deps.bs)} (${d})\n${days === 0 ? 'आजै!' : `${toNepaliDigits(days)} दिन बाँकी`}`;
    }
    case 'convert': {
      if (intent.direction === 'bs2ad') {
        const ad = deps.bs.toAD({ year: intent.y, month: intent.m, day: intent.d });
        const iso = `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`;
        return `${toNepaliDigits(intent.y)} ${BS_MONTHS[intent.m - 1]} ${toNepaliDigits(intent.d)} = ${iso}`;
      }
      const iso = `${intent.y}-${String(intent.m).padStart(2, '0')}-${String(intent.d).padStart(2, '0')}`;
      return `${iso} = ${bsLabel(iso, deps.bs)}`;
    }
    case 'rashifal': return deps.rashifal ? deps.rashifal(intent.rashi, today) : `राशिफल: ${deps.appUrl}/jyotish/rashifal`;
    case 'subscribe': return '✅ अब हरेक बिहान ६ बजे आजको पात्रो पठाइनेछ। रोक्न "रोक" लेख्नुहोस्।';
    case 'unsubscribe': return 'दैनिक सन्देश बन्द गरियो। फेरि सुरु गर्न "सुरु" लेख्नुहोस्।';
    case 'help':
    default:
      return ['नमस्ते 🙏 यस्तो लेख्नुहोस्:', '• आज / aaja', '• भोलि / bholi', '• दशैं कहिले / tihar kahile', '• 2083-06-13 → अंग्रेजी मिति', '• मेष राशिफल', '• सुरु — दैनिक बिहानी पात्रो'].join('\n');
  }
}

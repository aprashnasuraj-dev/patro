import { parseIntent, type Intent } from "@/patro-tools/bots/intents";
import { reply } from "@/patro-tools/bots/responder";
import { addDays } from "@/patro-tools/core/astro";
import { bsAdapter } from "./bsAdapter";
import { panchangProvider, primePanchang } from "./panchangAdapter";

export type PatroBotAnswer = {
  answer: string;
  intent: Intent;
};

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFC").replace(/[?।!,]/g, " ").replace(/\s+/g, " ").trim();
}

function explicitHelp(input: string) {
  const value = normalize(input);
  return /^(help|मद्दत|सहायता|के गर्न सक्छौ|के गर्न सक्छ|what can you do)$/.test(value);
}

/**
 * Shared deterministic Patro engine.
 *
 * In floating mode unknown/open-ended prompts return null so Aafnai Bot can
 * fall through to the managed AI service. The full /tools/patro-bot page can
 * opt into the deterministic help reply instead.
 */
export async function answerPatroQuestion(
  input: string,
  appUrl: string,
  options: { helpFallback?: boolean } = {},
): Promise<PatroBotAnswer | null> {
  const intent = parseIntent(input);
  if (intent.type === "help" && !options.helpFallback && !explicitHelp(input)) return null;

  const today = todayNepal();
  if (intent.type === "today") await primePanchang(today);
  if (intent.type === "tomorrow") await primePanchang(addDays(today, 1));

  return {
    intent,
    answer: await reply(intent, {
      bs: bsAdapter,
      provider: panchangProvider,
      appUrl,
    }),
  };
}

export type LetterKind = 'leave' | 'recommendation' | 'office';
export type LetterFields = { recipient: string; name: string; subject: string; body: string; date: string };
export const LETTER_DEFAULTS: Record<LetterKind, { subject: string; prompt: string }> = {
  leave: { subject: 'बिदा सम्बन्धमा', prompt: 'बिदा चाहिने मिति, कारण र दिन लेख्नुहोस्।' },
  recommendation: { subject: 'सिफारिस सम्बन्धमा', prompt: 'कस्तो सिफारिस र कुन प्रयोजन हो स्पष्ट लेख्नुहोस्।' },
  office: { subject: 'कार्यालय अनुरोध', prompt: 'अनुरोध र आवश्यक विवरण लेख्नुहोस्।' },
};
export function applicationLetter(fields: LetterFields): string {
  return `मिति: ${fields.date}\n\nश्री ${fields.recipient.trim()},\n\nविषय: ${fields.subject.trim()}\n\nमहोदय/महोदया,\n${fields.body.trim()}\n\nधन्यवाद।\nनिवेदक: ${fields.name.trim()}`;
}

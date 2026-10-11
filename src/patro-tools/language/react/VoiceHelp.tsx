import { useState } from 'react';
import { voiceBrowserGuidance } from '../voice-guidance';
export function VoiceHelp({ unsupported, checked, browserFailure, language = 'ne-NP' }: {
  unsupported: boolean; checked: boolean; browserFailure?: string | null;
  serverAvailable?: boolean; language?: 'ne-NP' | 'en-US';
}) {
  const [copied, setCopied] = useState(false);
  if ((!unsupported || !checked) && !browserFailure) return null;
  const guidance = voiceBrowserGuidance(navigator.userAgent, location.href);
  const en = language === 'en-US';
  return <aside className="voice-browser-help" role="note">
    {unsupported ? <p>{en
      ? 'Live voice typing needs a compatible browser. Open this page in Chrome or Edge and allow the microphone.'
      : 'Live आवाज टाइपिङका लागि समर्थित ब्राउजर चाहिन्छ। Chrome वा Edge मा खोल्नुहोस् र माइक्रोफोन अनुमति दिनुहोस्।'}</p> : null}
    {guidance.ios ? <p>{en
      ? 'The iPhone browser may not support Web Speech recognition. Try keyboard Dictation in the editor using the iOS microphone key.'
      : 'iPhone ब्राउजरमा यो आवाज सेवा नचल्न सक्छ। नोटको पाठ बाकसमा iOS keyboard को माइक्रोफोनबाट पनि बोल्न सक्नुहुन्छ।'}</p> : null}
    {guidance.inApp ? <div>
      {guidance.chromeIntent ? <a href={guidance.chromeIntent}>{en ? 'Open in Chrome' : 'Chrome मा खोल्नुहोस्'}</a> : <p>{en ? 'Open in your regular browser.' : 'यो पृष्ठ सामान्य ब्राउजरमा खोल्नुहोस्।'}</p>}
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(guidance.copyUrl); setCopied(true); } catch { setCopied(false); } }}>{copied ? (en ? 'Link copied' : 'लिङ्क कपी भयो') : (en ? 'Copy link' : 'लिङ्क कपी गर्नुहोस्')}</button>
    </div> : null}
  </aside>;
}

import { useState } from 'react';
import { voiceBrowserGuidance } from '../voice-guidance';

export function VoiceHelp({ unsupported, checked, browserFailure, serverAvailable, language = 'ne-NP' }: {
  unsupported: boolean; checked: boolean; browserFailure?: string | null; serverAvailable: boolean; language?: 'ne-NP' | 'en-US';
}) {
  const [copied, setCopied] = useState(false);
  if ((!unsupported || !checked) && !browserFailure) return null;
  const guidance = voiceBrowserGuidance(navigator.userAgent, location.href);
  const en = language === 'en-US';
  return <aside className="voice-browser-help" role="note">
    {unsupported ? <p>{en ? 'Voice typing is unavailable here. Try Chrome or Edge, or try again when the server speech service is available.' : 'यहाँ आवाज टाइपिङ उपलब्ध छैन। Chrome वा Edge मा खोल्नुहोस्, वा server आवाज सेवा उपलब्ध भएपछि फेरि प्रयास गर्नुहोस्।'}</p> : null}
    {guidance.ios ? <p>{en ? 'For live dictation, enable Settings → General → Keyboard → Enable Dictation and check Siri settings.' : 'Live dictation का लागि Settings → General → Keyboard → Enable Dictation र Siri settings जाँच्नुहोस्।'} {serverAvailable ? (en ? 'Server recording is also available in the engine selector.' : 'पहिचान विधिमा Server recording पनि उपलब्ध छ।') : ''}</p> : null}
    {guidance.inApp ? <div>
      {guidance.chromeIntent ? <a href={guidance.chromeIntent}>{en ? 'Open in Chrome' : 'Chrome मा खोल्नुहोस्'}</a> : <p>{en ? 'Use the browser menu to open this page in your regular browser.' : 'यो पृष्ठ सामान्य ब्राउजरमा खोल्न एपको browser menu प्रयोग गर्नुहोस्।'}</p>}
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(guidance.copyUrl); setCopied(true); } catch { setCopied(false); } }}>{copied ? (en ? 'Link copied' : 'लिङ्क कपी भयो') : (en ? 'Copy link' : 'लिङ्क कपी गर्नुहोस्')}</button>
    </div> : null}
  </aside>;
}

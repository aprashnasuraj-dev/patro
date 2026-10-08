export function speechError(language: 'ne-NP' | 'en-US', code: string) {
  const messages: Record<string, [string, string]> = {
    'not-allowed': ['माइक्रोफोन अनुमति दिनुहोस्।', 'Please allow microphone access.'],
    'service-not-allowed': ['यो ब्राउजरको आवाज सेवा उपलब्ध छैन। iPhone मा Siri Dictation जाँच्नुहोस् वा server mode प्रयोग गर्नुहोस्।', 'Browser dictation is unavailable. On iPhone, check Siri Dictation or use server mode.'],
    'no-speech': ['आवाज सुनिएन। फेरि प्रयास गर्नुहोस्।', 'No speech was detected. Please try again.'],
    'audio-capture': ['माइक्रोफोन भेटिएन वा अर्को एपले प्रयोग गरिरहेको छ।', 'No microphone is available, or another app is using it.'],
    'network': ['ब्राउजरको आवाज सेवामा जडान भएन। Server mode प्रयास गर्नुहोस्।', 'Could not reach browser speech recognition. Try server mode.'],
    'language-not-supported': ['यो आवाज सेवाले छानिएको भाषा समर्थन गर्दैन। Server mode प्रयास गर्नुहोस्।', 'This speech service does not support the selected language. Try server mode.'],
  };
  return messages[code]?.[language === 'en-US' ? 1 : 0] || (language === 'en-US' ? `Speech recognition error: ${code}` : `आवाज पहिचान त्रुटि: ${code}`);
}
export function voiceBrowserGuidance(userAgent: string, pageUrl: string) {
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|Viber/i.test(userAgent);
  const android = /Android/i.test(userAgent);
  const ios = /iPhone|iPad|iPod/i.test(userAgent);
  const url = new URL(pageUrl); url.search = ''; url.hash = '';
  return { inApp, ios, copyUrl: url.href,
    chromeIntent: inApp && android && /https?:/.test(url.protocol)
      ? `intent://${url.host}${url.pathname}#Intent;scheme=${url.protocol.slice(0, -1)};package=com.android.chrome;end` : null };
}

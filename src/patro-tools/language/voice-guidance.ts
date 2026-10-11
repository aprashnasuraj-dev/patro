export function speechError(language: 'ne-NP' | 'en-US', code: string) {
  const messages: Record<string, [string, string]> = {
    'unsupported': ['यो ब्राउजरमा Live Browser recognition छैन। Chrome वा Edge मा खोल्नुहोस्।', 'Live Browser recognition is unavailable here. Try Chrome or Edge.'],
    'not-allowed': ['ब्राउजरको Site settings मा माइक्रोफोन अनुमति दिनुहोस्।', 'Allow microphone access in browser site settings.'],
    'service-not-allowed': ['ब्राउजर आवाज सेवा उपलब्ध छैन। iPhone मा Siri/Keyboard Dictation जाँच्नुहोस्।', 'Browser dictation is unavailable. On iPhone check Siri/keyboard Dictation.'],
    'no-speech': ['आवाज सुनिएन। माइक्रोफोन जाँचेर फेरि प्रयास गर्नुहोस्।', 'No speech detected. Check your microphone and retry.'],
    'audio-capture': ['माइक्रोफोन भेटिएन वा अर्को एपले प्रयोग गरिरहेको छ।', 'Microphone unavailable or already in use.'],
    'network': ['ब्राउजरको आवाज सेवामा जडान भएन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।', 'Browser speech recognition connection failed. Check connectivity.'],
    'language-not-supported': ['यो ब्राउजरले छानिएको भाषा चिन्दैन। अर्को ब्राउजर प्रयोग गर्नुहोस्।', 'This browser cannot recognize that language. Try another browser.'],
    'audio-start-timeout': ['माइक्रोफोन सुरु हुन सकेन। अनुमति र जडान जाँच्नुहोस्।', 'Microphone did not start. Check permissions and connectivity.'],
    'restart-failed': ['आवाज सेवा फेरि सुरु हुन सकेन। माइक्रोफोन पुनः थिच्नुहोस्।', 'Speech recognition could not restart. Tap the microphone again.'],
    'session-limit': ['१० मिनेट पूरा भयो। तयार पाठ राखेर पुनः सुरु गर्नुहोस्।', '10-minute session ended. Keep the text and start again.'],
    'start-failed': ['आवाज सेवा सुरु भएन। Chrome/Edge वा अर्को माइक्रोफोन प्रयोग गर्नुहोस्।', 'Speech recognition could not start. Try Chrome/Edge or another microphone.'],
  };
  return messages[code]?.[language === 'en-US' ? 1 : 0] || (language === 'en-US' ? 'Browser speech recognition failed. Retry.' : 'ब्राउजरको आवाज पहिचान असफल भयो। फेरि प्रयास गर्नुहोस्।');
}
export function voiceBrowserGuidance(userAgent: string, pageUrl: string) {
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|Viber|ChatGPT\/|;\s*wv\b/i.test(userAgent);
  const android = /Android/i.test(userAgent);
  const ios = /iPhone|iPad|iPod/i.test(userAgent);
  const url = new URL(pageUrl); url.search = ''; url.hash = '';
  return { inApp, ios, copyUrl: url.href,
    chromeIntent: inApp && android && /https?:/.test(url.protocol)
      ? `intent://${url.host}${url.pathname}#Intent;scheme=${url.protocol.slice(0, -1)};package=com.android.chrome;end` : null };
}

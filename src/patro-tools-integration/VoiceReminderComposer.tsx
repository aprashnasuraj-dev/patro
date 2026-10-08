import { useEffect, useRef, useState } from 'react';
import { InlineDictationPreview, useDictationEditor } from '../patro-tools/language/react/DictationEditor';
import { useNepaliDictation } from '../patro-tools/language/react/useNepaliDictation';
import { VoiceHelp } from '../patro-tools/language/react/VoiceHelp';
import { parseVoiceReminder, type VoiceReminderDraft } from '../patro-tools/language/voice-reminder';
import { bsAdapter } from './bsAdapter';
import { updateLife } from './storage';
import { tithiAlarmUtc } from '../tithiAlarm';

function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function downloadReminder(draft: VoiceReminderDraft) {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\r?\n/g, '\\n');
  const instant = tithiAlarmUtc(draft.date, draft.time, 0);
  const content = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Aafnai Patro//Voice Reminder//NE','BEGIN:VEVENT',`UID:${crypto.randomUUID()}@aafnaipatro.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,`DTSTART:${instant}`,`SUMMARY:${escape(draft.title)}`,
    'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape(draft.title)}`,'TRIGGER:PT0S','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'aafnai-voice-reminder.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function VoiceReminderComposer({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<VoiceReminderDraft | null>(null);
  const [saved, setSaved] = useState<VoiceReminderDraft | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const insertFinal = useDictationEditor(text, setText, textarea);
  const dictation = useNepaliDictation({ onFinal: insertFinal });
  useEffect(() => { if (draft && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [draft]);

  function review() {
    const date = today(); const [year, month, day] = date.split('-').map(Number);
    const parsed = parseVoiceReminder(text, { today: date, bsYear: bsAdapter.toBS({ year, month, day }).year,
      toAD(y, m, d) { const ad = bsAdapter.toAD({ year: y, month: m, day: d }); return `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`; } });
    if (!parsed) { setStatus('मिति र शीर्षक स्पष्ट भएन। उदाहरण हेरेर पाठ मिलाउनुहोस्।'); return; }
    setStatus(''); setDraft(parsed);
  }
  async function confirm() {
    if (!draft || busy || !draft.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return;
    setBusy(true);
    try {
      const id = crypto.randomUUID(), updatedAt = Date.now();
      if (draft.kind === 'tithi') {
        const [{ archiveDay }, { dayPanchang }, { KATHMANDU }] = await Promise.all([import('./staticCalendar'), import('../patro-tools/core/astro'), import('../patro-tools/core/types')]);
        const row = await archiveDay(draft.date); const p = dayPanchang(draft.date, KATHMANDU, 'purnimanta');
        const number = Number(row.panchang.tithi.number); const paksha = /^k/i.test(row.panchang.tithi.paksha) ? 'krishna' as const : 'shukla' as const;
        if (!Number.isInteger(number) || number < 1 || number > 30) throw Error('अभिलेखको तिथि पक्का गर्न सकिएन।');
        const tithi = number > 15 ? number - 15 : number;
        const kind = draft.eventKind || 'custom';
        updateLife(life => ({ ...life, tithiEvents: [...life.tithiEvents, { id, updatedAt, kind, title: draft.title.trim(), sourceDate: draft.date,
          rule: { month: p.monthIndex, paksha, tithi, observance: kind === 'shraddha' ? 'aparahna' : 'udaya', system: 'purnimanta', adhik: 'nija' }, remindAt: draft.time, remindDaysBefore: [1, 0] }] }));
      } else updateLife(life => ({ ...life, due: [...life.due, { id, title: draft.title.trim(), date: draft.date, remindAt: draft.time, timezone: 'Asia/Kathmandu', updatedAt }] }));
      setSaved(draft); setDraft(null); setStatus('मिति र समय यस उपकरणमा सुरक्षित भयो। Calendar सूचना चाहिँ ICS import गरेपछि आउँछ।'); onSaved();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'सुरक्षित भएन; फेरि प्रयास गर्नुहोस्।'); }
    finally { setBusy(false); }
  }
  return <section className="patro-tool-card voice-reminder-composer">
    <h2>बोलेर सम्झना · Voice reminder</h2><p>“भोलि बिहान ७ बजे औषधि” वा “असोज २५ गते आमाको तिथि” भन्नुहोस्। बचत गर्नुअघि मिति, मूल वर्ष र समय पक्का गर्नुहोस्।</p>
    <button type="button" className="tool-secondary-button" onClick={() => dictation.listening ? dictation.stop() : void dictation.start()} disabled={dictation.mode === 'unsupported' || (dictation.processing && !dictation.listening)}>{dictation.listening ? '■ रोक्नुहोस्' : '🎙 सम्झना बोल्नुहोस्'}</button>
    <label className="tool-block-label">बोलेको/लेखेको पाठ<textarea ref={textarea} value={text} onChange={event => setText(event.target.value)} rows={3}/><InlineDictationPreview textarea={textarea} interim={dictation.interim}/></label>
    {dictation.error ? <p role="alert">{dictation.error}</p> : null}
    <VoiceHelp unsupported={dictation.mode === 'unsupported'} checked={dictation.capabilitiesChecked} browserFailure={dictation.browserFailure} serverAvailable={dictation.serverAvailable}/>
    <button type="button" className="tool-primary-button" onClick={review} disabled={!text.trim() || dictation.listening || dictation.processing}>सम्झना जाँच्नुहोस्</button>
    {status ? <p role="status">{status}</p> : null}
    {saved?.kind === 'reminder' ? <button type="button" onClick={() => downloadReminder(saved)}>सूचनाका लागि Calendar फाइल डाउनलोड</button> : null}
    {draft ? <dialog ref={dialog} aria-labelledby="voice-reminder-title" onCancel={event => { event.preventDefault(); if (!busy) setDraft(null); }}>
      <h3 id="voice-reminder-title">सम्झना पक्का गर्नुहोस् · Confirm reminder</h3>
      <p>समय Asia/Kathmandu (NPT) मा हो। पुष्टि नगरी केही सुरक्षित हुँदैन।</p>
      {draft.warnings.map(warning => <p key={warning}>{warning}</p>)}
      <label>शीर्षक<input value={draft.title} maxLength={100} onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
      <label>AD मूल मिति<input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })}/></label>
      <label>समय<input type="time" value={draft.time} onChange={event => setDraft({ ...draft, time: event.target.value })}/></label>
      <label>प्रकार<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as VoiceReminderDraft['kind'] })}><option value="reminder">मिति सम्झना</option><option value="tithi">मूल मितिबाट तिथि सम्झना</option></select></label>
      {draft.kind === 'tithi' ? <label>तिथि प्रकार<select value={draft.eventKind || 'custom'} onChange={event => setDraft({ ...draft, eventKind: event.target.value as VoiceReminderDraft['eventKind'] })}><option value="custom">अन्य</option><option value="shraddha">श्राद्ध</option><option value="tithi_birthday">तिथि जन्मदिन</option><option value="puja">पूजा</option><option value="vrata">व्रत</option></select></label> : null}
      <button type="button" onClick={() => void confirm()} disabled={busy || !draft.title.trim() || !draft.date}>{busy ? 'सुरक्षित हुँदैछ…' : 'पक्का गरी सुरक्षित गर्नुहोस्'}</button>
      <button type="button" onClick={() => setDraft(null)} disabled={busy}>रद्द गर्नुहोस्</button>
    </dialog> : null}
    <p className="tool-muted">यो जानकारी स्थानीय जीवन-सूचीमा रहन्छ। खाता sync सुरु गर्नुअघि पुरानै account/sync विकल्प हेर्नुहोस्।</p>
  </section>;
}

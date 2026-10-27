/** Shared bilingual disclaimers for imported tool previews and eventual release pages. */
const rules=[
['tax',/\b(tax|vat|gst|1099(?:-?k)?|irs|payroll|withholding|tariff|customs|duty|excise)\b/i,
'Estimate only; not tax or legal advice. Tax rules, thresholds, filing requirements and rates can change by jurisdiction and tax year. Confirm current official guidance before filing or paying.',
'यो अनुमान मात्र हो, कर वा कानुनी सल्लाह होइन। करका नियम, सीमा र दर देश, क्षेत्र र कर वर्षअनुसार परिवर्तन हुन सक्छन्। विवरण पेश गर्नु वा कर बुझाउनुअघि हालको आधिकारिक जानकारी पुष्टि गर्नुहोस्।'],
['regulatory',/\b(legal|law|compliance|regulation|eligibility|immigration|visa|labou?r|copyright|licen[sc]e|permit|contract|invoice|surcharge|wage)\b/i,
'Information and planning only; not legal advice. Applicable rules, documentation and effective dates vary by jurisdiction and can change. Verify current official requirements with the responsible authority or qualified adviser.',
'यो सूचना तथा योजना बनाउन प्रयोग हुने साधन हो, कानुनी सल्लाह होइन। लागू नियम, कागजात र प्रभावकारी मिति क्षेत्रअनुसार फरक पर्न र परिवर्तन हुन सक्छ। आधिकारिक निकाय वा योग्य सल्लाहकारबाट पुष्टि गर्नुहोस्।'],
['finance',/\b(loan|apr|mortgage|insurance|interest.rate|credit.card|debt|investment|refinance|pension)\b/i,
'Illustrative calculation only; not financial, investment or legal advice. Rates, fees and eligibility vary and can change. Check the current terms of your provider.',
'यो उदाहरणात्मक गणना मात्र हो, वित्तीय, लगानी वा कानुनी सल्लाह होइन। दर, शुल्क र योग्यता सम्बन्धी नियम परिवर्तन हुन सक्छन्। आफ्नो प्रदायकको हालको विवरणसँग रुजु गर्नुहोस्।'],
['health',/\b(medical|clinical|dosage|pregnancy|diagnosis|drug|medicine|patient|disease)\b/i,
'Educational estimate only; not medical diagnosis or treatment advice. Confirm current clinical references with a qualified clinician.',
'यो शैक्षिक अनुमान मात्र हो, चिकित्सकीय निदान वा उपचार सल्लाह होइन। योग्य चिकित्सकसँग हालका सन्दर्भमान पुष्टि गर्नुहोस्।']
];
export function policyFor(tool){const s=[tool?.title,tool?.topic_group].filter(Boolean).join(' ');return rules.filter(x=>x[1].test(s)).map(x=>({kind:x[0],en:x[2],ne:x[3]}));}
export function policyHtml(tool){const rules=policyFor(tool);if(!rules.length)return '';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
return '<aside role="note" data-mm530-policy="'+rules.map(x=>x.kind).join(' ')+'" aria-label="Important limitations" style="margin:1rem 0;padding:1rem;border:1px solid #a57828;background:#fff8e8;color:#32250f"><strong>Important / महत्त्वपूर्ण</strong>'+rules.map(x=>'<p lang="en">'+esc(x.en)+'</p><p lang="ne">'+esc(x.ne)+'</p>').join('')+'</aside>';}

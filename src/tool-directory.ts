type Tool={title:string;desc:string;href:string;badge?:string};
export const HUB_COPY:Record<string,{titleNe:string;titleEn:string;descriptionNe:string;descriptionEn:string}> = {
 "/panchang": {titleNe:"दैनिक पञ्चाङ्ग",titleEn:"Daily Panchang",descriptionNe:"तिथि, नक्षत्र, योग, करण र स्थानीय दिनका समयखण्ड।",descriptionEn:"Tithi, Nakshatra, Yoga, Karana and local daily time windows."},
 "/muhurat": {titleNe:"शुभ साइत र मुहूर्त",titleEn:"Auspicious Timing",descriptionNe:"परम्परागत समयखण्ड र स्रोत-पुष्टि भएका साइत नियम।",descriptionEn:"Traditional time windows and source-verified Sait rules."},
 "/jyotish": {titleNe:"ज्योतिष गणक",titleEn:"Jyotish Calculators",descriptionNe:"जन्मपत्रो, राशि, नक्षत्र, लग्न र परम्परागत गणना।",descriptionEn:"Birth chart, Rashi, Nakshatra, Lagna and traditional calculations."},
 "/planets": {titleNe:"ग्रह र खगोलीय घटना",titleEn:"Planets & Astronomy",descriptionNe:"ग्रहस्थिति, राशि प्रवेश, गोचर र खगोलीय घटना।",descriptionEn:"Planet positions, sign ingresses, transits and sky events."},
 "/nepal-calendar": {titleNe:"नेपाली संवत् र परम्परा",titleEn:"Nepal Calendars & Traditions",descriptionNe:"वि.सं., नेपाल संवत्, समुदाय पात्रो र क्षेत्रीय परम्परा।",descriptionEn:"Bikram Sambat, Nepal Sambat, community calendars and regional traditions."}
};
export const TOOL_EN:Record<string,{title:string;desc:string}> = {
 "/tools/astro":{title:"Astronomy calendar",desc:"Explore the Moon, sky events and astronomical dates."},
 "/convert":{title:"BS ↔ AD date converter",desc:"Convert Nepali Bikram Sambat and Gregorian dates in either direction."},
 "/tools/bstoad":{title:"BS to AD converter",desc:"Convert a Bikram Sambat date to a Gregorian date."},
 "/tools/adtobs":{title:"AD to BS converter",desc:"Convert a Gregorian date to Bikram Sambat."},
 "/tools/calc":{title:"Date calculator",desc:"Count days between two dates or add/subtract days."},
 "/tools/age":{title:"Age calculator",desc:"Calculate age in years, months and days."},
 "/tools/tithi-reminder":{title:"Tithi reminders",desc:"Find upcoming Tithi, Shraddha and lunar-birthday reminders."},
 "/time-machine":{title:"Time Machine",desc:"Explore Nepal's historical timeline."},
 "/on-this-day":{title:"On This Day",desc:"Browse sourced historical events for a selected date."},
 "/tools/clock":{title:"World clock",desc:"Compare local time in Nepal and major cities."},
 "/mytime":{title:"My Time",desc:"Open the existing personal time dashboard."},
 "/tools/nepali-typing":{title:"Nepali typing",desc:"Type Unicode Nepali from Roman letters."},
 "/tools/preeti-converter":{title:"Preeti converter",desc:"Convert Preeti and Unicode text in both directions."},
 "/tool/nepalidictionary":{title:"Nepali dictionary",desc:"Look up Nepali words, English meanings and pronunciation."},
 "/tools/spell-check":{title:"Nepali spell check",desc:"Check Nepali spelling and review suggested corrections."},
 "/tools/voice-typing":{title:"Voice typing",desc:"Turn speech into editable Nepali text where supported."},
 "/tools/ocr":{title:"Nepali OCR",desc:"Extract Nepali text from an image in the browser."},
 "/tools/read-aloud":{title:"Read aloud",desc:"Listen to Nepali text with available browser voices."},
 "/tools/words":{title:"Amount in words",desc:"Write amounts in Nepali or English lakh/crore wording."},
 "/rashifal":{title:"Rashifal",desc:"Open the existing daily Vedic horoscope."},
 "/jyotish/china":{title:"JanmaPatro birth chart",desc:"Use birth date, time and place to calculate the existing natal chart."},
 "/tools/sait":{title:"Sait · Auspicious timing",desc:"Explore current Sait rules and published-date references."},
 "/tools/baby-names":{title:"Nakshatra baby names",desc:"Explore name suggestions based on Nakshatra and Pada."},
 "/tools/name-check":{title:"Name check",desc:"Compare name spelling and starting-syllable conventions."},
 "/tools/forex":{title:"Foreign exchange rates",desc:"Review Nepal Rastra Bank exchange rates."},
 "/tools/gold":{title:"Gold and silver calculator",desc:"Estimate jewellery value from weight and a rate you enter."},
 "/tools/emi":{title:"Loan EMI calculator",desc:"Calculate monthly instalments and total interest."},
 "/tools/vat":{title:"VAT and percentage",desc:"Calculate VAT, percentages and price changes."},
 "/tools/incometax":{title:"Income tax estimate",desc:"Estimate personal salary tax for the supported fiscal year."},
 "/tools/landconverter":{title:"Nepali land converter",desc:"Convert Ropani–Aana and Bigha–Kattha measurements."},
 "/tools/units":{title:"Traditional Nepali units",desc:"Convert traditional Nepali units of measurement."},
 "/tools/fuelprice":{title:"Fuel prices",desc:"Review Nepal Oil Corporation fuel-price references."},
 "/tools/nepaliqr":{title:"Nepali QR generator",desc:"Create a private QR code from Nepali or English text."},
 "/tools/janmadin-akhbar":{title:"Birthday newspaper",desc:"Create a share card from a birthday, calendar and history."},
 "/tools/future-letter":{title:"Future letter",desc:"Write a private letter to open on a selected date or Tithi."},
 "/tools/patro-bot":{title:"Patro Bot",desc:"Ask short questions about dates, Tithi and the calendar."}
};
export const HUB_GROUP_TITLE:Record<string,string> = {
 "मिति र पात्रो":"Dates & Calendars","भाषा र लेखन":"Language & Writing","ज्योतिष र संस्कार":"Jyotish & Rituals",
 "पैसा र कर":"Money & tax","नाप र दैनिक उपयोग":"Measures & everyday tasks","सिर्जना र सहायक":"Create & Assist"
};
export const toolGroups:{name:string;items:Tool[]}[]=[
 {name:"मिति र पात्रो",items:[
  {title:"खगोलीय पात्रो",desc:"चन्द्रमा, आकाशका घटना र खगोलीय मिति",href:"/tools/astro"},
  {title:"मिति रूपान्तरण",desc:"वि.सं. र ई.सं. मिति दुवैतर्फ रूपान्तरण",href:"/convert"},
  {title:"वि.सं. बाट ई.सं.",desc:"बिक्रम संवत् मितिलाई ई.सं. मा बदल्नुहोस्",href:"/tools/bstoad"},
  {title:"ई.सं. बाट वि.सं.",desc:"ई.सं. मितिलाई बिक्रम संवत् मा बदल्नुहोस्",href:"/tools/adtobs"},
  {title:"दिन गणना",desc:"दुई मितिबीचका दिन वा मितिमा दिन थपघट",href:"/tools/calc"},
  {title:"उमेर गणक",desc:"वर्ष, महिना र दिनसहित उमेर गणना",href:"/tools/age"},
  {title:"तिथि रिमाइन्डर",desc:"तिथि, श्राद्ध र जन्मदिनका आगामी मिति",href:"/tools/tithi-reminder"},
  {title:"समययन्त्र",desc:"नेपालको ऐतिहासिक समयरेखा अन्वेषण",href:"/time-machine"},
  {title:"आज इतिहासमा",desc:"चयन गरिएको मितिका ऐतिहासिक घटना",href:"/on-this-day"},
  {title:"विश्व घडी",desc:"नेपालसहित विश्वका शहरहरूको समय",href:"/tools/clock"},
  {title:"मेरो समय",desc:"स्थानीय समय, पञ्चाङ्ग, आकाश र व्यक्तिगत समय सन्दर्भ",href:"/mytime",badge:"नयाँ"}
 ]},
 {name:"भाषा र लेखन",items:[
  {title:"नेपाली टाइपिङ",desc:"रोमन अक्षरबाट नेपाली युनिकोड टाइपिङ",href:"/tools/nepali-typing"},
  {title:"प्रीति रूपान्तरण",desc:"प्रीति र युनिकोडबीच दुवैतर्फ रूपान्तरण",href:"/tools/preeti-converter"},
  {title:"नेपाली शब्दकोश",desc:"४९ हजार शब्द, अङ्ग्रेजी अर्थ, उच्चारण, क्विज र शब्द अभ्यास",href:"/tool/nepalidictionary",badge:"नयाँ"},
  {title:"नेपाली हिज्जे जाँच",desc:"नेपाली पाठको हिज्जे जाँच र सुझाव",href:"/tools/spell-check"},
  {title:"बोली टाइपिङ",desc:"बोलेर नेपाली पाठ लेख्नुहोस्",href:"/tools/voice-typing"},
  {title:"नेपाली OCR",desc:"तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्",href:"/tools/ocr"},
  {title:"पढेर सुनाउने",desc:"नेपाली पाठ आवाजमा सुन्नुहोस्",href:"/tools/read-aloud"},
  {title:"अंकलाई शब्दमा",desc:"रकमलाई नेपाली वा अङ्ग्रेजी शब्दमा",href:"/tools/words"}
 ]},
 {name:"ज्योतिष र संस्कार",items:[
  {title:"राशिफल",desc:"दैनिक वैदिक राशिफल",href:"/rashifal"},
  {title:"जन्मपत्रो",desc:"जन्ममिति, समय र स्थानका आधारमा जन्मपत्रिका",href:"/jyotish/china"},
  {title:"साइत",desc:"परम्परागत नियम र उपलब्ध आधिकारिक मितिसहित शुभ समय",href:"/tools/sait"},
  {title:"नक्षत्र अनुसार बच्चाको नाम",desc:"नक्षत्र र पदका आधारमा नाम सुझाव",href:"/tools/baby-names"},
  {title:"नाम जाँच",desc:"नामको सुरु अक्षर र नक्षत्र मिलान",href:"/tools/name-check"}
 ]},
 {name:"पैसा र कर",items:[
  {title:"विदेशी मुद्रा",desc:"नेपाल राष्ट्र बैंकका विनिमय दर",href:"/tools/forex"},
  {title:"सुनचाँदी हिसाब",desc:"तौल र तपाईंले राखेको दरका आधारमा मूल्य अनुमान",href:"/tools/gold"},
  {title:"कर्जा EMI",desc:"मासिक किस्ता र कुल ब्याज गणना",href:"/tools/emi"},
  {title:"भ्याट र प्रतिशत",desc:"भ्याट थपघट र प्रतिशत गणना",href:"/tools/vat"},
  {title:"आयकर",desc:"आ.व. २०८३/८४ को व्यक्तिगत आयकर अनुमान",href:"/tools/incometax"},
 ]},
 {name:"नाप र दैनिक उपयोग",items:[
  {title:"जग्गा नाप",desc:"रोपनी–आना र बिघा–कट्ठा रूपान्तरण",href:"/tools/landconverter"},
  {title:"नाप–तौल",desc:"परम्परागत नेपाली एकाइ रूपान्तरण",href:"/tools/units"},
  {title:"इन्धन मूल्य",desc:"नेपाल आयल निगमका पेट्रोलियम मूल्य",href:"/tools/fuelprice"},
  {title:"QR कोड",desc:"नेपाली वा अङ्ग्रेजी पाठबाट निजी QR",href:"/tools/nepaliqr"}
 ]},
 {name:"सिर्जना र सहायक",items:[
  {title:"जन्मदिन अखबार",desc:"जन्मदिनको पात्रो र इतिहासबाट शेयर कार्ड",href:"/tools/janmadin-akhbar"},
  {title:"भविष्यको चिठी",desc:"छानिएको मिति वा तिथिमा खुल्ने निजी चिठी",href:"/tools/future-letter"},
  {title:"पात्रो बोट",desc:"मिति, तिथि र पात्रोका छोटा प्रश्नको सहायक",href:"/tools/patro-bot"}
 ]}
];

export const PUBLIC_TOOL_COUNT = new Set(toolGroups.flatMap(group => group.items.map(item => item.href))).size;

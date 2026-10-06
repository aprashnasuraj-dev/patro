// Bilingual (English / Nepali) reference tables for Jyotish calculations.

export const PLANETS = {
  Sun:     { en: 'Sun',     ne: 'सूर्य',    short: { en: 'Su', ne: 'सू' }, sa: 'रवि' },
  Moon:    { en: 'Moon',    ne: 'चन्द्र',   short: { en: 'Mo', ne: 'चं' }, sa: 'सोम' },
  Mars:    { en: 'Mars',    ne: 'मङ्गल',   short: { en: 'Ma', ne: 'मं' }, sa: 'भौम' },
  Mercury: { en: 'Mercury', ne: 'बुध',      short: { en: 'Me', ne: 'बु' }, sa: 'बुध' },
  Jupiter: { en: 'Jupiter', ne: 'बृहस्पति', short: { en: 'Ju', ne: 'गु' }, sa: 'गुरु' },
  Venus:   { en: 'Venus',   ne: 'शुक्र',    short: { en: 'Ve', ne: 'शु' }, sa: 'शुक्र' },
  Saturn:  { en: 'Saturn',  ne: 'शनि',      short: { en: 'Sa', ne: 'श' },  sa: 'शनि' },
  Rahu:    { en: 'Rahu',    ne: 'राहु',     short: { en: 'Ra', ne: 'रा' }, sa: 'राहु' },
  Ketu:    { en: 'Ketu',    ne: 'केतु',     short: { en: 'Ke', ne: 'के' }, sa: 'केतु' },
};

export const RASHIS = [
  { en: 'Aries (Mesha)',        ne: 'मेष',     lord: 'Mars',    element: 'fire',  quality: 'movable' },
  { en: 'Taurus (Vrishabha)',   ne: 'वृष',     lord: 'Venus',   element: 'earth', quality: 'fixed' },
  { en: 'Gemini (Mithuna)',     ne: 'मिथुन',   lord: 'Mercury', element: 'air',   quality: 'dual' },
  { en: 'Cancer (Karka)',       ne: 'कर्कट',   lord: 'Moon',    element: 'water', quality: 'movable' },
  { en: 'Leo (Simha)',          ne: 'सिंह',    lord: 'Sun',     element: 'fire',  quality: 'fixed' },
  { en: 'Virgo (Kanya)',        ne: 'कन्या',   lord: 'Mercury', element: 'earth', quality: 'dual' },
  { en: 'Libra (Tula)',         ne: 'तुला',    lord: 'Venus',   element: 'air',   quality: 'movable' },
  { en: 'Scorpio (Vrishchika)', ne: 'वृश्चिक', lord: 'Mars',    element: 'water', quality: 'fixed' },
  { en: 'Sagittarius (Dhanu)',  ne: 'धनु',     lord: 'Jupiter', element: 'fire',  quality: 'dual' },
  { en: 'Capricorn (Makara)',   ne: 'मकर',     lord: 'Saturn',  element: 'earth', quality: 'movable' },
  { en: 'Aquarius (Kumbha)',    ne: 'कुम्भ',   lord: 'Saturn',  element: 'air',   quality: 'fixed' },
  { en: 'Pisces (Meena)',       ne: 'मीन',     lord: 'Jupiter', element: 'water', quality: 'dual' },
];

export const ELEMENTS = { fire: { en: 'Fire', ne: 'अग्नि' }, earth: { en: 'Earth', ne: 'पृथ्वी' }, air: { en: 'Air', ne: 'वायु' }, water: { en: 'Water', ne: 'जल' } };
export const QUALITIES = { movable: { en: 'Movable (Chara)', ne: 'चर' }, fixed: { en: 'Fixed (Sthira)', ne: 'स्थिर' }, dual: { en: 'Dual (Dwiswabhava)', ne: 'द्विस्वभाव' } };

export const NAKSHATRAS = [
  { en: 'Ashwini', ne: 'अश्विनी', lord: 'Ketu', gana: 0, yoni: [0, 'M'], nadi: 0, deity: { en: 'Ashwini Kumaras', ne: 'अश्विनीकुमार' }, syl: ['चु', 'चे', 'चो', 'ला'] },
  { en: 'Bharani', ne: 'भरणी', lord: 'Venus', gana: 1, yoni: [1, 'M'], nadi: 1, deity: { en: 'Yama', ne: 'यम' }, syl: ['ली', 'लू', 'ले', 'लो'] },
  { en: 'Krittika', ne: 'कृत्तिका', lord: 'Sun', gana: 2, yoni: [2, 'F'], nadi: 2, deity: { en: 'Agni', ne: 'अग्नि' }, syl: ['अ', 'इ', 'उ', 'ए'] },
  { en: 'Rohini', ne: 'रोहिणी', lord: 'Moon', gana: 1, yoni: [3, 'M'], nadi: 2, deity: { en: 'Brahma', ne: 'ब्रह्मा' }, syl: ['ओ', 'वा', 'वी', 'वु'] },
  { en: 'Mrigashira', ne: 'मृगशिरा', lord: 'Mars', gana: 0, yoni: [3, 'F'], nadi: 1, deity: { en: 'Soma', ne: 'सोम' }, syl: ['वे', 'वो', 'का', 'की'] },
  { en: 'Ardra', ne: 'आर्द्रा', lord: 'Rahu', gana: 1, yoni: [4, 'F'], nadi: 0, deity: { en: 'Rudra', ne: 'रुद्र' }, syl: ['कु', 'घ', 'ङ', 'छ'] },
  { en: 'Punarvasu', ne: 'पुनर्वसु', lord: 'Jupiter', gana: 0, yoni: [5, 'F'], nadi: 0, deity: { en: 'Aditi', ne: 'अदिति' }, syl: ['के', 'को', 'हा', 'ही'] },
  { en: 'Pushya', ne: 'पुष्य', lord: 'Saturn', gana: 0, yoni: [2, 'M'], nadi: 1, deity: { en: 'Brihaspati', ne: 'बृहस्पति' }, syl: ['हु', 'हे', 'हो', 'डा'] },
  { en: 'Ashlesha', ne: 'आश्लेषा', lord: 'Mercury', gana: 2, yoni: [5, 'M'], nadi: 2, deity: { en: 'Nagas', ne: 'सर्प' }, syl: ['डी', 'डू', 'डे', 'डो'] },
  { en: 'Magha', ne: 'मघा', lord: 'Ketu', gana: 2, yoni: [6, 'M'], nadi: 2, deity: { en: 'Pitris', ne: 'पितृ' }, syl: ['मा', 'मी', 'मू', 'मे'] },
  { en: 'Purva Phalguni', ne: 'पूर्वाफाल्गुनी', lord: 'Venus', gana: 1, yoni: [6, 'F'], nadi: 1, deity: { en: 'Bhaga', ne: 'भग' }, syl: ['मो', 'टा', 'टी', 'टू'] },
  { en: 'Uttara Phalguni', ne: 'उत्तराफाल्गुनी', lord: 'Sun', gana: 1, yoni: [7, 'M'], nadi: 0, deity: { en: 'Aryaman', ne: 'अर्यमा' }, syl: ['टे', 'टो', 'पा', 'पी'] },
  { en: 'Hasta', ne: 'हस्त', lord: 'Moon', gana: 0, yoni: [8, 'F'], nadi: 0, deity: { en: 'Savitr', ne: 'सविता' }, syl: ['पू', 'ष', 'ण', 'ठ'] },
  { en: 'Chitra', ne: 'चित्रा', lord: 'Mars', gana: 2, yoni: [9, 'F'], nadi: 1, deity: { en: 'Vishvakarma', ne: 'विश्वकर्मा' }, syl: ['पे', 'पो', 'रा', 'री'] },
  { en: 'Swati', ne: 'स्वाती', lord: 'Rahu', gana: 0, yoni: [8, 'M'], nadi: 2, deity: { en: 'Vayu', ne: 'वायु' }, syl: ['रू', 'रे', 'रो', 'ता'] },
  { en: 'Vishakha', ne: 'विशाखा', lord: 'Jupiter', gana: 2, yoni: [9, 'M'], nadi: 2, deity: { en: 'Indra-Agni', ne: 'इन्द्राग्नी' }, syl: ['ती', 'तू', 'ते', 'तो'] },
  { en: 'Anuradha', ne: 'अनुराधा', lord: 'Saturn', gana: 0, yoni: [10, 'F'], nadi: 1, deity: { en: 'Mitra', ne: 'मित्र' }, syl: ['ना', 'नी', 'नू', 'ने'] },
  { en: 'Jyeshtha', ne: 'ज्येष्ठा', lord: 'Mercury', gana: 2, yoni: [10, 'M'], nadi: 0, deity: { en: 'Indra', ne: 'इन्द्र' }, syl: ['नो', 'या', 'यी', 'यू'] },
  { en: 'Mula', ne: 'मूल', lord: 'Ketu', gana: 2, yoni: [4, 'M'], nadi: 0, deity: { en: 'Nirriti', ne: 'निरृति' }, syl: ['ये', 'यो', 'भा', 'भी'] },
  { en: 'Purva Ashadha', ne: 'पूर्वाषाढा', lord: 'Venus', gana: 1, yoni: [11, 'M'], nadi: 1, deity: { en: 'Apah', ne: 'जल' }, syl: ['भू', 'धा', 'फा', 'ढा'] },
  { en: 'Uttara Ashadha', ne: 'उत्तराषाढा', lord: 'Sun', gana: 1, yoni: [12, 'M'], nadi: 2, deity: { en: 'Vishvedevas', ne: 'विश्वेदेव' }, syl: ['भे', 'भो', 'जा', 'जी'] },
  { en: 'Shravana', ne: 'श्रवण', lord: 'Moon', gana: 0, yoni: [11, 'F'], nadi: 2, deity: { en: 'Vishnu', ne: 'विष्णु' }, syl: ['खी', 'खू', 'खे', 'खो'] },
  { en: 'Dhanishtha', ne: 'धनिष्ठा', lord: 'Mars', gana: 2, yoni: [13, 'F'], nadi: 1, deity: { en: 'Vasus', ne: 'वसु' }, syl: ['गा', 'गी', 'गू', 'गे'] },
  { en: 'Shatabhisha', ne: 'शतभिषा', lord: 'Rahu', gana: 2, yoni: [0, 'F'], nadi: 0, deity: { en: 'Varuna', ne: 'वरुण' }, syl: ['गो', 'सा', 'सी', 'सू'] },
  { en: 'Purva Bhadrapada', ne: 'पूर्वभाद्रपद', lord: 'Jupiter', gana: 1, yoni: [13, 'M'], nadi: 0, deity: { en: 'Aja Ekapada', ne: 'अजैकपाद' }, syl: ['से', 'सो', 'दा', 'दी'] },
  { en: 'Uttara Bhadrapada', ne: 'उत्तरभाद्रपद', lord: 'Saturn', gana: 1, yoni: [7, 'F'], nadi: 1, deity: { en: 'Ahir Budhnya', ne: 'अहिर्बुध्न्य' }, syl: ['दू', 'थ', 'झ', 'ञ'] },
  { en: 'Revati', ne: 'रेवती', lord: 'Mercury', gana: 0, yoni: [1, 'F'], nadi: 2, deity: { en: 'Pushan', ne: 'पूषा' }, syl: ['दे', 'दो', 'चा', 'ची'] },
];

export const GANAS = [{ en: 'Deva (divine)', ne: 'देव' },{ en: 'Manushya (human)', ne: 'मनुष्य' },{ en: 'Rakshasa (fierce)', ne: 'राक्षस' }];
export const NADIS = [{ en: 'Adi (Vata)', ne: 'आदि' },{ en: 'Madhya (Pitta)', ne: 'मध्य' },{ en: 'Antya (Kapha)', ne: 'अन्त्य' }];
export const YONIS = [{ en: 'Horse', ne: 'अश्व' }, { en: 'Elephant', ne: 'गज' }, { en: 'Sheep', ne: 'मेष' }, { en: 'Serpent', ne: 'सर्प' },{ en: 'Dog', ne: 'श्वान' }, { en: 'Cat', ne: 'मार्जार' }, { en: 'Rat', ne: 'मूषक' }, { en: 'Cow', ne: 'गौ' },{ en: 'Buffalo', ne: 'महिष' }, { en: 'Tiger', ne: 'व्याघ्र' }, { en: 'Deer', ne: 'मृग' }, { en: 'Monkey', ne: 'वानर' },{ en: 'Mongoose', ne: 'नकुल' }, { en: 'Lion', ne: 'सिंह' }];
export const VARNAS = [{ en: 'Brahmin', ne: 'ब्राह्मण' }, { en: 'Kshatriya', ne: 'क्षत्रिय' }, { en: 'Vaishya', ne: 'वैश्य' }, { en: 'Shudra', ne: 'शूद्र' }];
export const RASHI_VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0];
export const VASHYAS = [{ en: 'Chatushpada (quadruped)', ne: 'चतुष्पद' },{ en: 'Manava (human)', ne: 'मानव' },{ en: 'Jalachara (water)', ne: 'जलचर' },{ en: 'Vanachara (wild)', ne: 'वनचर' },{ en: 'Keeta (insect)', ne: 'कीट' }];
export function vashyaOf(moonLon){const r=Math.floor(moonLon/30),deg=moonLon-r*30;switch(r){case 0:case 1:return 0;case 2:case 5:case 6:case 10:return 1;case 3:case 11:return 2;case 4:return 3;case 7:return 4;case 8:return deg<15?1:0;case 9:return deg<15?0:2;}return 1;}
export const TITHIS=[{en:'Pratipada',ne:'प्रतिपदा'},{en:'Dwitiya',ne:'द्वितीया'},{en:'Tritiya',ne:'तृतीया'},{en:'Chaturthi',ne:'चतुर्थी'},{en:'Panchami',ne:'पञ्चमी'},{en:'Shashthi',ne:'षष्ठी'},{en:'Saptami',ne:'सप्तमी'},{en:'Ashtami',ne:'अष्टमी'},{en:'Navami',ne:'नवमी'},{en:'Dashami',ne:'दशमी'},{en:'Ekadashi',ne:'एकादशी'},{en:'Dwadashi',ne:'द्वादशी'},{en:'Trayodashi',ne:'त्रयोदशी'},{en:'Chaturdashi',ne:'चतुर्दशी'},{en:'Purnima',ne:'पूर्णिमा'}];
export const AMAVASYA={en:'Amavasya',ne:'औंसी (अमावस्या)'};export const PAKSHAS=[{en:'Shukla (waxing)',ne:'शुक्ल'},{en:'Krishna (waning)',ne:'कृष्ण'}];
export const YOGAS=['Vishkambha|विष्कम्भ','Priti|प्रीति','Ayushman|आयुष्मान्','Saubhagya|सौभाग्य','Shobhana|शोभन','Atiganda|अतिगण्ड','Sukarma|सुकर्मा','Dhriti|धृति','Shula|शूल','Ganda|गण्ड','Vriddhi|वृद्धि','Dhruva|ध्रुव','Vyaghata|व्याघात','Harshana|हर्षण','Vajra|वज्र','Siddhi|सिद्धि','Vyatipata|व्यतीपात','Variyan|वरीयान्','Parigha|परिघ','Shiva|शिव','Siddha|सिद्ध','Sadhya|साध्य','Shubha|शुभ','Shukla|शुक्ल','Brahma|ब्रह्म','Indra|ऐन्द्र','Vaidhriti|वैधृति'].map(s=>{const[en,ne]=s.split('|');return{en,ne}});
export const INAUSPICIOUS_YOGAS=new Set([0,5,8,9,12,14,16,18,26]);
export const KARANAS=['Bava|बव','Balava|बालव','Kaulava|कौलव','Taitila|तैतिल','Garaja|गर','Vanija|वणिज','Vishti (Bhadra)|विष्टि (भद्रा)','Shakuni|शकुनि','Chatushpada|चतुष्पद','Naga|नाग','Kimstughna|किंस्तुघ्न'].map(s=>{const[en,ne]=s.split('|');return{en,ne}});
export const VARAS=[{en:'Sunday',ne:'आइतबार',sa:'रविवासरे',lord:'Sun'},{en:'Monday',ne:'सोमबार',sa:'सोमवासरे',lord:'Moon'},{en:'Tuesday',ne:'मङ्गलबार',sa:'भौमवासरे',lord:'Mars'},{en:'Wednesday',ne:'बुधबार',sa:'बुधवासरे',lord:'Mercury'},{en:'Thursday',ne:'बिहीबार',sa:'गुरुवासरे',lord:'Jupiter'},{en:'Friday',ne:'शुक्रबार',sa:'शुक्रवासरे',lord:'Venus'},{en:'Saturday',ne:'शनिबार',sa:'शनिवासरे',lord:'Saturn'}];
export const BS_MONTHS=[{en:'Baisakh',ne:'बैशाख',sa:'वैशाख'},{en:'Jestha',ne:'जेठ',sa:'ज्येष्ठ'},{en:'Asar',ne:'असार',sa:'आषाढ'},{en:'Shrawan',ne:'साउन',sa:'श्रावण'},{en:'Bhadra',ne:'भदौ',sa:'भाद्र'},{en:'Ashwin',ne:'असोज',sa:'आश्विन'},{en:'Kartik',ne:'कात्तिक',sa:'कार्तिक'},{en:'Mangsir',ne:'मंसिर',sa:'मार्गशीर्ष'},{en:'Poush',ne:'पुस',sa:'पौष'},{en:'Magh',ne:'माघ',sa:'माघ'},{en:'Falgun',ne:'फागुन',sa:'फाल्गुन'},{en:'Chaitra',ne:'चैत',sa:'चैत्र'}];
export const LUNAR_MONTHS=[{en:'Chaitra',ne:'चैत्र'},{en:'Vaishakha',ne:'वैशाख'},{en:'Jyeshtha',ne:'ज्येष्ठ'},{en:'Ashadha',ne:'आषाढ'},{en:'Shravana',ne:'श्रावण'},{en:'Bhadrapada',ne:'भाद्र'},{en:'Ashwin',ne:'आश्विन'},{en:'Kartika',ne:'कार्तिक'},{en:'Margashirsha',ne:'मार्गशीर्ष'},{en:'Pausha',ne:'पौष'},{en:'Magha',ne:'माघ'},{en:'Phalguna',ne:'फाल्गुन'}];
export const RITUS=[{en:'Vasanta (spring)',ne:'वसन्त'},{en:'Grishma (summer)',ne:'ग्रीष्म'},{en:'Varsha (monsoon)',ne:'वर्षा'},{en:'Sharad (autumn)',ne:'शरद्'},{en:'Hemanta (pre-winter)',ne:'हेमन्त'},{en:'Shishira (winter)',ne:'शिशिर'}];
export const AYANAS=[{en:'Uttarayana',ne:'उत्तरायण'},{en:'Dakshinayana',ne:'दक्षिणायन'}];
export const DASHA_ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
export const DASHA_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
export const EXALTATION={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6,Rahu:1,Ketu:7};
export const DEBILITATION={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0,Rahu:7,Ketu:1};
export const OWN_SIGNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10],Rahu:[],Ketu:[]};
export const MOOLATRIKONA={Sun:4,Moon:1,Mars:0,Mercury:5,Jupiter:8,Venus:6,Saturn:10};
export const DIGNITY_LABELS={exalted:{en:'Exalted',ne:'उच्च'},debilitated:{en:'Debilitated',ne:'नीच'},own:{en:'Own sign',ne:'स्वराशि'},moolatrikona:{en:'Moolatrikona',ne:'मूलत्रिकोण'},friend:{en:"Friend's sign",ne:'मित्रराशि'},neutral:{en:'Neutral sign',ne:'समराशि'},enemy:{en:"Enemy's sign",ne:'शत्रुराशि'}};
export const NATURAL_RELATION={Sun:{Moon:'F',Mars:'F',Jupiter:'F',Mercury:'N',Venus:'E',Saturn:'E'},Moon:{Sun:'F',Mercury:'F',Mars:'N',Jupiter:'N',Venus:'N',Saturn:'N'},Mars:{Sun:'F',Moon:'F',Jupiter:'F',Venus:'N',Saturn:'N',Mercury:'E'},Mercury:{Sun:'F',Venus:'F',Mars:'N',Jupiter:'N',Saturn:'N',Moon:'E'},Jupiter:{Sun:'F',Moon:'F',Mars:'F',Saturn:'N',Mercury:'E',Venus:'E'},Venus:{Mercury:'F',Saturn:'F',Mars:'N',Jupiter:'N',Sun:'E',Moon:'E'},Saturn:{Mercury:'F',Venus:'F',Jupiter:'N',Sun:'E',Moon:'E',Mars:'E'}};
export const HOUSE_NAMES=[{en:'Tanu (self)',ne:'तनु'},{en:'Dhana (wealth)',ne:'धन'},{en:'Sahaja (siblings)',ne:'सहज'},{en:'Sukha (home)',ne:'सुख'},{en:'Putra (children)',ne:'पुत्र'},{en:'Ripu (enemies/health)',ne:'रिपु'},{en:'Jaya (spouse)',ne:'जाया'},{en:'Ayu (longevity)',ne:'आयु'},{en:'Dharma (fortune)',ne:'धर्म'},{en:'Karma (career)',ne:'कर्म'},{en:'Labha (gains)',ne:'लाभ'},{en:'Vyaya (expenses)',ne:'व्यय'}];

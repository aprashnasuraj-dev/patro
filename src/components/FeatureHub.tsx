import {
  CalendarDays, ListChecks, MoonStar, Orbit, Wrench, Keyboard, History, Hourglass,
  Newspaper, Radio, Tv, Telescope, ArrowLeftRight, Sparkles, Receipt, Cake, FileClock, Cloud
} from "lucide-react";

type Item={path:string;title:string;description:string;icon:typeof CalendarDays};
const GROUPS:{title:string;items:Item[]}[]=[
  {title:"आफ्नै पात्रो",items:[
    {path:"/",title:"आफ्नै पात्रो",description:"आजको मिति, तिथि, चाडपर्व र महिनाको पात्रो",icon:CalendarDays},
    {path:"/jyotish/rashifal",title:"आफ्नै राशिफल",description:"दैनिक, साप्ताहिक र मासिक राशिफल",icon:MoonStar},
    {path:"/convert",title:"आफ्नै मिति रूपान्तरण",description:"BS ↔ AD र दिन अन्तर",icon:ArrowLeftRight},
    {path:"/astro",title:"आफ्नै खगोलीय पात्रो",description:"चन्द्र अवस्था, आकाश र खगोलीय डेटा",icon:Telescope}
  ]},
  {title:"आफ्नै नोट र डायरी",items:[
    {path:"/my-diary",title:"आफ्नै नोट",description:"कार्य, नियमित म्याद र नजिकका सम्झना",icon:ListChecks},
    {path:"/my-diary?tab=due",title:"आफ्नै म्याद",description:"दोहोरिने भुक्तानी र म्याद सम्झना",icon:Receipt},
    {path:"/my-diary?tab=family",title:"आफ्नै परिवार मिति",description:"जन्मदिन, वार्षिकोत्सव र परिवारका मिति",icon:Cake},
    {path:"/my-diary?tab=documents",title:"आफ्नै कागजात म्याद",description:"पासपोर्ट, लाइसेन्स र कागजात expiry",icon:FileClock},
    {path:"/my-diary?tab=festival",title:"आफ्नै चाडपर्व तयारी",description:"चाडपर्वअघि चरणबद्ध तयारी",icon:Sparkles}
  ]},
  {title:"आफ्नै मिडिया",items:[
    {path:"/samachar",title:"आफ्नै समाचार",description:"समर्थित नेपाली स्रोतका समाचार",icon:Newspaper},
    {path:"/fm",title:"आफ्नै रेडियो",description:"नेपाल र विश्वका रेडियो स्टेशन",icon:Radio},
    {path:"/tv",title:"आफ्नै लाइभ टिभी",description:"देश, भाषा र विषयअनुसार लाइभ च्यानल",icon:Tv}
  ]},
  {title:"आफ्नै उपकरण",items:[
    {path:"/tools/nepali-typing",title:"आफ्नै नेपाली टाइपिङ",description:"Roman → Unicode नेपाली टाइपिङ",icon:Keyboard},
    {path:"/tools",title:"आफ्नै उपयोगी उपकरण",description:"Preeti, मिति, भूमि, कर, QR र इन्धन",icon:Wrench},
    {path:"/time-machine",title:"आफ्नै समययन्त्र",description:"इतिहासमा समय यात्रा",icon:Hourglass},
    {path:"/on-this-day",title:"आफ्नै आज इतिहासमा",description:"आजको दिन इतिहासमा भएका घटनाहरू",icon:History},
    {path:"/jyotish/china",title:"आफ्नै चिना",description:"जन्म मिति, समय र स्थानबाट कुण्डली, दशा र ग्रह स्थिति",icon:Orbit},
    {path:"/settings",title:"आफ्नै खाता र सिङ्क",description:"Google साइन इन, sync र गोपनीयता",icon:Cloud}
  ]}
];

export function FeatureHub(){
  return <main className="mp-page mp-feature-hub">
    <div className="mp-page-hero"><p className="eyebrow">आफ्नै सबै सुविधा</p><h1>आफ्नै पात्रोमा आफ्नै कामका सबै उपकरण, एउटै ठाउँमा।</h1><p>पात्रो, नोट, मिडिया, ज्योतिष र उपयोगी उपकरणहरू एउटै आफ्नै अनुभवमा।</p></div>
    {GROUPS.map(group=><section key={group.title} className="mp-feature-group"><header><h2>{group.title}</h2></header><div className="mp-feature-grid">{group.items.map(item=>{const Icon=item.icon;return <a href={item.path} className="mp-feature-card" key={item.path+item.title}><Icon size={24}/><span><strong>{item.title}</strong><small>{item.description}</small></span><b aria-hidden="true">→</b></a>})}</div></section>)}
  </main>;
}

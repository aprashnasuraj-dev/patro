import {
  CalendarDays, ListChecks, MoonStar, Orbit, Wrench, Keyboard, History, Hourglass,
  Newspaper, Radio, Tv, Telescope, ArrowLeftRight, Sparkles, Receipt, Cake, FileClock, Cloud
} from "lucide-react";

type Item={path:string;title:string;description:string;icon:typeof CalendarDays};
const GROUPS:{title:string;items:Item[]}[]=[
  {title:"पात्रो",items:[
    {path:"/",title:"पात्रो",description:"आजको मिति, तिथि, चाडपर्व र महिनाको पात्रो",icon:CalendarDays},
    {path:"/jyotish/rashifal",title:"राशिफल",description:"दैनिक, साप्ताहिक र मासिक राशिफल",icon:MoonStar},
    {path:"/convert",title:"मिति रूपान्तरण",description:"BS ↔ AD र दिन अन्तर",icon:ArrowLeftRight},
    {path:"/astro",title:"खगोलीय पात्रो",description:"चन्द्र अवस्था, आकाश र खगोलीय डेटा",icon:Telescope}
  ]},
  {title:"मेरो डायरी",items:[
    {path:"/my-diary",title:"मेरो आज",description:"कार्य, नियमित म्याद र नजिकका सम्झना",icon:ListChecks},
    {path:"/my-diary?tab=due",title:"नियमित म्याद",description:"दोहोरिने भुक्तानी र म्याद सम्झना",icon:Receipt},
    {path:"/my-diary?tab=family",title:"परिवारका मितिहरू",description:"जन्मदिन, वार्षिकोत्सव र परिवारका मिति",icon:Cake},
    {path:"/my-diary?tab=documents",title:"कागजात म्याद",description:"पासपोर्ट, लाइसेन्स र कागजात expiry",icon:FileClock},
    {path:"/my-diary?tab=festival",title:"चाडपर्व तयारी",description:"चाडपर्वअघि चरणबद्ध तयारी",icon:Sparkles}
  ]},
  {title:"मिडिया",items:[
    {path:"/samachar",title:"समाचार",description:"समर्थित नेपाली स्रोतका समाचार",icon:Newspaper},
    {path:"/fm",title:"मेरो पात्रो रेडियो",description:"नेपाल र विश्वका रेडियो स्टेशन",icon:Radio},
    {path:"/tv",title:"लाइभ टिभी",description:"देश, भाषा र विषयअनुसार लाइभ च्यानल",icon:Tv}
  ]},
  {title:"उपकरण",items:[
    {path:"/tools/nepali-typing",title:"नेपाली टाइपिङ",description:"Roman → Unicode नेपाली टाइपिङ",icon:Keyboard},
    {path:"/tools",title:"उपयोगी उपकरण",description:"Preeti, मिति, भूमि, कर, QR र इन्धन",icon:Wrench},
    {path:"/time-machine",title:"समययन्त्र",description:"इतिहासमा समय यात्रा",icon:Hourglass},
    {path:"/on-this-day",title:"आज इतिहासमा",description:"आजको दिन इतिहासमा भएका घटनाहरू",icon:History},
    {path:"/jyotish/china",title:"चिना टिपन · जन्मपत्रिका",description:"जन्म मिति, समय र स्थानबाट कुण्डली, दशा र ग्रह स्थिति",icon:Orbit},
    {path:"/settings",title:"साइन इन र सिङ्क",description:"Google साइन इन, sync र गोपनीयता",icon:Cloud}
  ]}
];

export function FeatureHub(){
  return <main className="mp-page mp-feature-hub">
    <div className="mp-page-hero"><p className="eyebrow">सबै सुविधा</p><h1>मेरो पात्रोमा सबै कुरा, एउटै ठाउँमा।</h1><p>पात्रो, डायरी, मिडिया र उपयोगी उपकरणहरू स्पष्ट समूहमा।</p></div>
    {GROUPS.map(group=><section key={group.title} className="mp-feature-group"><header><h2>{group.title}</h2></header><div className="mp-feature-grid">{group.items.map(item=>{const Icon=item.icon;return <a href={item.path} className="mp-feature-card" key={item.path+item.title}><Icon size={24}/><span><strong>{item.title}</strong><small>{item.description}</small></span><b aria-hidden="true">→</b></a>})}</div></section>)}
  </main>;
}

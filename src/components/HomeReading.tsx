import { l } from "../useUiLanguage";
const articles=[
  {slug:"bs-ad-date-conversion",ne:"नेपाली मिति रूपान्तरण कसरी गर्ने?",en:"How to convert a Nepali date",descNe:"वर्षमा ५६ वा ५७ घटाएर मात्रै मिति किन मिल्दैन? सही मिति जाँच्ने तरिका।",descEn:"Why subtracting 56 or 57 years is not enough, and how to check a date."},
  {slug:"preeti-unicode-conversion",ne:"प्रीति र युनिकोडको फरक बुझ्नुहोस्",en:"Understand Preeti and Unicode",descNe:"फन्ट बदल्नु र अक्षर रूपान्तरण गर्नुबीचको फरक।",descEn:"The difference between changing a font and converting the text."},
  {slug:"nepali-voice-typing",ne:"बोलेर नेपाली लेख्ने तरिका",en:"Write Nepali with your voice",descNe:"आवाजबाट लेख्नुहोस्, प्राप्त पाठ जाँच्नुहोस् र सच्याउनुहोस्।",descEn:"Dictate, review the result and correct your text."}
];
export function HomeReading({language}:{language:"ne"|"en"}) {
  return <section className="home-reading" aria-labelledby="home-reading-title"><header><div><p>{l(language,"पढ्नुहोस् र सिक्नुहोस्","Read & learn")}</p><h2 id="home-reading-title">{l(language,"दैनिक काम सजिलो बनाउने लेख","Ideas for everyday tasks")}</h2></div><a href="/guides">{l(language,"सबै लेख र निर्देशिका","All articles & guides")}</a></header><div className="home-reading-list">{articles.map((article,index)=><article key={article.slug}><span>{l(language,"व्यावहारिक निर्देशिका","Practical guide")}</span><h3><a href={`/guides/${article.slug}`}>{l(language,article.ne,article.en)}</a></h3><p>{l(language,article.descNe,article.descEn)}</p>{language==="en"?<small lang="en">{l(language,"","Guide text is currently in Nepali.")}</small>:null}</article>)}</div></section>;
}

import { useEffect, useState, type FormEvent } from "react";
import { Info, BookOpenText, ShieldCheck, Scale, MessageSquare, Send } from "lucide-react";
import { applyRouteSeo } from "../seo";
import type { UiLanguage } from "../i18n";
import { l, useUiLanguage } from "../useUiLanguage";

type PageKey = "about" | "sources" | "privacy" | "terms" | "contact";
type Localized = { ne: string; en: string };
type ResourceLink = { href: string; label: Localized; external?: boolean };
type ContentSection = {
  title: Localized;
  paragraphs: Localized[];
  links?: ResourceLink[];
};

const SUPPORT_EMAIL = "meroaafnaipatro@gmail.com";

const PAGES: Record<PageKey, {
  title: Localized;
  eyebrow: Localized;
  description: Localized;
  seoTitle: Localized;
  seoDescription: Localized;
  icon: typeof Info;
}> = {
  about: {
    title: { ne: "हाम्रो बारेमा", en: "About Aafnai Patro" },
    eyebrow: { ne: "उद्देश्य र उत्पादन", en: "Purpose & product" },
    description: {
      ne: "नेपाली कालगणना, खगोलीय सन्दर्भ, सांस्कृतिक पात्रो र दैनिक उपयोगका उपकरणलाई स्पष्ट, पहुँचयोग्य र जिम्मेवार डिजिटल अनुभवमा जोड्ने हाम्रो उद्देश्य हो।",
      en: "Our goal is to bring Nepal’s calendar systems, astronomical references, cultural dates, and everyday tools together in a clear, accessible, and responsible digital experience."
    },
    seoTitle: { ne: "आफ्नै पात्रोबारे", en: "About" },
    seoDescription: {
      ne: "आफ्नै पात्रोको उद्देश्य, उपलब्ध सुविधा, सामग्रीसम्बन्धी सिद्धान्त र सेवाप्रति हाम्रो दृष्टिकोणबारे जान्नुहोस्।",
      en: "Learn about Aafnai Patro’s purpose, product scope, content principles, and approach to building useful calendar and reference tools."
    },
    icon: Info
  },
  sources: {
    title: { ne: "स्रोत र पद्धति", en: "Sources & methodology" },
    eyebrow: { ne: "स्रोत, गणना र सीमाहरू", en: "Sources, calculations & limitations" },
    description: {
      ne: "मिति, तिथि, खगोलीय विवरण, चाडपर्व र बाह्य सामग्री कसरी तयार वा प्राप्त हुन्छन्, र कुन अवस्थामा थप पुष्टि आवश्यक पर्न सक्छ भन्ने विवरण।",
      en: "Understand how dates, tithi, astronomical data, festivals, and external content are calculated or sourced—and when independent verification may be necessary."
    },
    seoTitle: { ne: "स्रोत र पद्धति", en: "Sources & Methodology" },
    seoDescription: {
      ne: "आफ्नै पात्रोका मिति, पञ्चाङ्ग, खगोलीय गणना, सांस्कृतिक पात्रो र बाह्य सामग्रीका स्रोत तथा सीमाहरू।",
      en: "Review the sources, calculation approach, and known limitations behind Aafnai Patro’s calendar, Panchang, astronomy, cultural-date, and external-content features."
    },
    icon: BookOpenText
  },
  privacy: {
    title: { ne: "गोपनीयता नीति", en: "Privacy policy" },
    eyebrow: { ne: "तथ्य, नियन्त्रण र पारदर्शिता", en: "Data, control & transparency" },
    description: {
      ne: "ब्राउजरमा सुरक्षित हुन सक्ने जानकारी, ऐच्छिक सिङ्क, तेस्रो-पक्ष सेवा र विज्ञापनसम्बन्धी जानकारी कसरी बुझ्ने भन्ने स्पष्ट विवरण।",
      en: "This policy explains browser-stored information, optional synchronization, third-party services, and how advertising-related data may be processed."
    },
    seoTitle: { ne: "गोपनीयता नीति", en: "Privacy Policy" },
    seoDescription: {
      ne: "आफ्नै पात्रोमा स्थानीय भण्डारण, ऐच्छिक सिङ्क, तेस्रो-पक्ष सेवा, विज्ञापन र प्रयोगकर्ताको नियन्त्रणसम्बन्धी गोपनीयता विवरण।",
      en: "Read how Aafnai Patro handles local browser storage, optional sync, third-party services, advertising, and user controls."
    },
    icon: ShieldCheck
  },
  terms: {
    title: { ne: "सेवा प्रयोगका सर्तहरू", en: "Terms of use" },
    eyebrow: { ne: "उचित प्रयोग र जिम्मेवारी", en: "Responsible use & limitations" },
    description: {
      ne: "सेवाका सामग्री र उपकरण प्रयोग गर्दा लागू हुने सामान्य नियम, गणनाको सीमितता, बाह्य सेवामा निर्भरता र प्रयोगकर्ताको जिम्मेवारी।",
      en: "These terms describe the general rules for using the service, the limits of informational calculations, dependencies on external services, and user responsibilities."
    },
    seoTitle: { ne: "सेवा प्रयोगका सर्तहरू", en: "Terms of Use" },
    seoDescription: {
      ne: "आफ्नै पात्रोको सामग्री, गणना, बाह्य लिङ्क, सेवा उपलब्धता र उचित प्रयोगसम्बन्धी सर्तहरू पढ्नुहोस्।",
      en: "Review the terms governing Aafnai Patro’s content, calculations, external links, service availability, and acceptable use."
    },
    icon: Scale
  },
  contact: {
    title: { ne: "सम्पर्क र सहयोग", en: "Contact & support" },
    eyebrow: { ne: "प्रतिक्रिया र तथ्य-सुधार", en: "Feedback & corrections" },
    description: {
      ne: "प्राविधिक समस्या, प्रयोगसम्बन्धी प्रश्न, पहुँचसम्बन्धी सुझाव वा पात्रोको तथ्य-सुधार पठाउँदा उपयोगी विवरण कसरी समावेश गर्ने भन्ने जानकारी।",
      en: "Find out how to report a technical issue, ask a product question, suggest an accessibility improvement, or submit a well-supported calendar correction."
    },
    seoTitle: { ne: "सम्पर्क", en: "Contact" },
    seoDescription: {
      ne: "आफ्नै पात्रोलाई सम्पर्क गर्ने, प्राविधिक समस्या बताउने वा स्रोतसहित तथ्य-सुधार पठाउने तरिका।",
      en: "Contact Aafnai Patro for support, product feedback, accessibility suggestions, or evidence-based calendar and content corrections."
    },
    icon: MessageSquare
  }
};

const ABOUT_SECTIONS: ContentSection[] = [
  {
    title: { ne: "हाम्रो उद्देश्य", en: "Our purpose" },
    paragraphs: [
      {
        ne: "आफ्नै पात्रो नेपालका प्रचलित मिति प्रणाली र दैनिक जीवनमा उपयोगी सन्दर्भलाई एउटै वेब अनुभवमा सहज रूपमा उपलब्ध गराउने परियोजना हो। प्रयोगकर्ताले मिति हेर्न, पात्रोसम्बन्धी जानकारी बुझ्न, आवश्यक विवरण रूपान्तरण गर्न र सम्बन्धित डिजिटल उपकरणसम्म पुग्न सकून् भन्ने यसको मूल उद्देश्य हो।",
        en: "Aafnai Patro is a web product designed to make Nepal’s commonly used date systems and practical calendar references easier to access in one place. Its core purpose is to help people consult dates, understand calendar context, convert information, and reach related digital tools without unnecessary friction."
      },
      {
        ne: "सेवा नेपाली र अंग्रेजी दुवै भाषामा उपयोगी हुने, मोबाइल तथा डेस्कटपमा सहज चल्ने र सामग्रीका सीमा स्पष्ट पार्ने दिशामा विकास गरिन्छ।",
        en: "The product is developed to be useful in both Nepali and English, work across mobile and desktop devices, and communicate the limits of its content rather than presenting every result as universally definitive."
      }
    ]
  },
  {
    title: { ne: "उपलब्ध सामग्री र उपकरण", en: "Content and tools" },
    paragraphs: [
      {
        ne: "उपलब्ध सुविधाअनुसार आफ्नै पात्रोमा विक्रम संवत् र इस्वी संवत्का मिति, मिति रूपान्तरण, तिथि तथा पञ्चाङ्ग सन्दर्भ, चाडपर्व र सांस्कृतिक पात्रो, खगोलीय विवरण, ज्योतिषसम्बन्धी सामग्री, मिडिया तथा दैनिक कामका सहायक उपकरण समावेश हुन सक्छन्। सबै सुविधा एउटै प्रकारको स्रोत वा गणनामा आधारित हुँदैनन्; प्रत्येक सामग्रीको प्रकृति र प्रयोगको सन्दर्भलाई अलग रूपमा बुझ्नुपर्छ।",
        en: "Depending on the feature, Aafnai Patro may provide Bikram Sambat and Gregorian date references, date conversion, tithi and Panchang context, festivals and cultural calendars, astronomical information, astrology-related content, media, and practical tools. These features do not all rely on the same kind of source or calculation; each should be understood in its own context."
      }
    ]
  },
  {
    title: { ne: "विश्वसनीयता र पारदर्शिता", en: "Reliability and transparency" },
    paragraphs: [
      {
        ne: "पात्रोसम्बन्धी डेटा, गणनाबाट निकालिएका परिणाम र परम्परागत व्याख्यालाई एउटै प्रमाणस्तरका तथ्य ठान्नु उचित हुँदैन। हामी सम्भव भएसम्म स्रोत, गणना वा सन्दर्भको प्रकृति छुट्याएर प्रस्तुत गर्ने र ज्ञात सीमाबारे जानकारी दिने लक्ष्य राख्छौँ। प्रकाशित अभिलेख, क्षेत्रीय परम्परा वा समय-संवेदनशील बाह्य स्रोतबीच फरक देखिएमा त्यसलाई बेवास्ता गर्नुको सट्टा जाँच गर्न मिल्ने आधार दिनु महत्वपूर्ण हुन्छ।",
        en: "Published calendar records, calculated results, and traditional interpretations should not be treated as if they carry the same evidential status. We aim to distinguish the nature of a source, calculation, or interpretation wherever the interface supports that context, and to explain known limitations. When published records, regional practices, or time-sensitive external sources differ, the appropriate response is to make the discrepancy reviewable rather than silently imply certainty."
      }
    ]
  },
  {
    title: { ne: "व्यक्तिगत नियन्त्रण र गोपनीयता", en: "Personal control and privacy" },
    paragraphs: [
      {
        ne: "केही व्यक्तिगत सुविधा ब्राउजरमा स्थानीय रूपमा जानकारी राखेर चल्न सक्छन्; सिङ्क वा खातामा आधारित सुविधा छुट्टै विकल्पका रूपमा उपलब्ध भएमा त्यसको प्रयोग सुविधा र तपाईंले लिएको कदममा निर्भर हुन्छ। कुन जानकारी कहाँ राखिन्छ भन्ने निर्णय गर्नु अघि सम्बन्धित सुविधा र गोपनीयता विवरण पढ्नुहोस्।",
        en: "Some personal features may keep information locally in your browser. Where account-based or synchronization features are available, their use depends on the specific feature and the action you take. Review the relevant feature and privacy information before deciding where your information should be stored."
      },
      {
        ne: "साझा उपकरण प्रयोग गर्दा निजी नोट, पारिवारिक विवरण वा सम्झनाहरू स्थानीय भण्डारणमा रहन सक्छन् भन्ने कुरा ध्यान दिनुहोस्। उपकरणको पहुँच र ब्राउजरको भण्डारण व्यवस्थापन तपाईंको नियन्त्रणमा पनि निर्भर हुन्छ।",
        en: "When using a shared device, remember that private notes, family details, or reminders may remain in browser storage. Device access and browser-storage management are therefore also part of protecting your information."
      }
    ]
  },
  {
    title: { ne: "सुधार र सुझाव", en: "Corrections and feedback" },
    paragraphs: [
      {
        ne: "सेवा निरन्तर सुधार गर्न तथ्यगत त्रुटि, अस्पष्ट प्रस्तुति वा प्रयोगमा आउने समस्या सम्बन्धी प्रमाणसहितको प्रतिक्रिया उपयोगी हुन्छ। मिति वा तिथिको विषयमा प्रतिक्रिया दिँदा सम्बन्धित मिति, स्थान वा समय क्षेत्र, देखिएको परिणाम र तुलना गरिएको आधिकारिक वा विश्वसनीय स्रोत समावेश गर्नुहोस्।",
        en: "Evidence-based feedback helps improve factual accuracy, clarity, and usability. For a date or tithi report, include the relevant date, location or time zone, the result you observed, and the authoritative or otherwise reliable source used for comparison."
      }
    ],
    links: [{ href: "/contact", label: { ne: "सम्पर्क र तथ्य-सुधार पृष्ठ खोल्नुहोस्", en: "Open contact and correction options" } }]
  }
];

const SOURCE_SECTIONS: ContentSection[] = [
  {
    title: { ne: "स्रोतको प्रकृति कसरी बुझ्ने", en: "How to interpret source types" },
    paragraphs: [
      {
        ne: "पात्रोसम्बन्धी जानकारी विभिन्न तरिकाबाट तयार हुन सक्छ: प्रकाशित वा सङ्कलित पात्रो अभिलेखबाट, खगोलीय मानहरूको गणनाबाट, सांस्कृतिक वा ऐतिहासिक सन्दर्भबाट, अथवा बाह्य प्रदायकबाट प्राप्त समय-संवेदनशील डेटाबाट। एउटै पृष्ठमा देखिने सबै मान एउटै विधिबाट आएको मान्नु हुँदैन। स्रोत उपलब्ध भएको ठाउँमा त्यसलाई जाँच्नुहोस् र तथ्यको प्रकृतिअनुसार उचित सावधानी अपनाउनुहोस्।",
        en: "Calendar-related information can come from several different processes: published or compiled calendar records, calculations based on astronomical quantities, cultural or historical references, or time-sensitive data supplied by external providers. Not every value shown on the same page necessarily comes from the same method. Where a source is provided, consult it and apply a level of caution appropriate to the type of information."
      }
    ]
  },
  {
    title: { ne: "विक्रम संवत्, इस्वी संवत् र मिति रूपान्तरण", en: "Bikram Sambat, Gregorian dates, and conversion" },
    paragraphs: [
      {
        ne: "नेपाली मिति तथा इस्वी संवत्बीचको रूपान्तरण पात्रो अभिलेख र मितिको मिलानमा निर्भर हुन्छ। प्रकाशित पात्रो संस्करण, ऐतिहासिक अभिलेख वा धेरै टाढाको भविष्यका मितिमा फरक देखिन सक्छ; त्यसैले कानुनी कागजात, सरकारी समयसीमा वा औपचारिक कामका लागि सम्बन्धित निकायले स्वीकार गरेको पात्रो वा अभिलेखसँग दोहोरो जाँच गर्नुहोस्।",
        en: "Conversions between Nepali dates and the Gregorian calendar depend on calendar records and date mapping. Differences can arise between published calendar editions, historical records, or dates far into the future. For legal documents, official deadlines, or other formal purposes, cross-check the date against the calendar or record accepted by the relevant authority."
      }
    ]
  },
  {
    title: { ne: "तिथि, पञ्चाङ्ग र खगोलीय गणना", en: "Tithi, Panchang, and astronomical calculations" },
    paragraphs: [
      {
        ne: "तिथि सूर्य र चन्द्रमाको सापेक्ष कोणीय अवस्थासँग सम्बन्धित खगोलीय अवधारणा हो; यसको सुरुआत वा अन्त्य नागरिक पात्रोको मध्यरातभन्दा अघि वा पछि हुन सक्छ। त्यसैले कुनै तिथि एउटै ग्रेगोरियन मितिभरि मात्र रहन्छ भन्ने आवश्यक छैन। गणनामा प्रयोग हुने स्थान, समय क्षेत्र र गणनाको परम्परा वा मोडेलले स्थानीय समयको प्रस्तुतीकरणमा प्रभाव पार्न सक्छ।",
        en: "Tithi is an astronomical concept related to the relative angular positions of the Sun and Moon. A tithi can begin or end before or after civil midnight, so it does not necessarily remain in effect for an entire Gregorian date. The location, time zone, and calculation convention or model used can affect how local times are presented."
      },
      {
        ne: "खगोलीय गणना र प्रकाशित पञ्चाङ्गमा भिन्नता देखिएमा तुलना गरिएका मिति, स्थान, समय क्षेत्र र प्रयुक्त पद्धति समान छन् कि छैनन् जाँच्नुहोस्। फरक देखिनु मात्रले कुनै एउटा मान स्वतः सही वा गलत प्रमाणित गर्दैन।",
        en: "When an astronomical calculation differs from a published Panchang, first check whether the dates, locations, time zones, and methods being compared are equivalent. A discrepancy by itself does not automatically establish that either value is correct or incorrect."
      }
    ]
  },
  {
    title: { ne: "चाडपर्व र सांस्कृतिक पात्रो", en: "Festivals and cultural calendars" },
    paragraphs: [
      {
        ne: "चाडपर्वको मिति खगोलीय आधार, प्रचलित पात्रो, क्षेत्रीय परम्परा, समुदायको अभ्यास वा सम्बन्धित संस्थाको घोषणामा आधारित हुन सक्छ। एउटै पर्वको अवलोकन वा मनाउने दिन क्षेत्र, समुदाय वा परम्पराअनुसार फरक हुन सक्छ। स्थानीय अनुष्ठान, यात्रा वा औपचारिक कार्यक्रम तय गर्दा सम्बन्धित समुदाय वा आधिकारिक आयोजकको सूचना पनि जाँच्नुहोस्।",
        en: "Festival dates may be based on astronomical criteria, published calendars, regional traditions, community practice, or announcements from relevant institutions. The observed or celebrated date for the same festival can vary by region, community, or tradition. For local rituals, travel, or formal events, also check guidance from the relevant community or official organizer."
      }
    ]
  },
  {
    title: { ne: "ज्योतिषसम्बन्धी सामग्री", en: "Astrology-related content" },
    paragraphs: [
      {
        ne: "राशिफल, जन्मकुण्डली र परम्परागत शुभ-अशुभ व्याख्या सांस्कृतिक तथा ज्योतिषीय प्रणालीभित्रका व्याख्यात्मक सामग्री हुन्; तिनलाई प्रमाणित वैज्ञानिक भविष्यवाणी वा निश्चित परिणामका रूपमा प्रस्तुत गर्नु हुँदैन। जन्म विवरणमा आधारित परिणामको सन्दर्भमा जन्म मिति, सही समय, स्थान र प्रयोग गरिएको प्रणालीले गणनालाई प्रभाव पार्न सक्छ।",
        en: "Horoscopes, birth charts, and traditional auspicious or inauspicious interpretations belong to cultural and astrological systems. They should not be treated as scientifically established predictions or guaranteed outcomes. For birth-detail-based results, the birth date, precise time, location, and selected system can affect the calculation."
      }
    ]
  },
  {
    title: { ne: "बाह्य सामग्री, मिडिया र बजार विवरण", en: "External content, media, and market information" },
    paragraphs: [
      {
        ne: "रेडियो, टिभी वा अन्य मिडिया सुविधा सम्बन्धित प्रसारक वा तेस्रो-पक्ष स्रोतको उपलब्धता, इन्टरनेट जडान, भौगोलिक प्रतिबन्ध र प्रसारण अधिकारमा निर्भर हुन सक्छन्। स्रोत बन्द हुँदा, ठेगाना परिवर्तन हुँदा वा सेवा प्रदायकले पहुँच सीमित गर्दा सामग्री अस्थायी वा स्थायी रूपमा अनुपलब्ध हुन सक्छ।",
        en: "Radio, television, and other media features may depend on the availability of broadcasters or third-party sources, internet connectivity, geographic restrictions, and distribution rights. Content may become temporarily or permanently unavailable when a source goes offline, an address changes, or a provider restricts access."
      },
      {
        ne: "इन्धन मूल्यजस्ता बाह्य सार्वजनिक जानकारीका लागि सम्बन्धित निकाय—उदाहरणका लागि नेपाल आयल निगम—को प्रकाशित विवरण प्राथमिक सन्दर्भ हुनुपर्छ। बाह्य स्रोतमा अद्यावधिक हुन ढिलाइ हुन सक्छ; कारोबार वा निर्णय गर्नुअघि सम्बन्धित निकायबाट पछिल्लो मान पुष्टि गर्नुहोस्।",
        en: "For public information such as fuel prices, the relevant authority—for example, Nepal Oil Corporation—is the primary reference. Updates from external sources can be delayed; verify the latest value with the responsible authority before making a transaction or decision."
      }
    ]
  },
  {
    title: { ne: "त्रुटि रिपोर्ट र सुधार प्रक्रिया", en: "Reporting discrepancies and requesting corrections" },
    paragraphs: [
      {
        ne: "त्रुटि रिपोर्टमा पृष्ठको ठेगाना, सम्बन्धित मिति, स्थान वा समय क्षेत्र, देखिएको परिणाम, अपेक्षित परिणाम र त्यसलाई समर्थन गर्ने स्रोत समावेश गर्नुहोस्। स्क्रिनसट सहयोगी हुन सक्छ, तर स्रोतको नाम वा लिङ्क र गणनासँग सम्बन्धित सन्दर्भ पनि दिनुहोस्। रिपोर्ट प्राप्त हुनु भनेको जानकारी स्वतः संशोधन भयो भन्ने होइन; जाँचपछि मात्र सुधार उपयुक्त छ कि छैन निर्धारण गर्न सकिन्छ।",
        en: "A useful report includes the page URL, relevant date, location or time zone, observed result, expected result, and supporting source. A screenshot can help, but also provide the source name or link and enough context to reproduce the comparison. Receiving a report does not mean the information has automatically been changed; a correction should follow review."
      }
    ],
    links: [{ href: "/contact", label: { ne: "स्रोतसहित सुधार पठाउनुहोस्", en: "Submit a correction with its source" } }]
  }
];

const PRIVACY_SECTIONS: ContentSection[] = [
  {
    title: { ne: "यो नीति केमा लागू हुन्छ", en: "Scope of this policy" },
    paragraphs: [
      {
        ne: "यो नीति आफ्नै पात्रो वेबसाइट र यसमा उपलब्ध सुविधासँग तपाईंको अन्तरक्रियाका सन्दर्भमा हो। बाह्य वेबसाइट, विज्ञापनदाता, साइन-इन प्रदायक, रेडियो/टिभी प्रसारक वा अन्य तेस्रो-पक्ष सेवाले आफ्नै गोपनीयता नीति र डेटा अभ्यास लागू गर्न सक्छन्। तिनीहरूको साइट वा सेवा प्रयोग गर्दा तिनका सर्त र गोपनीयता सूचना अलग्गै जाँच्नुहोस्।",
        en: "This policy concerns your interaction with the Aafnai Patro website and its features. External websites, advertisers, sign-in providers, radio or television broadcasters, and other third-party services may apply their own privacy policies and data practices. Review their notices separately when you use those sites or services."
      }
    ]
  },
  {
    title: { ne: "ब्राउजरमा रहने जानकारी", en: "Information stored in your browser" },
    paragraphs: [
      {
        ne: "नोट, व्यक्तिगत मिति, पारिवारिक सम्झना, मनपर्ने सामग्री वा सेटिङजस्ता केही सुविधाले काम गर्न तपाईंको उपकरणको ब्राउजर भण्डारण प्रयोग गर्न सक्छन्। यस्तो जानकारी उपकरण वा ब्राउजर प्रोफाइलसँग सम्बन्धित रहन सक्छ र एउटै उपकरण प्रयोग गर्ने अन्य व्यक्तिले देख्न सक्ने जोखिम हुन्छ। साझा वा सार्वजनिक उपकरणमा निजी जानकारी राख्दा सावधानी अपनाउनुहोस्।",
        en: "Some features—such as notes, personal dates, family reminders, favorites, or settings—may use storage in your device’s browser. Such information can remain associated with that device or browser profile and may be accessible to other people who use the same profile. Take care when saving private information on a shared or public device."
      },
      {
        ne: "ब्राउजरको site-data वा storage सफा गर्दा स्थानीय रूपमा सुरक्षित केही जानकारी मेटिन सक्छ। सफा गर्नु अघि आवश्यक विवरण निर्यात वा सुरक्षित गर्ने सुविधा उपलब्ध छ कि छैन जाँच्नुहोस्; स्थानीय डेटा मेटिएपछि पुनःप्राप्ति सम्भव नहुन सक्छ।",
        en: "Clearing a browser’s site data or storage may remove some locally saved information. Before clearing it, check whether the relevant feature offers an export or backup option; locally stored data may not be recoverable after deletion."
      }
    ]
  },
  {
    title: { ne: "खाता र ऐच्छिक सिङ्क", en: "Accounts and optional synchronization" },
    paragraphs: [
      {
        ne: "स्थानीय रूपमा राखिएको जानकारी स्वतः तपाईंको Google वा अन्य खातामा पठाइन्छ भन्ने अर्थ हुँदैन। खातामा आधारित वा सिङ्क सुविधा उपलब्ध भएमा, कुन डेटा समर्थित छ र कुन कार्यले त्यसलाई पठाउँछ भन्ने कुरा सो सुविधा र तपाईंले सुरु गरेको प्रक्रियामा निर्भर हुन्छ। सिङ्क प्रयोग गर्दा सम्बन्धित खाताको सुरक्षा, साझा उपकरणबाट साइन आउट गर्ने अभ्यास र खाताको आफ्नै डेटा नियन्त्रण पनि महत्वपूर्ण हुन्छ।",
        en: "Information stored locally is not, by itself, evidence that it is automatically sent to your Google or another account. Where account-based or sync features are available, the data supported and the action that transmits it depend on the feature and the process you initiate. When using sync, account security, signing out of shared devices, and the account provider’s own data controls also matter."
      }
    ]
  },
  {
    title: { ne: "सेवा सञ्चालन र सुरक्षा विवरण", en: "Service operation and security data" },
    paragraphs: [
      {
        ne: "वेबसाइट उपलब्ध गराउन, खराब ट्राफिक रोक्न, त्रुटि पत्ता लगाउन र सेवाको सुरक्षा कायम राख्न होस्टिङ, नेटवर्क वा सुरक्षा पूर्वाधारले अनुरोधसँग सम्बन्धित प्राविधिक विवरण प्रशोधन गर्न सक्छन्। यसमा IP ठेगाना, ब्राउजर वा उपकरणको प्रकार, अनुरोध गरिएको ठेगाना, समय र त्रुटि लगजस्ता विवरण पर्न सक्छन्—तर वास्तविक विवरण सक्रिय पूर्वाधार, सेटिङ र अनुरोधमा निर्भर हुन्छ।",
        en: "Hosting, network, or security infrastructure may process technical request information to deliver the website, mitigate abusive traffic, diagnose failures, and protect service availability. Depending on the active infrastructure, configuration, and request, this may include an IP address, browser or device type, requested URL, timestamps, or error logs."
      },
      {
        ne: "इन्टरनेटमा कुनै पनि प्रणालीले पूर्ण सुरक्षा वा जोखिम शून्य हुने प्रत्याभूति दिन सक्दैन। आफ्नो उपकरण र खातालाई सुरक्षित राख्नुहोस्, अद्यावधिक ब्राउजर प्रयोग गर्नुहोस् र सार्वजनिक रूपमा उपलब्ध गराउन नचाहेको संवेदनशील जानकारी अनावश्यक रूपमा नपठाउनुहोस्।",
        en: "No internet system can guarantee absolute security or zero risk. Keep your device and accounts secure, use an up-to-date browser, and avoid sending sensitive information that does not need to be shared."
      }
    ]
  },
  {
    title: { ne: "बाह्य मिडिया र तेस्रो-पक्ष लिङ्क", en: "External media and third-party links" },
    paragraphs: [
      {
        ne: "बाह्य भिडियो, रेडियो, टिभी, नक्सा, साइन-इन वा अन्य एकीकृत सेवा प्रयोग गर्दा तपाईंको ब्राउजरले सम्बन्धित प्रदायकसँग प्रत्यक्ष अनुरोध गर्न सक्छ। त्यसपछि प्रदायकले तपाईंको IP ठेगाना, अनुरोध मेटाडेटा, कुकी वा समान प्रविधि आफ्नै नीतिअनुसार प्रशोधन गर्न सक्छ। बाह्य सेवा सुरु नगरी कुनै निश्चित डेटा पठाइँदैन भन्ने अनुमान नगर्नुहोस्; प्रदायकको विवरण पढ्नुहोस्।",
        en: "When you use external video, radio, television, mapping, sign-in, or other integrated services, your browser may make requests directly to the relevant provider. That provider may process your IP address, request metadata, cookies, or similar technologies under its own policy. Do not assume that all data sharing is identical across providers; review the provider’s disclosures."
      }
    ]
  },
  {
    title: { ne: "विज्ञापन र Google AdSense", en: "Advertising and Google AdSense" },
    paragraphs: [
      {
        ne: "विज्ञापन सुविधा सक्षम भएको अवस्थामा Google AdSense सम्बन्धी स्क्रिप्ट वा विज्ञापन सामग्री लोड हुन सक्छ। विज्ञापन अनुरोध सञ्चालन, धोखाधडी रोकथाम, मापन वा लागू हुने अवस्थामा व्यक्तिगतकरणका लागि Google र यसका साझेदारले कुकी वा समान प्रविधि र ब्राउजर/उपकरणसम्बन्धी विवरण प्रयोग गर्न सक्छन्। वास्तविक प्रशोधन सक्रिय विज्ञापन सेटअप, तपाईंको स्थान, सेटिङ र आवश्यक सहमतिमा निर्भर हुन्छ।",
        en: "When advertising is enabled, Google AdSense scripts or advertising content may load. Google and its partners may use cookies or similar technologies and browser or device information to deliver ads, prevent fraud, measure performance, or personalize ads where applicable. The actual processing depends on the active advertising setup, your location, settings, and any consent required."
      },
      {
        ne: "Google को साझेदार साइटमा जानकारीको प्रयोगबारे पढ्न र विज्ञापन व्यक्तिगतकरणसम्बन्धी विकल्प जाँच्न तलका आधिकारिक स्रोत प्रयोग गर्नुहोस्। यी लिङ्कहरू आफैँमा यस वेबसाइटको कुकी वा सहमति व्यवस्थापन संयन्त्र होइनन्।",
        en: "Use the official resources below to understand how Google may use information on partner sites and to review advertising-personalization controls. These links do not, by themselves, provide this website’s cookie or consent-management mechanism."
      }
    ],
    links: [
      { href: "https://policies.google.com/technologies/partner-sites", label: { ne: "Google: साझेदार साइटमा डेटा प्रयोग", en: "Google: How data is used on partner sites" }, external: true },
      { href: "https://adssettings.google.com/", label: { ne: "Google Ads Settings", en: "Google Ads Settings" }, external: true }
    ]
  },
  {
    title: { ne: "सम्पर्क फाराम, नियन्त्रण र डेटा अनुरोध", en: "Contact forms, controls, and data requests" },
    paragraphs: [
      {
        ne: "सम्पर्क पृष्ठको फारामले तपाईंको उपकरणमा उपलब्ध इमेल एपमा सन्देशको मस्यौदा तयार गर्छ। यसले आफ्नै पात्रोमा फारामको विवरण सिधै पठाउँदैन; तपाईंले मस्यौदा जाँचेर इमेल एपबाट पठाउने निर्णय गर्नुहुन्छ। पठाइएको इमेल त्यसपछि तपाईंको इमेल प्रदायक र प्राप्तकर्ता प्रणालीबाट प्रशोधन हुन्छ।",
        en: "The contact form creates a draft in the email application available on your device. It does not directly submit the form fields to Aafnai Patro; you review the draft and decide whether to send it through your email application. Once sent, the email is handled by your email provider and the recipient’s systems."
      },
      {
        ne: "स्थानीय जानकारीको नियन्त्रणका लागि सम्बन्धित सुविधाका विकल्प वा ब्राउजर भण्डारण व्यवस्थापन प्रयोग गर्नुहोस्। खाता वा सिङ्कमार्फत राखिएको डेटा हटाउने वा गोपनीयतासम्बन्धी प्रश्नका लागि इमेल गर्नुहोस्; अनुरोधसँग सम्बन्धित सुविधा वा विवरण उल्लेख गर्नुहोस्। आवश्यक सहयोगका लागि पासवर्ड, प्रमाणीकरण कोड वा पूर्ण भुक्तानी विवरण नपठाउनुहोस्।",
        en: "Use the relevant feature controls or browser-storage settings to manage local information. For questions about account- or sync-related data removal and privacy, contact us by email and identify the feature involved. Do not send passwords, authentication codes, or full payment details when requesting support."
      }
    ],
    links: [{ href: "mailto:" + SUPPORT_EMAIL, label: { ne: "गोपनीयतासम्बन्धी प्रश्नका लागि इमेल गर्नुहोस्", en: "Email us about a privacy question" } }]
  },
  {
    title: { ne: "नीतिमा परिवर्तन", en: "Policy updates" },
    paragraphs: [
      {
        ne: "सेवाका सुविधा, प्रदायक वा डेटा प्रवाह परिवर्तन हुँदा यो विवरण अद्यावधिक गर्न आवश्यक हुन सक्छ। पृष्ठमा देखिएको पछिल्लो प्रकाशित संस्करण पढ्नुहोस्। गोपनीयतासम्बन्धी महत्वपूर्ण प्रश्न वा अस्पष्टता भएमा सम्पर्क गर्नुहोस्।",
        en: "This notice may need updating when product features, providers, or data flows change. Refer to the latest published version of this page. Contact us if you have a material privacy question or need clarification."
      }
    ]
  }
];

const TERMS_SECTIONS: ContentSection[] = [
  {
    title: { ne: "१. सर्तको दायरा", en: "1. Scope of these terms" },
    paragraphs: [
      {
        ne: "आफ्नै पात्रोमा पहुँच वा यसको सुविधा प्रयोग गरेर तपाईं यी सर्त र लागू हुने गोपनीयता विवरण पढ्ने तथा उचित रूपमा पालना गर्ने सहमति जनाउनुहुन्छ। कुनै विशिष्ट सुविधामा छुट्टै सर्त, अनुमति वा तेस्रो-पक्ष प्रदायकको नियम देखाइएको छ भने ती पनि लागू हुन सक्छन्। लागू कानूनले उपभोक्तालाई दिने अनिवार्य अधिकारलाई यी सामान्य सर्तले हटाउने उद्देश्य राख्दैनन्।",
        en: "By accessing Aafnai Patro or using its features, you agree to read and reasonably follow these terms and the applicable privacy notice. A particular feature may also be subject to its own conditions, permissions, or third-party provider rules. These general terms are not intended to remove any mandatory consumer rights provided by applicable law."
      }
    ]
  },
  {
    title: { ne: "२. जानकारीको प्रकृति र निर्णय", en: "2. Nature of information and decision-making" },
    paragraphs: [
      {
        ne: "पात्रो, मिति रूपान्तरण, तिथि, पञ्चाङ्ग, खगोलीय विवरण, ऐतिहासिक सन्दर्भ र ज्योतिषसम्बन्धी सामग्री सामान्य जानकारी तथा सन्दर्भका लागि उपलब्ध गराइन्छ। गणना, प्रकाशित अभिलेख, समय क्षेत्र, स्थान, प्रयोगकर्ताले दिएको विवरण वा परम्परागत पद्धतिमा निर्भर भएर परिणाम फरक पर्न सक्छ। औपचारिक समयसीमा वा महत्वपूर्ण कामका लागि आधिकारिक स्रोत वा योग्य विशेषज्ञसँग पुष्टि गर्नुहोस्।",
        en: "Calendar entries, date conversions, tithi, Panchang, astronomical details, historical context, and astrology-related content are provided for general information and reference. Results may vary with calculation methods, published records, time zones, location, user-provided details, or traditional conventions. Verify important deadlines and consequential decisions with an authoritative source or appropriately qualified professional."
      },
      {
        ne: "राशिफल र ज्योतिषीय व्याख्या परम्परामा आधारित हुन्छन्; तिनलाई निश्चित भविष्यवाणी, वैज्ञानिक तथ्य वा कानुनी, चिकित्सकीय, वित्तीय वा अन्य व्यावसायिक सल्लाहको विकल्पका रूपमा प्रयोग नगर्नुहोस्।",
        en: "Horoscopes and astrological interpretations are tradition-based content. Do not treat them as guaranteed predictions, established scientific facts, or substitutes for legal, medical, financial, or other professional advice."
      }
    ]
  },
  {
    title: { ne: "३. प्रयोगकर्ताको जिम्मेवारी", en: "3. Your responsibilities" },
    paragraphs: [
      {
        ne: "सेवा प्रयोग गर्दा सही इनपुट दिनुहोस्, आफ्नो खाताको पहुँच सुरक्षित राख्नुहोस् र सार्वजनिक वा साझा उपकरणमा संवेदनशील जानकारी राख्दा सावधानी अपनाउनुहोस्। सेवा अवरुद्ध पार्ने, सुरक्षा नियन्त्रण छल्ने, अरूको गोपनीयता उल्लङ्घन गर्ने, अनधिकृत पहुँच प्रयास गर्ने वा लागू नियम विपरीत सामग्री वितरण गर्ने उद्देश्यले सुविधा प्रयोग नगर्नुहोस्।",
        en: "Provide accurate inputs, protect access to your accounts, and take care when saving sensitive information on public or shared devices. Do not use the service to disrupt availability, bypass security controls, violate another person’s privacy, attempt unauthorized access, or distribute material contrary to applicable rules."
      }
    ]
  },
  {
    title: { ne: "४. बाह्य सेवा र सामग्री", en: "4. External services and content" },
    paragraphs: [
      {
        ne: "लाइभ मिडिया, तेस्रो-पक्ष इम्बेड, साइन-इन, विज्ञापन वा अन्य बाह्य एकीकरण सम्बन्धित प्रदायकको उपलब्धता, नेटवर्क, नीतिगत परिवर्तन र अनुमति वा अधिकारमा निर्भर हुन सक्छ। आफ्नै पात्रोले त्यस्तो बाह्य सेवाको निरन्तर उपलब्धता वा सामग्रीमा परिवर्तन नहुने प्रत्याभूति दिन सक्दैन। बाह्य सेवासँगको तपाईंको सम्बन्धमा त्यस प्रदायकका सर्त पनि लागू हुन सक्छन्।",
        en: "Live media, third-party embeds, sign-in, advertising, and other external integrations may depend on provider availability, networks, policy changes, and permissions or distribution rights. Aafnai Patro cannot guarantee that such services will remain continuously available or unchanged. Your use of an external service may also be governed by that provider’s terms."
      }
    ]
  },
  {
    title: { ne: "५. सेवा परिवर्तन र उपलब्धता", en: "5. Changes and availability" },
    paragraphs: [
      {
        ne: "विश्वसनीयता, सुरक्षा, मर्मतसम्भार वा उत्पादन विकासका लागि सुविधा परिवर्तन, अद्यावधिक, अस्थायी रूपमा रोक्का वा बन्द हुन सक्छन्। सम्भव भएसम्म स्थिर पहुँच कायम राख्ने प्रयास गरिन्छ, तर निरन्तर, त्रुटिरहित वा अविच्छिन्न सञ्चालनको ग्यारेन्टी दिइँदैन। केही सुविधा ब्राउजर, उपकरण, नेटवर्क वा तेस्रो-पक्ष निर्भरताअनुसार फरक चल्न सक्छन्।",
        en: "Features may be changed, updated, temporarily suspended, or discontinued for reliability, security, maintenance, or product development. We aim to keep the service accessible where reasonably possible, but continuous, error-free, or uninterrupted operation cannot be guaranteed. Some features may behave differently depending on the browser, device, network, or third-party dependencies."
      }
    ]
  },
  {
    title: { ne: "६. सामग्री र उचित प्रयोग", en: "6. Content and acceptable use" },
    paragraphs: [
      {
        ne: "वेबसाइटका सामग्री, दृश्य प्रस्तुति, सफ्टवेयर र ब्रान्डसम्बन्धी अधिकार सम्बन्धित अधिकारधनीमा रहन्छन्, जहाँ अन्यथा उल्लेख गरिएको छैन। लागू कानूनले अनुमति दिएको प्रयोग वा अधिकारधनीको लिखित अनुमति बाहेक सामग्रीलाई भ्रामक रूपमा पुनःप्रकाशन, व्यावसायिक रूपमा नक्कल वा अधिकार उल्लङ्घन हुने गरी प्रयोग नगर्नुहोस्। स्रोत उद्धरण वा सार्वजनिक पहुँच हुनु मात्रले सबै सामग्री पुनःप्रयोग गर्न स्वतः अनुमति दिएको अर्थ हुँदैन।",
        en: "Rights in the website’s content, visual presentation, software, and branding remain with their respective rights holders unless stated otherwise. Except where permitted by applicable law or authorized in writing by the rights holder, do not republish content misleadingly, copy it commercially, or use it in a way that infringes rights. A source citation or public availability does not automatically grant permission to reuse all material."
      }
    ]
  },
  {
    title: { ne: "७. अस्वीकरण र दायित्वका सीमा", en: "7. Disclaimers and limits" },
    paragraphs: [
      {
        ne: "लागू कानूनले अनुमति दिएको अधिकतम सीमासम्म, सेवा र उपलब्ध सामग्री कुनै विशेष उद्देश्यका लागि उपयुक्तता, पूर्णता, निरन्तर उपलब्धता वा सबै परिस्थितिमा त्रुटिरहित हुने स्पष्ट वा निहित प्रत्याभूति बिना उपलब्ध गराइन्छ। सेवा प्रयोग वा प्रयोग गर्न नसक्ने अवस्थाबाट उत्पन्न हुने परिणामका लागि कानूनले अनिवार्य बनाएको दायित्व बाहेक कुनै दायित्व स्वतः स्वीकार गरिएको मानिँदैन। यो व्यवस्था लागू कानूनअन्तर्गत हटाउन नमिल्ने अधिकारलाई सीमित गर्न प्रयोग गरिँदैन।",
        en: "To the maximum extent permitted by applicable law, the service and its content are provided without a promise that they will be suitable for every purpose, complete, continuously available, or error-free in every circumstance. No liability is assumed automatically for consequences arising from use of, or inability to use, the service beyond responsibilities that applicable law makes mandatory. This provision does not exclude rights or responsibilities that cannot lawfully be excluded."
      }
    ]
  },
  {
    title: { ne: "८. गोपनीयता र सम्पर्क", en: "8. Privacy and contact" },
    paragraphs: [
      {
        ne: "व्यक्तिगत जानकारीको सम्भावित भण्डारण, बाह्य सेवा र उपलब्ध नियन्त्रणबारे गोपनीयता नीति पढ्नुहोस्। सर्त, सामग्री वा सेवा प्रयोगसम्बन्धी प्रश्नका लागि सम्पर्क पृष्ठ प्रयोग गर्नुहोस्।",
        en: "Read the privacy policy for information about possible data storage, external services, and available controls. Use the contact page for questions about these terms, content, or use of the service."
      }
    ],
    links: [
      { href: "/privacy", label: { ne: "गोपनीयता नीति हेर्नुहोस्", en: "Read the privacy policy" } },
      { href: "/contact", label: { ne: "आफ्नै पात्रोलाई सम्पर्क गर्नुहोस्", en: "Contact Aafnai Patro" } }
    ]
  }
];

const CONTACT_SECTIONS: ContentSection[] = [
  {
    title: { ne: "कस्तो विषयमा सम्पर्क गर्ने?", en: "What can you contact us about?" },
    paragraphs: [
      {
        ne: "तपाईं प्राविधिक समस्या, सुविधा प्रयोगसम्बन्धी प्रश्न, भाषा वा पहुँचसम्बन्धी सुझाव, स्रोतको स्पष्टता, मिडिया लिङ्कको समस्या वा पात्रो/सामग्रीमा देखिएको सम्भावित त्रुटिबारे सम्पर्क गर्न सक्नुहुन्छ। गोपनीयता वा आफ्नो जानकारीसम्बन्धी प्रश्नका लागि पनि सन्देश पठाउन सक्नुहुन्छ।",
        en: "You can contact us about technical problems, product questions, language or accessibility suggestions, unclear sourcing, broken media links, or possible errors in calendar or editorial content. You may also contact us with a privacy question about how your information is handled."
      }
    ]
  },
  {
    title: { ne: "तथ्य-सुधार रिपोर्टलाई उपयोगी बनाउनुहोस्", en: "Make a correction report actionable" },
    paragraphs: [
      {
        ne: "पात्रो वा तिथि सम्बन्धी रिपोर्टमा सम्बन्धित पृष्ठको URL, मिति, स्थान वा समय क्षेत्र, वेबसाइटमा देखिएको मान, तपाईंले अपेक्षा गरेको मान र तुलना गरिएको स्रोतको नाम वा लिङ्क समावेश गर्नुहोस्। खगोलीय वा ज्योतिषीय परिणामका लागि इनपुट जन्म मिति/समय/स्थानमध्ये कुन प्रयोग गरिएको हो भन्नु उपयोगी हुन्छ; सार्वजनिक रूपमा पठाउन नचाहेको जन्म विवरण वा अन्य संवेदनशील जानकारी समावेश नगर्नुहोस्।",
        en: "For a calendar or tithi report, include the page URL, date, location or time zone, value shown on the website, value you expected, and the name or link of the source used for comparison. For an astronomical or astrology-related result, it can help to identify which date, time, and location inputs were used; do not include birth details or other sensitive information that you do not wish to share."
      }
    ]
  },
  {
    title: { ne: "प्राविधिक समस्या रिपोर्ट गर्दा", en: "When reporting a technical issue" },
    paragraphs: [
      {
        ne: "समस्या भएको पृष्ठ, समस्या दोहोर्‍याउन सकिने चरण, प्रयोग भइरहेको उपकरण तथा ब्राउजर र देखिएको त्रुटि सन्देश बताउनुहोस्। स्क्रिनसट थप्न सकिन्छ, तर पासवर्ड, प्रमाणीकरण कोड, सत्र टोकन, निजी नोट वा अन्य गोप्य विवरण स्क्रिनसट वा सन्देशमा नपार्नुहोस्।",
        en: "Tell us which page is affected, the steps needed to reproduce the issue, the device and browser you use, and any error message shown. A screenshot may help, but remove passwords, authentication codes, session tokens, private notes, or other confidential details before sharing it."
      }
    ]
  }
];

function setMeta(attribute: "name" | "property", key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>('meta[' + attribute + '="' + key + '"]');
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
}

function applyLocalizedMetadata(page: PageKey, language: UiLanguage) {
  const meta = PAGES[page];
  const title = l(language, meta.seoTitle.ne, meta.seoTitle.en) + " · " + l(language, "आफ्नै पात्रो", "Aafnai Patro");
  const description = l(language, meta.seoDescription.ne, meta.seoDescription.en);
  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", window.location.origin + "/" + page);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);

  const schema = document.getElementById("patro-route-schema") as HTMLScriptElement | null;
  if (schema) {
    try {
      const value = JSON.parse(schema.textContent || "{}") as Record<string, unknown>;
      value.name = title;
      value.description = description;
      value.inLanguage = language;
      schema.textContent = JSON.stringify(value);
    } catch {
      // The main route metadata remains usable if a schema payload is malformed.
    }
  }
}

export function TrustPage({ page }: { page: PageKey }) {
  const language = useUiLanguage();
  const meta = PAGES[page];
  const Icon = meta.icon;

  useEffect(() => {
    applyRouteSeo("/" + page);
    let active = true;
    // AppChrome also refreshes route metadata. Queue the localized values after
    // all route effects so an English page is not reset to Nepali metadata.
    queueMicrotask(() => {
      if (active) applyLocalizedMetadata(page, language);
    });
    return () => { active = false; };
  }, [page, language]);

  return (
    <main className="mp-page mp-trust">
      <nav className="mp-breadcrumb" aria-label={l(language, "स्थानक्रम", "Breadcrumb")}>
        <a href="/">{l(language, "आफ्नै पात्रो", "Aafnai Patro")}</a>
        <span>/</span>
        <span>{l(language, meta.title.ne, meta.title.en)}</span>
      </nav>
      <header className="mp-page-hero">
        <Icon size={28} aria-hidden="true" />
        <p className="eyebrow">{l(language, meta.eyebrow.ne, meta.eyebrow.en)}</p>
        <h1>{l(language, meta.title.ne, meta.title.en)}</h1>
        <p>{l(language, meta.description.ne, meta.description.en)}</p>
      </header>
      {page === "about" && <ContentSections sections={ABOUT_SECTIONS} language={language} />}
      {page === "sources" && <ContentSections sections={SOURCE_SECTIONS} language={language} />}
      {page === "privacy" && <ContentSections sections={PRIVACY_SECTIONS} language={language} />}
      {page === "terms" && <ContentSections sections={TERMS_SECTIONS} language={language} />}
      {page === "contact" && <Contact language={language} />}
    </main>
  );
}

function ContentSections({ sections, language }: { sections: ContentSection[]; language: UiLanguage }) {
  return (
    <div className="mp-prose">
      {sections.map((section) => (
        <section key={section.title.en}>
          <h2>{l(language, section.title.ne, section.title.en)}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{l(language, paragraph.ne, paragraph.en)}</p>
          ))}
          {section.links?.map((resource) => (
            <p key={resource.href}>
              <a
                href={resource.href}
                target={resource.external ? "_blank" : undefined}
                rel={resource.external ? "noopener noreferrer" : undefined}
              >
                {l(language, resource.label.ne, resource.label.en)}
              </a>
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function Contact({ language }: { language: UiLanguage }) {
  const [status, setStatus] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const subject = l(language, "आफ्नै पात्रो सम्पर्क", "Aafnai Patro contact") + " — " + (name || l(language, "वेबसाइट प्रतिक्रिया", "Website feedback"));
    const body = [
      l(language, "नाम", "Name") + ": " + name,
      l(language, "इमेल", "Email") + ": " + email,
      "",
      message
    ].join("\n");

    setStatus(l(language, "तपाईंको इमेल एपमा सन्देशको मस्यौदा खोलिँदैछ…", "Opening a message draft in your email application…"));
    window.location.href = "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  return (
    <>
      <ContentSections sections={CONTACT_SECTIONS} language={language} />
      <section className="mp-contact-card">
        <div className="mp-contact-direct">
          <strong>{l(language, "प्रत्यक्ष इमेल", "Email us directly")}</strong>
          <p>
            {l(language, "सहयोग वा तथ्य-सुधारका लागि", "For support or a correction, email")}{" "}
            <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
        <form onSubmit={submit}>
          <label>
            {l(language, "नाम", "Name")}
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
          <label>
            {l(language, "इमेल ठेगाना", "Email address")}
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            {l(language, "सन्देश", "Message")}
            <textarea
              name="message"
              required
              minLength={5}
              maxLength={5000}
              rows={7}
              aria-describedby="mp-contact-note"
            />
          </label>
          <button type="submit">
            <Send size={17} aria-hidden="true" />
            {l(language, "इमेल मस्यौदा तयार गर्नुहोस्", "Prepare email draft")}
          </button>
          <p className="mp-contact-note" id="mp-contact-note">
            {l(
              language,
              "यो फारामले वेबसाइटमा सन्देश सिधै पठाउँदैन। यसले तपाईंको इमेल एपमा मस्यौदा खोल्छ; पठाउनु अघि प्राप्तकर्ता र सन्देश जाँच गर्नुहोस्।",
              "This form does not submit a message directly to the website. It opens a draft in your email application; review the recipient and message before sending."
            )}
          </p>
          {status && <p role="status" className="mp-contact-status">{status}</p>}
        </form>
      </section>
    </>
  );
}

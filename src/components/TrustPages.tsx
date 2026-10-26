import { useEffect, useState, type FormEvent } from "react";
import { Info, BookOpenText, ShieldCheck, Scale, MessageSquare, Send } from "lucide-react";
import { applyRouteSeo } from "../seo";
import type { UiLanguage } from "../i18n";
import { l, useUiLanguage } from "../useUiLanguage";
import platform from "../content/platform.json";
import content from "../content/trust-pages.json";

type PageKey = keyof typeof platform.pages;
type Localized = { ne: string; en: string };
type ResourceLink = { href: string; label: Localized; external?: boolean };
type ContentSection = { id: string; title: Localized; paragraphs: Localized[]; links?: ResourceLink[] };
const SUPPORT_EMAIL = "meroaafnaipatro@gmail.com";
const PAGES = platform.pages;
const ICONS = { about: Info, sources: BookOpenText, privacy: ShieldCheck, terms: Scale, contact: MessageSquare, methodology: BookOpenText, corrections: MessageSquare };
const CONTACT_SECTIONS: ContentSection[] = content.contact;

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
  const title = l(language, meta.title.ne, meta.title.en) + (page === "about" ? "" : " · " + l(language, "आफ्नै पात्रो", "Aafnai Patro"));
  const description = l(language, meta.description.ne, meta.description.en);
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
  const Icon = ICONS[page];
  const sections: ContentSection[] = content[page];
  useEffect(() => {
    applyRouteSeo("/" + page);
    let active = true;
    // Run after AppChrome's route effect so the selected language wins.
    queueMicrotask(() => { if (active) applyLocalizedMetadata(page, language); });
    return () => { active = false; };
  }, [page, language]);
  return <main className="mp-page mp-trust" lang={language}>
    <nav className="mp-breadcrumb" aria-label={l(language, "स्थानक्रम", "Breadcrumb")}>
      <a href="/">{l(language, "आफ्नै पात्रो", "Aafnai Patro")}</a><span>/</span><span>{meta.title[language]}</span>
    </nav>
    <header className="mp-page-hero">
      <Icon size={28} aria-hidden="true" />
      <p className="eyebrow">{l(language, "आफ्नै पात्रो · परिचय र नीतिहरू", "Aafnai Patro · About and policies")}</p>
      <h1>{meta.title[language]}</h1><p>{meta.description[language]}</p>
      <p className="mp-policy-date">{l(language, "पछिल्लो अद्यावधिक: ", "Last updated: ")}<time dateTime={platform.updated}>{l(language, "२६ अक्टोबर २०२६", "26 October 2026")}</time></p>
    </header>
    <nav className="mp-policy-nav" aria-label={l(language, "परिचय र नीतिका पृष्ठहरू", "About and policy pages")}>
      {Object.entries(PAGES).map(([key, value]) => <a href={"/" + key} key={key} aria-current={key === page ? "page" : undefined}>{value.title[language]}</a>)}
    </nav>
    <details className="mp-policy-contents"><summary>{l(language, "यस पृष्ठमा", "On this page")}</summary>
      <ol>{sections.map(section => <li key={section.id}><a href={"#" + section.id}>{section.title[language]}</a></li>)}</ol>
    </details>
    {page === "contact" ? <Contact language={language} /> : <ContentSections sections={sections} language={language} />}
  </main>;
}

function ContentSections({ sections, language }: { sections: ContentSection[]; language: UiLanguage }) {
  return <div className="mp-prose">
    {sections.map(section => <section key={section.id} id={section.id}>
      <h2>{section.title[language]}</h2>
      {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph[language]}</p>)}
      {section.links?.map(resource => <p key={resource.href}><a href={resource.href}
        target={resource.external ? "_blank" : undefined}
        rel={resource.external ? "noopener noreferrer" : undefined}>{resource.label[language]}</a></p>)}
    </section>)}
  </div>;
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

const LABELS: Record<string, { title: string; description: string }> = {
  "tithi-reminder": { title: "तिथि रिमाइन्डर", description: "श्राद्ध, तिथि जन्मदिन र पात्रो रिमाइन्डर" },
  sait: { title: "साइत", description: "आधिकारिक मिति पहिलो, गणना गरिएको मिति सम्भावित" },
  "baby-names": { title: "नक्षत्र अनुसार नाम", description: "नाम, न्वारन, पास्नी र खोप समयरेखा" },
  "janmadin-akhbar": { title: "जन्मदिन अखबार", description: "जन्म दिनको इतिहास र पात्रोबाट शेयर कार्ड" },
  "future-letter": { title: "भविष्यको चिठी", description: "वि.सं. मिति वा तिथि जन्मदिनमा खुल्ने निजी चिठी" },
  "spell-check": { title: "नेपाली हिज्जे जाँच", description: "नेपाली पाठको हिज्जे र सुझाव" },
  "voice-typing": { title: "आवाजबाट नेपाली टाइपिङ", description: "ब्राउजर वा वैकल्पिक सुरक्षित speech API" },
  ocr: { title: "नेपाली OCR", description: "तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्" },
  "name-check": { title: "नाम जाँच", description: "नाम र नक्षत्र अक्षर मिलान" },
  "read-aloud": { title: "पढेर सुनाउनुहोस्", description: "नेपाली सामग्री आवाजमा सुन्नुहोस्" },
  "patro-bot": { title: "Patro Bot", description: "पात्रो, तिथि र रिमाइन्डर सहायक" },
};

export function PatroToolsShell({ slug }: { slug: string }) {
  const meta = LABELS[slug] ?? { title: "उपकरण", description: "Mero Patro tool" };
  return (
    <main className="utility-suite patro-tool-shell">
      <section className="utility-hero">
        <div>
          <p className="eyebrow">मेरो पात्रो · नयाँ उपकरण</p>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        <span className="utility-status is-online">Nepali-first · local-first</span>
      </section>
      <section className="utility-card">
        <p className="utility-note">यो पृष्ठ चरणबद्ध एकीकरणमा छ। यसको मूल गणना Mero Patro को विद्यमान BS र पञ्चाङ्ग इन्जिनसँग जोडिएको छ।</p>
        <a className="utility-secondary" href="/tools">← सबै उपकरण</a>
      </section>
    </main>
  );
}

export const PATRO_TOOL_SLUGS = new Set(Object.keys(LABELS));

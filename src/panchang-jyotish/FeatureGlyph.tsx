export const FEATURE_ICON_BY_ID: Record<string, string> = {
  F001:"calendar", F002:"moon", F003:"clock", F004:"nakshatra", F005:"yoga", F006:"karana",
  F007:"sun-moon", F008:"lunar-calendar", F009:"calendar-cycle", F010:"sunrise", F011:"timeline",
  F012:"clock", F013:"sunrise", F014:"moonrise", F015:"day-segment", F016:"day-cycle",
  F017:"clock", F018:"sun-star", F019:"dawn", F020:"segments", F021:"nakshatra", F022:"gandamoola",
  F023:"karana", F024:"star-compass", F025:"ingress", F026:"moon-calendar",
  F027:"chart", F028:"question-chart", F029:"bird", F030:"gem", F031:"beads", F032:"node-axis",
  F033:"saturn", F034:"moon", F035:"nakshatra", F036:"ascendant", F037:"sun", F038:"shield",
  F039:"rings", F040:"scroll", F041:"full-moon-series", F042:"clock", F043:"baby-name", F044:"planet",
  F045:"orbit", F046:"planet", F047:"ingress", F048:"nakshatra", F049:"conjunction", F050:"aspect",
  F051:"retrograde", F052:"sun-star", F053:"planet", F054:"telescope", F055:"rings", F056:"house",
  F057:"vehicle", F058:"document", F059:"ritual", F060:"star", F061:"star", F062:"double-star",
  F063:"triple-star", F064:"sun-star", F065:"star", F066:"sun-star", F067:"personal-time",
  F068:"moon-calendar", F069:"moon", F070:"eclipse", F071:"eclipse", F072:"solstice", F073:"sun",
  F074:"seasons", F075:"solstice", F076:"planet", F077:"sun-star", F078:"retrograde", F079:"seasons",
  F080:"calendar", F081:"mandala", F082:"calendar-sun", F083:"clock", F084:"calendar",
  F085:"festival", F086:"calendar-sun", F087:"calendar-book", F088:"lunar-calendar", F089:"temple",
  F090:"globe-calendar", F091:"music"
};

export const FEATURE_ICON_SYMBOLS = [
  "calendar","moon","clock","nakshatra","yoga","karana","sun-moon","lunar-calendar","calendar-cycle",
  "timeline","sunrise","moonrise","day-segment","day-cycle","star","orbit","sun-star","dawn","segments",
  "gandamoola","star-compass","ingress","ritual","chart","question-chart","bird","gem","beads","node-axis",
  "saturn","ascendant","sun","shield","rings","scroll","full-moon-series","baby-name","planet","retrograde",
  "conjunction","aspect","telescope","house","vehicle","document","festival","double-star","triple-star",
  "eclipse","solstice","seasons","mandala","calendar-sun","globe-calendar","temple","music","personal-time",
  "calendar-book","moon-calendar"
] as const;

type IconSymbol = typeof FEATURE_ICON_SYMBOLS[number];
type Props = {
  featureId: string;
  className?: string;
  decorative?: boolean;
  size?: "card" | "hero" | "inline";
  title?: string;
};

/** A local same-origin SVG sprite; all 91 features resolve to a pictogram without remote requests. */
export function FeatureGlyph({featureId,className="",decorative=true,size="card",title}:Props) {
  const requested = FEATURE_ICON_BY_ID[featureId] as IconSymbol | undefined;
  const icon = requested && (FEATURE_ICON_SYMBOLS as readonly string[]).includes(requested) ? requested : "calendar";
  const classes = ["ap-pj-icon", "ap-pj-icon--"+size, className].filter(Boolean).join(" ");
  const label = title || featureId;
  return <svg className={classes} viewBox="0 0 32 32" focusable="false" aria-hidden={decorative ? true : undefined} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label}>
    {!decorative && <title>{label}</title>}
    <use href={"/icons/panchang-jyotish.svg#"+icon} />
  </svg>;
}

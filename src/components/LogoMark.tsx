export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect width="100" height="100" rx="22" fill="currentColor" />
      <text x="50" y="66" textAnchor="middle" fill="white" fontSize="55" fontWeight="700" fontFamily="'Noto Serif Devanagari','Mukta',sans-serif">आ</text>
    </svg>
  );
}

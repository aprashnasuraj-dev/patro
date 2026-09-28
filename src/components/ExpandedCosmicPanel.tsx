import type { ReactNode } from "react";

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  icon: string;
  badge?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function ExpandedCosmicPanel({
  id,
  eyebrow,
  title,
  icon,
  badge,
  children,
  defaultOpen = false
}: Props) {
  return (
    <details id={id} className="cosmic-panel glass-panel" open={defaultOpen}>
      <summary className="cosmic-panel__summary">
        <span className="cosmic-panel__icon" aria-hidden="true">{icon}</span>
        <span className="cosmic-panel__heading">
          <span className="eyebrow">{eyebrow}</span>
          <strong>{title}</strong>
        </span>
        {badge && <span className="cosmic-panel__badge">{badge}</span>}
        <span className="cosmic-panel__chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="cosmic-panel__body">{children}</div>
    </details>
  );
}

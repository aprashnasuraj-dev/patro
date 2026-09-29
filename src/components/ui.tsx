import { ReactNode } from "react";

export function Button({ children, variant="primary", className="", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost" }) {
  return <button className={`mp-button mp-button--${variant} ${className}`} {...props}>{children}</button>;
}
export function IconButton({ label, children, className="", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label:string; children:ReactNode }) {
  return <button className={`mp-icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}
export function Card({ children, className="" }: { children:ReactNode; className?:string }) {
  return <section className={`mp-card ${className}`}>{children}</section>;
}
export function Chip({ children, className="" }: { children:ReactNode; className?:string }) {
  return <span className={`mp-chip ${className}`}>{children}</span>;
}
export function Skeleton({ className="", label="Loading" }: { className?:string; label?:string }) {
  return <span className={`mp-skeleton ${className}`} role="status" aria-label={label} />;
}
export function EmptyState({ title, body, action }: { title:string; body:string; action?:ReactNode }) {
  return <div className="mp-empty"><div className="mp-empty__mark" aria-hidden="true" /><strong>{title}</strong><p>{body}</p>{action}</div>;
}
export function SectionHeader({ title, description, action }: { title:string; description?:string; action?:ReactNode }) {
  return <div className="mp-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

import type { ReactNode } from "react";

type DropdownProps = {
  label: string;
  children: ReactNode;
};

export function Dropdown({ label, children }: DropdownProps) {
  return (
    <details className="dropdown">
      <summary>
        {label}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="dropdown-menu">{children}</div>
    </details>
  );
}
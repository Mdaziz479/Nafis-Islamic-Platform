"use client";

import Link from "next/link";
import { useState } from "react";
import { MORE_NAVIGATION, PRIMARY_NAVIGATION } from "@/lib/constants/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AuthNavigation } from "@/components/auth/AuthNavigation";

export function MobileNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = [...PRIMARY_NAVIGATION, ...MORE_NAVIGATION].filter(
    (item) => item.href !== ROUTES.dashboard && item.href !== ROUTES.settings,
  );

  return (
    <div className="mobile-navigation">
      <Link className="icon-button" href={ROUTES.search} aria-label="Search">
        <span aria-hidden="true">⌕</span>
      </Link>
      <ThemeToggle />
      <button
        className="icon-button"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
      </button>
      {menuOpen ? (
        <nav id="mobile-menu" className="mobile-menu-panel" aria-label="Mobile navigation">
          {items.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <AuthNavigation mobile />
        </nav>
      ) : null}
    </div>
  );
}
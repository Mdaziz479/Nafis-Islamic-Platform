import Link from "next/link";
import { AuthNavigation } from "@/components/auth/AuthNavigation";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Container } from "@/components/ui/Container";
import { Dropdown } from "@/components/ui/Dropdown";
import { SearchInput } from "@/components/ui/SearchInput";
import { MORE_NAVIGATION, PRIMARY_NAVIGATION } from "@/lib/constants/navigation";
import { ROUTES } from "@/lib/constants/routes";

export function Navbar() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link className="brand" href={ROUTES.home} aria-label="Nafis home">
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <span>Nafis</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {PRIMARY_NAVIGATION.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Dropdown label="More">
            {MORE_NAVIGATION.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </Dropdown>
        </nav>
        <div className="header-actions">
          <SearchInput className="header-search" />
          <ThemeToggle />
          <AuthNavigation />
        </div>
        <MobileNavigation />
      </Container>
    </header>
  );
}

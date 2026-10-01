import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants/routes";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Quran", href: ROUTES.quran },
      { label: "Duas", href: ROUTES.duas },
      { label: "Prayer", href: ROUTES.prayer },
      { label: "Qibla", href: ROUTES.qibla },
      { label: "Islamic calendar", href: ROUTES.calendar },
    ],
  },
  {
    title: "Your space",
    links: [
      { label: "Ramadan", href: ROUTES.ramadan },
      { label: "Dashboard", href: ROUTES.dashboard },
      { label: "Settings", href: ROUTES.settings },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-grid">
          <div className="footer-brand-column">
            <Link className="brand" href={ROUTES.home}>
              <span className="brand-mark" aria-hidden="true">
                N
              </span>
              <span>Nafis</span>
            </Link>
            <p className="footer-brand-copy">
              A thoughtful space for trusted resources and a steadier daily rhythm.
            </p>
          </div>
          {footerGroups.map((group) => (
            <nav className="footer-column" key={group.title} aria-label={group.title}>
              <h2>{group.title}</h2>
              <div className="footer-links">
                {group.links.map((link) => (
                  <Link className="footer-link" href={link.href} key={link.label}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Nafis <span aria-hidden="true">·</span> Crafted &amp; developed by{" "}
            <strong className="footer-credit-name">Md Aziz Alam</strong> <span aria-hidden="true">·</span> Thoughtfully made, with care for every source.
          </span>
        </div>
      </Container>
    </footer>
  );
}
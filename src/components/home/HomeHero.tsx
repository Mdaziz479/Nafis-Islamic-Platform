import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants/routes";

export function HomeHero() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <Container className="hero-grid">
        <div>
          <span className="eyebrow">A quieter way to return</span>
          <h1 id="home-title">Make room for Quran in your day.</h1>
          <p className="hero-copy">
            Read at your own pace, with a calm space to continue whenever you are ready.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href={ROUTES.quran}>
              Read Quran <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-secondary" href="#quick-access-title">
              Explore
            </Link>
          </div>
        </div>
        <aside className="hero-aside" aria-label="Your reading space">
          <span className="aside-label">Your reading space</span>
          <h2>One reading at a time.</h2>
          <p>Your place for a steady reading rhythm, ready when you are.</p>
          <Link className="aside-link" href={ROUTES.quran}>
            Open reading space <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </Container>
    </section>
  );
}
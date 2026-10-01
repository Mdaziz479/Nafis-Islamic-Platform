import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants/routes";

export default function SurahNotFound() {
  return (
    <Container>
      <section className="surah-not-found" aria-labelledby="surah-not-found-title">
        <span className="eyebrow">Quran reader</span>
        <h1 id="surah-not-found-title">Surah not found</h1>
        <p>Choose a Surah from the list to continue.</p>
        <Link className="button button-primary" href={ROUTES.quran}>
          Back to Quran
        </Link>
      </section>
    </Container>
  );
}
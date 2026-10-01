import { HomeHero } from "@/components/home/HomeHero";
import { HomeProgressSection } from "@/components/home/HomeProgressSection";
import {
  DailyAyahSection,
  DailyDuaSection,
  QuickAccessSection,
} from "@/components/home/HomeSections";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="home-page">
      <HomeHero />
      <Container>
        <HomeProgressSection />
        <QuickAccessSection />
        <DailyAyahSection />
        <DailyDuaSection />
      </Container>
    </div>
  );
}

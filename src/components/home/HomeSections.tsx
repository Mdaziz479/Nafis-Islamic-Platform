import Link from "next/link";
import { DailyAyahCard, DailyDuaCard } from "@/components/home/DailyContentCards";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { QUICK_ACCESS_ITEMS } from "@/data/home";
import { getDailyDua } from "@/data/duas";
import { getDailyAyah } from "@/services/quran/daily-service";

export function QuickAccessSection() {
  return (
    <section className="content-section" aria-labelledby="quick-access-title">
      <SectionHeading
        id="quick-access-title"
        title="Quick access"
        eyebrow="Explore"
        description="Your most-used spaces, gathered in one place."
      />
      <div className="quick-grid">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <Link className="card quick-card" href={item.href} key={item.href}>
            <span className="quick-icon" aria-hidden="true">
              {item.mark}
            </span>
            <div className="quick-copy">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function DailyAyahSection() {
  const dailyAyah = await getDailyAyah();
  return (
    <section className="content-section" aria-labelledby="daily-ayah-title">
      <SectionHeading
        id="daily-ayah-title"
        title="Daily Ayah"
        eyebrow="Daily reflection"
        description="A deterministic daily selection from the verified Quran source."
      />
      <DailyAyahCard data={dailyAyah} />
    </section>
  );
}

export function DailyDuaSection() {
  const dua = getDailyDua();
  return (
    <section className="content-section" aria-labelledby="daily-dua-title">
      <SectionHeading
        id="daily-dua-title"
        title="Daily Dua"
        eyebrow="Daily reflection"
        description="A sourced supplication from the Qur’an or a cited hadith collection."
      />
      <DailyDuaCard data={dua} />
    </section>
  );
}

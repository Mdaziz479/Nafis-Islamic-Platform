import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RamadanPanel } from "@/components/islamic/RamadanPanel";
import { getHijriDate, getRamadanCalendar } from "@/services/islamic/aladhan";

export const metadata: Metadata = {
  title: "Ramadan",
  description: "Provider-calculated Ramadan dates with personal Quran progress and local prayer schedules.",
};

export default async function RamadanPage() {
  const today = new Date().toISOString().slice(0, 10);
  const hijri = await getHijriDate(today, "HJCoSA");
  if (!hijri.data) {
    return (
      <Container>
        <div className="route-placeholder">
          <SectionHeading level={1} eyebrow="Seasonal space" title="Ramadan" description="Dates require a reliable Hijri calendar source." />
          <EmptyState title="Ramadan dates unavailable" description={hijri.message ?? "Try again when the calendar provider is available."} />
        </div>
      </Container>
    );
  }

  const ramadanYear = hijri.data.month > 9 ? hijri.data.year + 1 : hijri.data.year;
  const ramadan = await getRamadanCalendar(ramadanYear, "HJCoSA");

  return (
    <Container>
      <div className="islamic-utility-page">
        <SectionHeading
          level={1}
          eyebrow="Seasonal planning"
          title="Ramadan"
          description="Dates follow the selected AlAdhan convention and may differ from local moon-sighting announcements."
        />
        <RamadanPanel
          today={today}
          hijriToday={hijri.data}
          ramadanYear={ramadanYear}
          initialDates={ramadan.data ?? []}
          initialMessage={ramadan.message}
        />
      </div>
    </Container>
  );
}
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HijriCalendarPanel } from "@/components/islamic/HijriCalendarPanel";
import { getHijriCalendar } from "@/services/islamic/aladhan";

export const metadata: Metadata = {
  title: "Islamic Calendar",
  description: "Hijri dates and source-listed observances from the AlAdhan calendar API.",
};

export default async function CalendarPage() {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  const calendar = await getHijriCalendar(month, year, "HJCoSA");
  return (
    <Container>
      <div className="islamic-utility-page">
        <SectionHeading
          level={1}
          eyebrow="Hijri and Gregorian dates"
          title="Islamic Calendar"
          description="Hijri conversion and observances are shown with the selected source convention."
        />
        <HijriCalendarPanel
          initialMonth={month}
          initialYear={year}
          today={today}
          initialDays={calendar.data ?? []}
          initialMessage={calendar.message}
        />
      </div>
    </Container>
  );
}
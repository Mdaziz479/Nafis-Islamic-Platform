import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PrayerTimesPanel } from "@/components/islamic/PrayerTimesPanel";

export const metadata: Metadata = {
  title: "Prayer Times",
  description: "Prayer schedule calculated for a location and method you choose.",
};

export default function PrayerPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Container>
      <div className="islamic-utility-page">
        <SectionHeading
          level={1}
          eyebrow="Daily schedule"
          title="Prayer Times"
          description="Choose the location and calculation method used for this schedule."
        />
        <PrayerTimesPanel today={today} />
      </div>
    </Container>
  );
}
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { QiblaPanel } from "@/components/islamic/QiblaPanel";

export const metadata: Metadata = {
  title: "Qibla Direction",
  description: "Find a provider-calculated Qibla bearing from a location you choose.",
};

export default function QiblaPage() {
  return (
    <Container>
      <div className="islamic-utility-page">
        <SectionHeading
          level={1}
          eyebrow="Direction tool"
          title="Qibla"
          description="Choose coordinates or explicitly share device location to calculate a bearing toward the Kaaba."
        />
        <QiblaPanel />
      </div>
    </Container>
  );
}
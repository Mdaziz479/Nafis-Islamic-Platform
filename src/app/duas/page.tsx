import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DuaLibrary } from "@/components/islamic/DuaLibrary";

export const metadata: Metadata = {
  title: "Duas",
  description: "A searchable collection of supplications from the Qur’an and cited hadith collections.",
};

export default function DuasPage() {
  return (
    <Container>
      <div className="islamic-utility-page duas-page">
        <SectionHeading
          level={1}
          eyebrow="Sourced supplications"
          title="Duas"
          description="Browse Qur’anic supplications and hadith with their original Arabic, transliteration, meaning, and source."
        />
        <DuaLibrary />
      </div>
    </Container>
  );
}
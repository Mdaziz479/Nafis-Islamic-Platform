import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage theme and Quran reader preferences.",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/account?next=%2Fsettings");

  return (
    <Container>
      <div className="route-placeholder settings-page">
        <SectionHeading
          level={1}
          eyebrow="Your preferences"
          title="Settings"
          description="Your theme and Quran reader preferences are saved on this device and synced when signed in."
        />
        <SettingsPanel />
      </div>
    </Container>
  );
}
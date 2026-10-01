import { AccountForm } from "@/components/account/AccountForm";
import { Container } from "@/components/ui/Container";

export default function AccountPage() {
  return (
    <Container>
      <section className="account-page" aria-labelledby="account-title">
        <div className="account-intro">
          <span className="account-eyebrow">YOUR READING SPACE</span>
          <h1 id="account-title">Your Quran journey, ready when you are.</h1>
          <p>
            Sign in to keep your reader preferences in sync, or create an
            account to get started.
          </p>
          <div className="account-note">
            <span className="account-note-mark" aria-hidden="true">01</span>
            <p>Your reading preferences stay on this device and sync after sign-in.</p>
          </div>
        </div>
        <AccountForm />
      </section>
    </Container>
  );
}

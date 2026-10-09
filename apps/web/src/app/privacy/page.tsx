import type { Metadata } from 'next';
import { Contact, LegalPage, LegalSection } from '@/features/legal/legal-page';

export const metadata: Metadata = { title: 'Privacy Policy' };

// The contact address comes from the server's settings, which are not known when the site is built.
export const dynamic = 'force-dynamic';

/**
 * What WorldRoot keeps about people and why. Every statement here describes
 * what the code does today; when that changes, change this page and its date
 * in the same commit.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lead="WorldRoot is a small, independent home for text roleplay. This page says what we keep about you, why, and what you can do about it. We do not sell your information, show ads, or use tracking or analytics services."
    >
      <LegalSection title="What We Keep">
        <p>
          <strong>Your account.</strong> Your email address, your display name and handle, and, if you sign up with a password, a scrambled
          form of that password that cannot be turned back into the original.
        </p>
        <p>
          <strong>Sign-in with Discord or Google.</strong> If you choose one of these, they tell us your name, your email address, your
          profile picture and an ID number for your account with them. We ask for nothing else. We cannot see your password, your servers,
          your contacts or your files, and we cannot post or act as you.
        </p>
        <p>
          <strong>What you make.</strong> Your profile, characters, worlds, scenes, posts, messages, friend list and the pictures you
          upload. Location and camera details hidden inside a picture are removed when you upload it.
        </p>
        <p>
          <strong>Sign-in records.</strong> Each time you sign in we record your IP address and the kind of browser you used, so that
          sessions can be kept secure and abuse can be investigated.
        </p>
        <p>
          <strong>Moderation records.</strong> Reports you make or that are made about you, and actions taken on accounts and communities.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          WorldRoot sets the cookies needed to keep you signed in, and remembers a few display choices in your browser. There are no
          advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="How We Use It">
        <ul>
          <li>To run the site: showing your writing to the people you share it with, and keeping you signed in.</li>
          <li>To tell you about things that involve you, such as replies and friend requests, inside WorldRoot.</li>
          <li>To keep the site safe: looking into reports, and stopping spam and abuse.</li>
        </ul>
        <p>We do not use your writing to train AI systems, and we do not give or sell it to anyone who would.</p>
      </LegalSection>

      <LegalSection title="Who Can See What">
        <p>
          Your profile, and anything you post in a community or scene, can be seen by the people who can open that place. Public communities
          and profiles can be seen by anyone.
        </p>
        <p>
          Direct messages are private between the people in them, but they are not end-to-end encrypted. WorldRoot staff, called
          Rootwardens, may look at content when it has been reported or when it is needed to investigate abuse or keep the site running.
        </p>
      </LegalSection>

      <LegalSection title="Who We Share It With">
        <ul>
          <li>
            <strong>Our hosting company, Railway,</strong> which runs the servers and the database that WorldRoot lives on. These may be in
            a different country from you.
          </li>
          <li>
            <strong>Discord or Google,</strong> only if you choose to sign in with them, and only what is needed to sign you in.
          </li>
          <li>
            <strong>The authorities,</strong> when the law requires it, or when it is needed to protect someone from serious harm.
          </li>
        </ul>
        <p>Nobody else.</p>
      </LegalSection>

      <LegalSection title="How Long We Keep It">
        <p>
          We keep your account and what you have made for as long as your account exists. When an account is deleted, its personal details
          are removed. Moderation records may be kept longer where they are needed to keep the site safe, and copies may remain in backups
          for a short time.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices">
        <ul>
          <li>You can change your profile, handle and pictures, and remove a sign-in method, in Settings.</li>
          <li>You can block anyone, and report anything.</li>
          <li>
            You can ask for a copy of your information, ask us to correct it, or ask us to delete your account. There is no button for
            these yet, so please <Contact /> and we will do it by hand.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Adults Only">
        <p>
          WorldRoot is for people aged 18 and over. We do not knowingly keep information about anyone younger. If you believe someone under
          18 has an account, please tell us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection title="Changes And Contact">
        <p>
          If this policy changes in a way that matters, we will say so on WorldRoot before the change takes effect. The date at the top
          shows when it last changed.
        </p>
        <p>
          For any question about your information, <Contact />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

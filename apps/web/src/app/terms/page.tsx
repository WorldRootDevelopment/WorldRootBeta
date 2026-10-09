import type { Metadata } from 'next';
import Link from 'next/link';
import { textLinkClass } from '@/features/identity/auth-card';
import { Contact, LegalPage, LegalSection } from '@/features/legal/legal-page';

export const metadata: Metadata = { title: 'Terms Of Service' };

// The contact address comes from the server's settings, which are not known when the site is built.
export const dynamic = 'force-dynamic';

/** The agreement between WorldRoot and the people who use it. Change the date in legal-page.tsx whenever this wording changes. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms Of Service"
      lead="These are the rules for using WorldRoot. By creating an account or using the site, you agree to them. They are written to be read, so please do."
    >
      <LegalSection title="Who Can Use WorldRoot">
        <p>
          You must be <strong>18 or older</strong>. Accounts found to belong to anyone younger are removed.
        </p>
        <p>
          You are responsible for your account and for keeping your password to yourself. One person per account; do not share it or sell
          it.
        </p>
      </LegalSection>

      <LegalSection title="Your Writing Is Yours">
        <p>
          You keep every right you have in the characters, worlds, posts and pictures you put on WorldRoot. We claim no ownership of them.
        </p>
        <p>
          So that the site can work, you give us permission to store what you post, and to show it to the people you have shared it with.
          That permission ends when you delete the content or your account, apart from copies in backups and anything kept as a moderation
          record.
        </p>
        <p>
          Scenes are written together. When you leave a scene or a community, what you wrote there may stay so the story still makes sense
          to the others in it.
        </p>
        <p>Only post what you have the right to post.</p>
      </LegalSection>

      <LegalSection title="What Is Not Allowed">
        <ul>
          <li>Anything illegal, or anything that helps someone break the law.</li>
          <li>
            <strong>Sexual content involving anyone under 18,</strong> or any character who is or appears to be under 18. This includes
            fiction, and there are no exceptions.
          </li>
          <li>Harassing, threatening or stalking people, or encouraging others to.</li>
          <li>Hatred directed at people for who they are.</li>
          <li>Sharing someone&rsquo;s private information, or pretending to be a real person in order to deceive.</li>
          <li>Spam, scams, or advertising nobody asked for.</li>
          <li>Breaking into the site, getting around a block or a suspension, or collecting other people&rsquo;s information in bulk.</li>
          <li>Posting other people&rsquo;s work as your own.</li>
        </ul>
        <p>
          Dark themes are part of fiction and are welcome within these limits. Writing about something is not the same as doing it; the
          rules above are about harm to real people.
        </p>
      </LegalSection>

      <LegalSection title="Communities">
        <p>
          Communities are run by the members who created them. They may set rules stricter than these, and their owners and moderators
          decide who may take part. WorldRoot is not responsible for how a community is run, but every community must still follow these
          terms.
        </p>
      </LegalSection>

      <LegalSection title="Moderation">
        <p>
          WorldRoot staff, called Rootwardens, may remove content, and may suspend or close accounts and communities that break these
          terms. We try to say why. If you think we got it wrong, <Contact /> and a person will look again.
        </p>
      </LegalSection>

      <LegalSection title="Fan Works And Trademarks">
        <p>
          Some world templates and communities refer to existing books, games, films and shows. Those names belong to their owners.
          WorldRoot is not affiliated with, sponsored by or endorsed by any of them.
        </p>
        <p>
          If you own something that has been posted here without permission, <Contact /> with what it is and where it appears, and we will
          deal with it promptly.
        </p>
      </LegalSection>

      <LegalSection title="No Promises">
        <p>
          WorldRoot is new, and it is run by a very small team. It is offered as it is. It may be slow, unavailable, or change without
          warning, and although we work hard to protect what you write, we cannot promise it will never be lost.{' '}
          <strong>Keep your own copy of anything you could not bear to lose.</strong>
        </p>
        <p>
          As far as the law allows, WorldRoot is not liable for losses that come from using the site, from what other people post on it, or
          from it being unavailable.
        </p>
      </LegalSection>

      <LegalSection title="Leaving">
        <p>
          You can stop using WorldRoot at any time, and you can ask us to delete your account. How your information is handled is described
          in the{' '}
          <Link href="/privacy" className={textLinkClass}>
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes And Contact">
        <p>
          If these terms change in a way that matters, we will say so on WorldRoot before the change takes effect. Carrying on using the
          site after that means you accept the new terms.
        </p>
        <p>
          For any question about these terms, <Contact />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

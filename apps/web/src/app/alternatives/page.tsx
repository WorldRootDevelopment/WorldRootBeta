import { countLocations, findTemplate } from '@worldroot/core';
import { buttonClass, Wordmark } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Alternatives To Boycotted Franchises',
  description: 'Original universes, free to use, for writers who love a kind of story but have stepped away from the franchise that made it famous.',
};

const HEARTHS = [
  { name: 'Ashgrove', line: 'Makers and menders. If it is broken, they have already started on it.' },
  { name: 'Tidewatch', line: 'Patient observers who would rather understand a thing than win an argument about it.' },
  { name: 'Stonereach', line: 'Keepers of promises. Slow to give their word and impossible to shift once they have.' },
  { name: 'Galecrest', line: 'Restless and quick. First to volunteer, first to get bored.' },
  { name: 'Starfall', line: 'Night owls and question-askers. Curfew is a suggestion.' },
];

const DISCIPLINES = [
  { name: 'Lumenwork', line: 'Light, color and illusion.' },
  { name: 'Binding', line: 'Wards, oaths and agreements that hold.' },
  { name: 'Rootlore', line: 'Plants that heal, harm and listen.' },
  { name: 'Tidereading', line: 'Reading what comes next in the sea.' },
  { name: 'Beastfriending', line: 'Working alongside animals, ordinary and otherwise.' },
  { name: 'Mending', line: 'Healing bodies, and sometimes things.' },
];

const sectionHeading = 'font-display text-2xl font-semibold tracking-tight text-ink';
const body = 'mt-3 max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-ink';

export default async function AlternativesPage() {
  const viewer = await getViewer();
  const template = findTemplate('wizarding-school');
  const start = viewer ? '/library/worlds/templates' : '/sign-up?next=%2Flibrary%2Fworlds%2Ftemplates';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <Wordmark />
        </Link>
        <Link href={viewer ? '/home' : '/sign-in'} className={buttonClass('ghost')}>
          {viewer ? 'Go To Home' : 'Sign In'}
        </Link>
      </header>

      <main>
        <section className="py-12 md:py-16">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
            Alternatives To Boycotted Franchises
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Sometimes you love a kind of story and can no longer support the franchise that made it famous. You should not have to give up the
            stories too. These universes are original to WorldRoot, free for anyone to use, and open for you to change and build on.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">This page is a beginning. More universes will be added over time.</p>
        </section>

        {/* Each universe takes its own accent, the way a community does. */}
        <article className="wr-accent-scope wr-glass rounded-3xl p-6 md:p-10" style={{ '--wr-accent-hue': 285 } as CSSProperties}>
          <p className="text-sm font-medium text-accent-text">A School Of Magic, For Everyone</p>
          <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">Varrowmere</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">
            For writers who love stories about schools of magic but have chosen not to support the Harry Potter franchise or its author, J.K.
            Rowling. Varrowmere is a different world with its own rules, written from scratch. Nothing in it is borrowed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={start} className={buttonClass('primary', 'lg')}>
              {viewer ? 'Use The Varrowmere Template' : 'Create An Account To Use It'}
            </Link>
          </div>

          <section className="mt-12">
            <h3 className={sectionHeading}>The Kindled World</h3>
            <p className={body}>
              Everyone carries a spark. In most people it stays a spark for life. In a few it catches, and those people can learn to feed it
              and shape what it does. They are called the Kindled.
            </p>
            <p className={body}>
              The spark has nothing to do with family. It turns up in fishing villages and tower blocks, in children of the Kindled and
              children of people who have never seen magic done. It does not check who your parents were, where you come from or who you are.
              It can catch at eleven or at sixty.
            </p>
            <p className={body}>
              Magic is not a secret here. Under the Lantern Accord, an agreement older than most countries, the Kindled live openly among
              everyone else and are licensed like any other trade. A Kindled mender has a shopfront. A binder witnesses contracts. Most people
              have met one, and plenty are unimpressed.
            </p>
          </section>

          <section className="mt-12">
            <h3 className={sectionHeading}>The Academy</h3>
            <p className={body}>
              Varrowmere Academy stands on a tidal island off a cold coast. A causeway joins it to the mainland town of Saltmarket, and the
              sea covers that causeway twice a day. Miss the tide and you wait six hours, which is the excuse behind most late homework.
            </p>
            <p className={body}>
              Children arrive the autumn after their spark catches. Adults whose spark came late attend as evening students, sharing
              classrooms and occasionally Hearths with people a third their age. Nobody finds this strange.
            </p>
          </section>

          <section className="mt-12">
            <h3 className={sectionHeading}>Five Hearths, And You Choose</h3>
            <p className={body}>
              Students live in one of five Hearths. Nobody is sorted. New students spend their first term, the Wandering Term, living a
              fortnight in each, and at midwinter they choose where to stay. Anyone may change Hearth once, at any time, with no questions
              asked.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {HEARTHS.map((hearth) => (
                <li key={hearth.name} className="rounded-xl bg-accent-soft p-4">
                  <p className="font-display text-lg font-semibold text-ink">{hearth.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{hearth.line}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h3 className={sectionHeading}>How Magic Is Worked</h3>
            <p className={body}>
              Magic is worked through a focus: a small object the student makes with their own hands in their first year, from things they
              gather on the island. A whittled ring, a bone needle, a pendant of sea-glass. It cannot be bought and it will not work for
              anyone else. Losing one is survivable. Making a second is said to be much harder than making the first.
            </p>
            <p className={body}>The academy teaches six disciplines. Most students are strong in one or two and get by in the rest.</p>
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {DISCIPLINES.map((discipline) => (
                <div key={discipline.name}>
                  <dt className="font-medium text-ink">{discipline.name}</dt>
                  <dd className="text-sm text-ink-muted">{discipline.line}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12">
            <h3 className={sectionHeading}>Life On The Island</h3>
            <p className={body}>
              The year turns on Kindling Night, when each new student lights the lantern that will hang in the Lantern Hall until they leave.
              The Hearths compete at kitefall, racing storm-kites along the cliffs to carry the season lantern home. The library rearranges
              itself and nobody has ever been allowed onto its lowest floor.
            </p>
            <p className={body}>
              And something is wrong. In a few places along the coast, sparks have begun to go out. Lanterns that have burned for centuries
              are dimming. The staff call it the Guttering, and they talk about it less than they should.
            </p>
          </section>

          {template ? (
            <section className="mt-12">
              <h3 className={sectionHeading}>What The Template Gives You</h3>
              <p className={`${body} font-sans text-base text-ink-muted`}>
                {countLocations(template.locations)} places to start from, each ready to hold scenes, and a suggested character sheet. Your copy
                is yours to rename and reshape.
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {template.locations.map((location) => (
                  <li key={location.name}>
                    <span className="font-medium text-ink">{location.name}</span>
                    {location.children?.length ? <span className="block text-ink-muted">{location.children.map((child) => child.name).join(', ')}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-ink-muted">Character fields to consider: {template.suggestedFields.map((field) => field.label).join(', ')}.</p>
            </section>
          ) : null}

          <section className="mt-12 border-t border-line pt-8">
            <h3 className={sectionHeading}>Yours To Use</h3>
            <p className={`${body} font-sans text-base`}>
              Varrowmere belongs to the people who write in it. Run a community in it, change the Hearths, move the island, invent a seventh
              discipline. You do not need permission and you do not need to credit anyone.
            </p>
            <div className="mt-6">
              <Link href={start} className={buttonClass('primary', 'lg')}>
                {viewer ? 'Use The Varrowmere Template' : 'Create An Account To Use It'}
              </Link>
            </div>
          </section>
        </article>

        <section className="py-12">
          <h2 className={sectionHeading}>More To Come</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
            Varrowmere is the first. If there is a kind of story you miss and a franchise you have stepped away from, more original universes
            are on the way.
          </p>
        </section>
      </main>
    </div>
  );
}

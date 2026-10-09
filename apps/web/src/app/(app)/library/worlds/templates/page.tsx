import { countLocations, TEMPLATE_CATEGORIES, WORLD_TEMPLATES, type WorldTemplate } from '@worldroot/core';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs, SectionHeading } from '@/features/shell/prose';
import { UseTemplateButton } from '@/features/worlds/use-template-button';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'World templates' };

function TemplateCard({ template }: { template: WorldTemplate }) {
  const places = countLocations(template.locations);
  return (
    <article className="flex h-full flex-col wr-glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-semibold text-ink">{template.name}</h3>
        {template.popCulture ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-text">Pop culture</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">{template.summary}</p>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer rounded font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          {places} places · {template.suggestedFields.length} suggested character {template.suggestedFields.length === 1 ? 'field' : 'fields'}
        </summary>
        <p className="mt-3 leading-relaxed text-ink-muted">{template.description}</p>
        <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-muted">Starts with</h4>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink">
          {template.locations.map((location) => (
            <li key={location.name}>
              {location.name}
              {location.children?.length ? <span className="text-ink-muted">: {location.children.map((child) => child.name).join(', ')}</span> : null}
            </li>
          ))}
        </ul>
        <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-muted">Character fields to consider</h4>
        <p className="mt-1.5 text-ink">{template.suggestedFields.map((field) => field.label).join(', ')}</p>
        <p className="mt-1 text-ink-muted">A community running this world can add these under Settings, then Characters.</p>
      </details>

      <div className="mt-auto pt-5">
        <UseTemplateButton templateId={template.id} name={template.name} />
      </div>
    </article>
  );
}

export default async function WorldTemplatesPage() {
  await requireViewer();

  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: 'World templates' }]} />
      <PageHeader
        title="World templates"
        lead="Ready-made worlds to start from. Using one puts your own copy in your library, where you can rename it, change every place in it, and add it to a community."
      />
      {TEMPLATE_CATEGORIES.map((category) => {
        const templates = WORLD_TEMPLATES.filter((template) => template.category === category);
        if (templates.length === 0) return null;
        return (
          <section key={category}>
            <SectionHeading>{category}</SectionHeading>
            <ul className="grid gap-4 lg:grid-cols-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <TemplateCard template={template} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

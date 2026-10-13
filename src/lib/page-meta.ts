export function pageMeta(title: string, description: string) {
  return { meta: [{ title: `${title} — IG Infra` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — IG Infra` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}
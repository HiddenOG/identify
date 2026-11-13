/**
 * Structured data for search engines (schema.org JSON-LD). "<" is escaped so text from members
 * (a title with "</script>") can't break out of the tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

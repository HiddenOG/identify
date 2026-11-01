import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

/**
 * Renders README-style Markdown (GitHub flavored, highlighted code).
 * Raw HTML is not enabled and react-markdown strips unsafe URLs, so user content can't inject scripts.
 */
export function Markdown({ children }: { children: string }) {
  return (
    // Medium-style reading: serif body, sans headings, theme-aware colors.
    <div className="prose prose-lg max-w-none font-serif text-[1.2rem] leading-[1.75] dark:prose-invert prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-a:text-foreground prose-img:rounded-lg prose-pre:border prose-pre:border-line prose-pre:bg-surface prose-pre:text-foreground prose-code:font-mono">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

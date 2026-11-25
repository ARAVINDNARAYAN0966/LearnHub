"use client";

import { useState } from "react";

function CodeBlock({ code, language = "code" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="article-code-wrapper">
      <div className="article-code-header">
        <span>{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="article-copy-btn"
          aria-label="Copy code to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="article-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function LessonArticleViewer({ content }) {
  if (!content) return null;

  // Split content by code blocks first
  const parts = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: "code",
      language: match[1] || "text",
      code: match[2].trimEnd(),
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return (
    <article className="lesson-article" aria-label="Lesson content">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={`code-${index}`}
              code={part.code}
              language={part.language}
            />
          );
        }

        // Parse text into headings, lists, callouts, and paragraphs
        const rawBlocks = part.content.split(/\n{2,}/);

        return rawBlocks.map((block, bIdx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Main Header: === Title ===
          const h2Match = trimmed.match(/^===\s*(.*?)\s*===$/);
          if (h2Match) {
            return (
              <h2 key={`b-${index}-${bIdx}`} className="article-h2">
                {h2Match[1]}
              </h2>
            );
          }

          // Section Header: ### Title or 1. Title or ## Title
          const h3Match = trimmed.match(/^(?:#{2,3}\s*|\d+\.\s+)(.*?)$/);
          if (h3Match && trimmed.length < 120 && !trimmed.includes("\n")) {
            return (
              <h3 key={`b-${index}-${bIdx}`} className="article-h3">
                {trimmed.startsWith("#") ? h3Match[1] : trimmed}
              </h3>
            );
          }

          // Key takeaways or summary callout
          if (
            trimmed.startsWith("Key Takeaways:") ||
            trimmed.startsWith("Important:") ||
            trimmed.startsWith("Summary:")
          ) {
            const lines = trimmed.split("\n");
            const title = lines[0];
            const body = lines.slice(1).join("\n");
            return (
              <div key={`b-${index}-${bIdx}`} className="article-callout" role="note">
                <div className="article-callout-title">{title}</div>
                {body && <p className="article-p mb-0">{body}</p>}
              </div>
            );
          }

          // Unordered list
          if (trimmed.split("\n").every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "))) {
            const items = trimmed.split("\n").map((l) => l.trim().replace(/^[-*]\s+/, ""));
            return (
              <ul key={`b-${index}-${bIdx}`} className="article-list">
                {items.map((item, iIdx) => (
                  <li key={`li-${index}-${bIdx}-${iIdx}`} className="article-list-item">
                    {item}
                  </li>
                ))}
              </ul>
            );
          }

          // Mixed lines with lists or paragraphs
          const lines = trimmed.split("\n");
          return (
            <div key={`b-${index}-${bIdx}`} className="article-block">
              {lines.map((line, lIdx) => {
                const lineTrim = line.trim();
                if (!lineTrim) return null;
                if (lineTrim.startsWith("- ") || lineTrim.startsWith("* ")) {
                  return (
                    <li key={`line-${lIdx}`} className="article-list-item list-disc ml-5">
                      {lineTrim.replace(/^[-*]\s+/, "")}
                    </li>
                  );
                }
                return (
                  <p key={`line-${lIdx}`} className="article-p">
                    {lineTrim}
                  </p>
                );
              })}
            </div>
          );
        });
      })}
    </article>
  );
}

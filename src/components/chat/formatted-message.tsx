"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface FormattedMessageProps {
  text: string;
}

function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(!revealed)}
      className={cn(
        "rounded px-0.5 cursor-pointer transition-all",
        revealed
          ? "bg-gray-600/40 text-gray-200"
          : "bg-gray-600 text-transparent hover:bg-gray-500"
      )}
    >
      {text}
    </span>
  );
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Code inline: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <code key={key++} className="bg-discord-darker/80 text-[#e8912d] rounded px-1 py-0.5 text-[13px] font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold + Italic: ***text***
    const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalicMatch) {
      nodes.push(
        <strong key={key++} className="font-bold">
          <em>{parseInline(boldItalicMatch[1])}</em>
        </strong>
      );
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      nodes.push(
        <strong key={key++} className="font-bold text-white">
          {parseInline(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Underline + Italic: __*text*__
    const underlineItalicMatch = remaining.match(/^__\*(.+?)\*__/);
    if (underlineItalicMatch) {
      nodes.push(
        <span key={key++} className="underline">
          <em>{parseInline(underlineItalicMatch[1])}</em>
        </span>
      );
      remaining = remaining.slice(underlineItalicMatch[0].length);
      continue;
    }

    // Underline: __text__
    const underlineMatch = remaining.match(/^__(.+?)__/);
    if (underlineMatch) {
      nodes.push(
        <span key={key++} className="underline">
          {parseInline(underlineMatch[1])}
        </span>
      );
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^\*([^*]+?)\*/) || remaining.match(/^_([^_]+?)_/);
    if (italicMatch) {
      nodes.push(
        <em key={key++}>
          {parseInline(italicMatch[1])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      nodes.push(
        <span key={key++} className="line-through text-gray-500">
          {parseInline(strikeMatch[1])}
        </span>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Spoiler: ||text||
    const spoilerMatch = remaining.match(/^\|\|(.+?)\|\|/);
    if (spoilerMatch) {
      nodes.push(<SpoilerText key={key++} text={spoilerMatch[1]} />);
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // Mention: @username, @here, @everyone
    const mentionMatch = remaining.match(/^@(everyone|here|\w+)/);
    if (mentionMatch) {
      nodes.push(
        <span
          key={key++}
          className="bg-discord-brand/20 text-discord-brand-hover rounded px-0.5 cursor-pointer hover:bg-discord-brand/30 transition-colors"
        >
          @{mentionMatch[1]}
        </span>
      );
      remaining = remaining.slice(mentionMatch[0].length);
      continue;
    }

    // Regular character
    // Find the next special character
    const nextSpecial = remaining.slice(1).search(/[*_~`|@]/);
    if (nextSpecial === -1) {
      nodes.push(<span key={key++}>{remaining}</span>);
      remaining = "";
    } else {
      nodes.push(<span key={key++}>{remaining.slice(0, nextSpecial + 1)}</span>);
      remaining = remaining.slice(nextSpecial + 1);
    }
  }

  return nodes;
}

export function FormattedMessage({ text }: FormattedMessageProps) {
  const rendered = useMemo(() => {
    // Split by code blocks first
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    const textCopy = text;

    while ((match = codeBlockRegex.exec(textCopy)) !== null) {
      // Process text before code block
      if (match.index > lastIndex) {
        const beforeText = textCopy.slice(lastIndex, match.index);
        parts.push(...processLines(beforeText, key));
        key += 1000;
      }

      // Render code block
      const language = match[1] || "";
      const code = match[2];
      parts.push(
        <pre key={key++} className="bg-discord-darker rounded-md p-3 my-1 overflow-x-auto border border-gray-700/50">
          {language && (
            <div className="text-[10px] text-gray-500 mb-1 font-mono uppercase">{language}</div>
          )}
          <code className="text-sm font-mono text-gray-300">{code}</code>
        </pre>
      );

      lastIndex = match.index + match[0].length;
    }

    // Process remaining text
    if (lastIndex < textCopy.length) {
      parts.push(...processLines(textCopy.slice(lastIndex), key));
    }

    return parts;
  }, [text]);

  return <>{rendered}</>;
}

function processLines(text: string, startKey: number): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = startKey;
  let blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      nodes.push(
        <div key={key++} className="border-l-[3px] border-gray-500 pl-3 my-1 text-gray-300">
          {blockquoteLines.map((line, i) => (
            <div key={i}>{parseInline(line)}</div>
          ))}
        </div>
      );
      blockquoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Block quote: > text
    const quoteMatch = line.match(/^>\s(.*)$/);
    if (quoteMatch) {
      blockquoteLines.push(quoteMatch[1]);
      continue;
    } else {
      flushBlockquote();
    }

    // Headings: # ## ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingClasses = [
        "text-2xl font-bold text-white mt-2 mb-1",
        "text-xl font-bold text-white mt-2 mb-1",
        "text-lg font-semibold text-white mt-1 mb-0.5",
      ];
      nodes.push(
        <div key={key++} className={headingClasses[level - 1]}>
          {parseInline(content)}
        </div>
      );
      continue;
    }

    // Regular line
    if (line === "" && i < lines.length - 1) {
      nodes.push(<br key={key++} />);
    } else {
      const inlined = parseInline(line);
      if (inlined.length > 0) {
        nodes.push(
          <span key={key++}>
            {inlined}
            {i < lines.length - 1 && "\n"}
          </span>
        );
      }
    }
  }

  flushBlockquote();

  return nodes;
}

'use client';

import { useState, useRef, useEffect } from 'react';

type ExpandableDescriptionProps = {
  description: string | null | undefined;
  collapsedLines?: 2 | 3;
  allowExpand?: boolean;
  className?: string;
};

export function ExpandableDescription({
  description,
  collapsedLines = 2,
  allowExpand = true,
  className = '',
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!allowExpand || !textRef.current) return;
    const el = textRef.current;
    setNeedsTruncation(el.scrollHeight > el.clientHeight);
  }, [description, collapsedLines, allowExpand]);

  if (!description) return null;

  const lineClamp = !expanded ? `line-clamp-${collapsedLines}` : '';

  return (
    <div className={`min-w-0 ${className}`}>
      <p
        ref={textRef}
        className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm text-text-secondary ${lineClamp}`}
      >
        {description}
      </p>
      {allowExpand && needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-0.5 text-xs font-medium text-purple-primary hover:text-purple-600 transition-colors"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

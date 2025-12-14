/**
 * PreviewContent Component
 * Renders BBCode content with embedded records, catches, and gear in preview mode
 */

import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { parseBBCode } from '../../services/forum/bbcode';
import RecordEmbed from './embeds/RecordEmbed';
import CatchEmbed from './embeds/CatchEmbed';
import GearEmbed from './embeds/GearEmbed';

interface PreviewContentProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PreviewContent({ content, className = '', style }: PreviewContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRootsRef = useRef(new WeakMap<HTMLElement, Root>());

  useEffect(() => {
    if (!containerRef.current) return;

    const parsed = parseBBCode(content);
    
    // Set HTML content
    if (containerRef.current) {
      containerRef.current.innerHTML = parsed.html;
    }

    // Render embed components
    const renderEmbeds = () => {
      if (!containerRef.current) return;

      // Find all embed containers
      const recordEmbeds = containerRef.current.querySelectorAll('.bbcode-record-embed[data-record-id]');
      const catchEmbeds = containerRef.current.querySelectorAll('.bbcode-catch-embed[data-catch-id]');
      const gearEmbeds = containerRef.current.querySelectorAll('.bbcode-gear-embed[data-gear-id]');

      // Render record embeds
      recordEmbeds.forEach((container) => {
        const recordId = (container as HTMLElement).dataset.recordId;
        if (recordId) {
          // Remove loading text
          container.innerHTML = '';
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<RecordEmbed recordId={recordId} />);
        }
      });

      // Render catch embeds
      catchEmbeds.forEach((container) => {
        const catchId = (container as HTMLElement).dataset.catchId;
        if (catchId) {
          // Remove loading text
          container.innerHTML = '';
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<CatchEmbed catchId={catchId} />);
        }
      });

      // Render gear embeds
      gearEmbeds.forEach((container) => {
        const gearId = (container as HTMLElement).dataset.gearId;
        if (gearId) {
          // Remove loading text
          container.innerHTML = '';
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<GearEmbed gearId={gearId} />);
        }
      });
    };

    // Use requestAnimationFrame + setTimeout to ensure DOM is fully updated
    requestAnimationFrame(() => {
      setTimeout(renderEmbeds, 150);
    });
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    />
  );
}


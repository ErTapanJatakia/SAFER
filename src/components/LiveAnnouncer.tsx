import React from 'react';

interface LiveAnnouncerProps {
  announcement: string | null;
  enabled?: boolean;
}

export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ announcement, enabled = true }) => {
  return (
    <div
      role="status"
      aria-live={enabled ? "polite" : "off"}
      aria-atomic="true"
      className="sr-only"
      id="a11y-live-region"
    >
      {enabled ? announcement || '' : ''}
    </div>
  );
};

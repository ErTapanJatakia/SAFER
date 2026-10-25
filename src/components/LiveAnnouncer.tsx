import React from 'react';

interface LiveAnnouncerProps {
  announcement: string | null;
}

export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ announcement }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="a11y-live-region"
    >
      {announcement || ''}
    </div>
  );
};

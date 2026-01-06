import React from 'react';
import { ReleaseNoteEntry } from '../services/ReleaseNotesService';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  note: ReleaseNoteEntry | null;
  onClose: () => void;
  scope?: 'global' | 'content';
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  note,
  onClose,
  scope = 'global'
}) => {
  if (!isOpen || !note) {
    return null;
  }

  const overlayClass =
    scope === 'content' ? 'modal-overlay modal-overlay--content' : 'modal-overlay';

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className="modal-content release-notes-modal" onClick={(event) => event.stopPropagation()}>
        <div className="release-notes-header">
          <div>
            <p className="release-notes-eyebrow">Release Notes</p>
            <h3 className="release-notes-title">What&apos;s new in v{note.version}</h3>
          </div>
          {note.important && (
            <span className="release-notes-badge" aria-label="Important update">
              Important
            </span>
          )}
        </div>

        <div
          className="release-notes-body"
          dangerouslySetInnerHTML={{ __html: note.html || '<p>No release notes available.</p>' }}
        />

        <div className="modal-actions">
          <button className="modal-button modal-button-confirm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};


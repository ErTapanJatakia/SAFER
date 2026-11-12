import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus within an open modal, dismisses on Escape, and restores
 * focus to the element that opened it when the modal closes or unmounts.
 * An optional initial target supports dialogs with a required acknowledgement action.
 */
export function useModalFocus<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef?: { current: HTMLElement | null }
) {
  const modalRef = useRef<T>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (openerRef.current?.isConnected) openerRef.current.focus();
      openerRef.current = null;
      return;
    }

    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const modal = modalRef.current;
    if (!modal) return;

    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) =>
          !element.matches(':disabled') &&
          !element.closest('[hidden], [inert], [aria-hidden="true"]')
        );

    const focusable = getFocusable();
    const requestedInitialTarget = initialFocusRef?.current;
    const initialTarget = requestedInitialTarget &&
      modal.contains(requestedInitialTarget) &&
      focusable.includes(requestedInitialTarget)
      ? requestedInitialTarget
      : focusable[0] ?? modal;
    initialTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const current = getFocusable();
      if (current.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = current[0];
      const last = current[current.length - 1];

      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (openerRef.current?.isConnected) openerRef.current.focus();
      openerRef.current = null;
    };
  }, [isOpen, initialFocusRef]);

  return modalRef;
}

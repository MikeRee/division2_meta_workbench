import { useEffect, useRef, useCallback } from 'react';

/**
 * Pushes a history entry when a modal opens and intercepts the
 * browser back button (popstate) to close the modal instead of
 * navigating away.
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const closedViaBack = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    closedViaBack.current = false;

    // Push a dummy state so "back" pops it instead of leaving the page
    window.history.pushState({ modal: true }, '');

    const handlePopState = () => {
      closedViaBack.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // If the modal closed normally (not via back), clean up the
      // dummy history entry we pushed.
      if (!closedViaBack.current) {
        window.history.back();
      }
    };
  }, [isOpen]);
}

/**
 * Anniversary Book — Login Controller
 * Handles PIN entry, host vs. guest routing, and session creation.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form        = document.getElementById('loginForm');
    const pinInput    = document.getElementById('pinInput');
    const messageEl   = document.getElementById('loginMessage');
    const submitBtn   = form?.querySelector('[type="submit"]');

    if (!form || !pinInput || !messageEl) {
      console.error('[Login] Required DOM elements not found.');
      return;
    }

    function showMessage(text, isError = true) {
      messageEl.textContent = text;
      messageEl.className   = isError ? 'toast-message toast-error' : 'toast-message toast-success';
    }

    function setLoading(loading) {
      if (submitBtn) {
        submitBtn.disabled     = loading;
        submitBtn.textContent  = loading ? 'Verifying…' : 'Enter Book';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage('');

      const pin = pinInput.value.trim();

      if (!window.db) {
        showMessage('Service unavailable. Please refresh the page.');
        return;
      }

      if (!/^\d{4}$/.test(pin)) {
        showMessage('Please enter a valid 4-digit PIN.');
        pinInput.select();
        return;
      }

      setLoading(true);

      try {
        // 1. Check host table first
        let host = null;
        try {
          host = await AnnDB.lookupHostByPin(pin);
        } catch (err) {
          // If host table doesn't exist yet, log and continue to guest check
          console.warn('[Login] Host lookup error (table may not exist yet):', err.message);
        }

        if (host) {
          AnnDB.setSession('host', { hostId: host.id, hostName: host.name });
          window.location.replace('dashboard.html');
          return;
        }

        // 2. Check guest table
        const guest = await AnnDB.lookupGuestByPin(pin);
        if (guest) {
          AnnDB.setSession('guest', { guestId: guest.id, guestName: guest.name });
          window.location.replace('book.html');
          return;
        }

        // 3. Not found
        showMessage('PIN not recognized. Please check with the host.');
        pinInput.value = '';
        pinInput.focus();

      } catch (err) {
        console.error('[Login] Unexpected error:', err);
        showMessage('Unable to connect right now. Please try again.');
      } finally {
        setLoading(false);
      }
    });

    // Auto-submit when 4 digits are typed
    pinInput.addEventListener('input', () => {
      if (pinInput.value.replace(/\D/g, '').length === 4) {
        pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
        form.requestSubmit();
      }
    });
  });
})();

/**
 * Anniversary Book — Guest Book Controller
 * Renders the flip-book experience for authenticated guests.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ──────────────────────────────────────────────────────────────
    const guestData = AnnDB.requireGuest('index.html');
    if (!guestData) return;

    if (!window.db) {
      window.location.replace('index.html');
      return;
    }

    // Verify session guest still exists in DB
    const guest = await AnnDB.getGuestById(guestData.guestId).catch(() => null);
    if (!guest) {
      AnnDB.clearSession();
      window.location.replace('index.html');
      return;
    }

    // ── DOM refs ────────────────────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);

    const guestNameEls    = document.querySelectorAll('[data-guest-name]');
    const flipSection     = $('flipBookSection');
    const pages           = document.querySelectorAll('.page');
    const prevBtn         = $('prevPage');
    const nextBtn         = $('nextPage');
    const pageCounter     = $('pageCounter');

    const guestMsgsEl     = $('guestMessages');
    const bookGalleryEl   = $('bookGallery');
    const quizPromptEl    = $('quizPrompt');

    const openGalleryBtn  = $('openGalleryButton');
    const playMusicBtn    = $('playMusicButton');
    const mediaModal      = $('mediaModal');
    const closeModalBtn   = $('closeMediaModal');
    const mediaList       = $('mediaList');

    // ── Personalize ─────────────────────────────────────────────────────────────
    guestNameEls.forEach(el => { el.textContent = guest.name; });

    // ── Flip-book pagination ────────────────────────────────────────────────────
    let currentPage = 1;

    function showPage(index) {
      const n = Math.max(1, Math.min(index, pages.length));
      currentPage = n;
      pages.forEach((page, i) => {
        const active = i + 1 === n;
        page.setAttribute('aria-hidden', String(!active));
        page.style.transform   = active ? 'translateX(0) scale(1)'   : 'translateX(110%) scale(0.96)';
        page.style.opacity     = active ? '1'   : '0';
        page.style.pointerEvents = active ? 'auto' : 'none';
      });

      // Set stage height to match active page
      const stage      = document.querySelector('.flipbook-stage');
      const activePage = pages[n - 1];
      if (stage && activePage) {
        stage.style.minHeight = activePage.scrollHeight + 'px';
      }

      if (pageCounter) pageCounter.textContent = `${n} / ${pages.length}`;
      if (prevBtn) prevBtn.disabled = n === 1;
      if (nextBtn) nextBtn.disabled = n === pages.length;
    }

    prevBtn?.addEventListener('click', () => showPage(currentPage - 1));
    nextBtn?.addEventListener('click', () => showPage(currentPage + 1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') showPage(currentPage + 1);
      if (e.key === 'ArrowLeft')  showPage(currentPage - 1);
    });

    // ── Gallery modal ───────────────────────────────────────────────────────────
    openGalleryBtn?.addEventListener('click', () => {
      mediaModal?.classList.remove('hidden');
      mediaModal?.setAttribute('aria-hidden', 'false');
    });
    closeModalBtn?.addEventListener('click', closeGalleryModal);
    mediaModal?.addEventListener('click', (e) => { if (e.target === mediaModal) closeGalleryModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGalleryModal(); });

    function closeGalleryModal() {
      mediaModal?.classList.add('hidden');
      mediaModal?.setAttribute('aria-hidden', 'true');
    }

    // ── Ambient music (Web Audio API) ───────────────────────────────────────────
    let audioCtx    = null;
    let gainNode    = null;
    let oscillator  = null;
    let melodyClock = null;
    let musicOn     = false;
    const NOTES     = [220, 246.94, 196, 261.63, 293.66, 329.63];

    function initAudio() {
      if (audioCtx) return;
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      gainNode   = audioCtx.createGain();
      oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = 0;
      oscillator.start();
    }

    function startMusic() {
      initAudio();
      gainNode.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.05);
      melodyClock = setInterval(() => {
        const note = NOTES[Math.floor(Math.random() * NOTES.length)];
        oscillator.frequency.setTargetAtTime(note, audioCtx.currentTime, 0.09);
      }, 750);
      musicOn = true;
      if (playMusicBtn) playMusicBtn.textContent = 'Pause Music';
    }

    function stopMusic() {
      if (!audioCtx) return;
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      clearInterval(melodyClock);
      melodyClock = null;
      musicOn = false;
      if (playMusicBtn) playMusicBtn.textContent = 'Play Music';
    }

    playMusicBtn?.addEventListener('click', () => {
      musicOn ? stopMusic() : startMusic();
    });

    // Pause when tab is hidden (battery / UX courtesy)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && musicOn) stopMusic();
    });

    // ── Render helpers ──────────────────────────────────────────────────────────

    function renderGuestMessages(guests = []) {
      if (!guestMsgsEl) return;
      if (!guests.length) {
        guestMsgsEl.innerHTML = '<p class="empty-state">No messages yet.</p>';
        return;
      }
      guestMsgsEl.innerHTML = guests
        .filter(g => g.cover_message)
        .map(g => `
          <div class="message-card">
            <h4>${AnnDB.escapeHtml(g.name)}</h4>
            <p>${AnnDB.escapeHtml(g.cover_message)}</p>
          </div>
        `).join('');
    }

    async function renderMediaGrid(container, items = []) {
      if (!container) return;
      if (!items.length) {
        container.innerHTML = '<p class="empty-state">No media available yet.</p>';
        return;
      }

      const resolved = await Promise.allSettled(
        items.map(async (item) => {
          const url = await AnnDB.getMediaSignedUrl(item.path);
          return { ...item, url };
        })
      );

      container.innerHTML = resolved.map((result, i) => {
        if (result.status === 'rejected') {
          return `<div class="gallery-card"><div class="gallery-meta"><p>${AnnDB.escapeHtml(items[i].title)} — unavailable</p></div></div>`;
        }
        const { url, title, type } = result.value;
        const safeUrl   = AnnDB.escapeHtml(url);
        const safeTitle = AnnDB.escapeHtml(title);
        return type === 'video'
          ? `<div class="gallery-card"><video controls src="${safeUrl}" preload="metadata"></video></div>`
          : `<div class="gallery-card"><img src="${safeUrl}" alt="${safeTitle}" loading="lazy"></div>`;
      }).join('');
    }

    async function renderMediaModal(items = []) {
      if (!mediaList) return;
      if (!items.length) {
        mediaList.innerHTML = '<p class="empty-state">No media yet.</p>';
        return;
      }

      const resolved = await Promise.allSettled(
        items.map(async (item) => {
          const url = await AnnDB.getMediaSignedUrl(item.path);
          return { ...item, url };
        })
      );

      mediaList.innerHTML = resolved.map((result, i) => {
        if (result.status === 'rejected') {
          return `<div class="media-card"><p>${AnnDB.escapeHtml(items[i].title)} — unavailable</p></div>`;
        }
        const { url, title, type } = result.value;
        const safeUrl   = AnnDB.escapeHtml(url);
        const safeTitle = AnnDB.escapeHtml(title);
        const media     = type === 'video'
          ? `<video controls src="${safeUrl}" preload="metadata"></video>`
          : `<img src="${safeUrl}" alt="${safeTitle}" loading="lazy">`;
        return `
          <div class="media-card">
            ${media}
            <div class="gallery-meta"><p>${safeTitle}</p></div>
          </div>
        `;
      }).join('');
    }

    function renderQuiz(quiz) {
      if (!quizPromptEl) return;
      const q       = quiz.question ?? CONFIG.DEFAULT_QUIZ.question;
      const answers = quiz.answers  ?? CONFIG.DEFAULT_QUIZ.answers;

      quizPromptEl.innerHTML = `
        <p class="quiz-question">${AnnDB.escapeHtml(q)}</p>
        <div class="quiz-button-group" role="group" aria-label="Quiz answers">
          ${answers.map(a => `<button class="quiz-option" type="button">${AnnDB.escapeHtml(a)}</button>`).join('')}
        </div>
      `;

      quizPromptEl.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          quizPromptEl.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });
    }

    // ── Initialize book ─────────────────────────────────────────────────────────
    async function initBook() {
      try {
        const [guests, media, quiz] = await Promise.all([
          AnnDB.fetchAllGuests(),
          AnnDB.fetchAllMedia(),
          AnnDB.fetchQuiz(),
        ]);

        renderGuestMessages(guests);
        renderQuiz(quiz);
        // Gallery page and modal
        await renderMediaGrid(bookGalleryEl, media);
        await renderMediaModal(media);

        showPage(1);
        flipSection?.classList.remove('hidden');
        flipSection?.setAttribute('aria-hidden', 'false');
      } catch (err) {
        console.error('[Book] Init failed:', err);
      }
    }

    await initBook();

  });
})();

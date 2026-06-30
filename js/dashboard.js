/**
 * Anniversary Book — Host Dashboard Controller
 * Manages: guest management, media gallery, quiz builder, settings.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ─────────────────────────────────────────────────────────────
    const hostData = AnnDB.requireHost('index.html');
    if (!hostData) return; // requireHost redirects

    if (!window.db) {
      window.location.replace('index.html');
      return;
    }

    // Verify session is still valid
    const host = await AnnDB.getHostById(hostData.hostId).catch(() => null);
    if (!host) {
      AnnDB.clearSession();
      window.location.replace('index.html');
      return;
    }

    // ── DOM refs ───────────────────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);

    const hostNameEls     = document.querySelectorAll('[data-host-name]');
    const panels          = document.querySelectorAll('.panel');
    const navLinks        = document.querySelectorAll('.nav-link');
    const signOutBtn      = $('signOutButton');

    // Customers panel
    const customerSearch  = $('customerSearch');
    const newCustomerBtn  = $('newCustomerButton');
    const tableWrapper    = $('customerTableWrapper');

    // Customer modal
    const modal           = $('customerModal');
    const modalClose      = $('customerModalClose');
    const modalTitle      = $('modalTitle');
    const saveCustomerBtn = $('saveCustomerButton');
    const fieldName       = $('customerName');
    const fieldMessage    = $('customerMessage');
    const fieldPin        = $('customerPin');
    const fieldId         = $('customerId');
    const generatePinBtn  = $('generatePinButton');
    const modalMessage    = $('modalMessage');

    // Gallery panel
    const uploadBtn       = $('uploadLibraryButton');
    const dropZone        = $('uploadDropZone');
    const fileInput       = $('galleryFileInput');
    const progressBar     = $('uploadProgress');
    const progressLabel   = $('progressLabel');
    const galleryGrid     = $('galleryGrid');

    // Quiz panel
    const quizQuestion    = $('quizQuestion');
    const quizAnswer1     = $('quizAnswer1');
    const quizAnswer2     = $('quizAnswer2');
    const quizAnswer3     = $('quizAnswer3');
    const quizAnswer4     = $('quizAnswer4');
    const saveQuizBtn     = $('saveQuizButton');
    const quizMessage     = $('quizMessage');

    // ── Init ───────────────────────────────────────────────────────────────────
    hostNameEls.forEach(el => { el.textContent = host.name; });

    // ── Navigation ─────────────────────────────────────────────────────────────
    function switchPanel(panelId) {
      panels.forEach(p => p.classList.toggle('active-panel', p.id === panelId));
      navLinks.forEach(l => l.classList.toggle('active', l.dataset.panel === panelId));
    }

    navLinks.forEach(link => {
      link.addEventListener('click', () => switchPanel(link.dataset.panel));
    });

    // ── Sign out ───────────────────────────────────────────────────────────────
    signOutBtn?.addEventListener('click', () => {
      AnnDB.clearSession();
      window.location.replace('index.html');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOMERS PANEL
    // ═══════════════════════════════════════════════════════════════════════════

    let guestCache = [];

    function generatePin() {
      return String(Math.floor(1000 + Math.random() * 9000));
    }

    function openModal(guest = null) {
      modalMessage.textContent = '';
      if (guest) {
        modalTitle.textContent   = 'Edit Guest';
        fieldName.value          = guest.name;
        fieldMessage.value       = guest.cover_message ?? '';
        fieldPin.value           = guest.pin;
        fieldId.value            = guest.id;
      } else {
        modalTitle.textContent   = 'Add Guest';
        fieldName.value          = '';
        fieldMessage.value       = '';
        fieldPin.value           = generatePin();
        fieldId.value            = '';
      }
      modal.classList.remove('hidden');
      fieldName.focus();
    }

    function closeModal() {
      modal.classList.add('hidden');
    }

    async function renderCustomers(searchTerm = '') {
      tableWrapper.innerHTML = '<p class="empty-state">Loading…</p>';
      try {
        guestCache = await AnnDB.fetchAllGuests(searchTerm);

        if (!guestCache.length) {
          tableWrapper.innerHTML = '<p class="empty-state">No guests found. Add one to get started.</p>';
          return;
        }

        const rows = guestCache.map(g => `
          <tr>
            <td>${AnnDB.escapeHtml(g.name)}</td>
            <td class="truncate">${AnnDB.escapeHtml(g.cover_message ?? '')}</td>
            <td><code>${AnnDB.escapeHtml(g.pin)}</code></td>
            <td>${new Date(g.created_at).toLocaleDateString()}</td>
            <td>
              <div class="button-row">
                <button class="btn btn-secondary btn-sm" data-action="edit"   data-id="${g.id}">Edit</button>
                <button class="btn btn-danger    btn-sm" data-action="delete" data-id="${g.id}">Delete</button>
              </div>
            </td>
          </tr>
        `).join('');

        tableWrapper.innerHTML = `
          <table class="customer-table">
            <thead>
              <tr>
                <th>Name</th><th>Message</th><th>PIN</th><th>Added</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;

        tableWrapper.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id     = btn.dataset.id;
            const action = btn.dataset.action;
            const guest  = guestCache.find(g => String(g.id) === String(id));
            if (!guest) return;

            if (action === 'edit') {
              openModal(guest);
            } else if (action === 'delete') {
              if (!confirm(`Remove "${guest.name}"? This cannot be undone.`)) return;
              try {
                await AnnDB.deleteGuest(id);
                await renderCustomers(customerSearch.value.trim());
              } catch (err) {
                console.error('[Dashboard] Delete failed:', err);
                alert('Could not delete guest. Please try again.');
              }
            }
          });
        });

      } catch (err) {
        console.error('[Dashboard] Load customers failed:', err);
        tableWrapper.innerHTML = '<p class="empty-state error">Unable to load guests. Please refresh.</p>';
      }
    }

    customerSearch?.addEventListener('input', () => {
      renderCustomers(customerSearch.value.trim());
    });

    newCustomerBtn?.addEventListener('click', () => openModal());
    modalClose?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    generatePinBtn?.addEventListener('click', () => {
      fieldPin.value = generatePin();
    });

    saveCustomerBtn?.addEventListener('click', async () => {
      modalMessage.textContent = '';

      const name    = fieldName.value.trim();
      const message = fieldMessage.value.trim();
      const pin     = fieldPin.value.trim();
      const id      = fieldId.value;

      if (!name || !message || !/^\d{4}$/.test(pin)) {
        modalMessage.textContent = 'Please fill in all fields. PIN must be exactly 4 digits.';
        return;
      }

      const payload = { name, message, pin };

      try {
        if (id) {
          await AnnDB.updateGuest(id, payload);
        } else {
          await AnnDB.createGuest({ ...payload, created_at: new Date().toISOString() });
        }
        await renderCustomers(customerSearch.value.trim());
        closeModal();
      } catch (err) {
        console.error('[Dashboard] Save guest failed:', err);
        modalMessage.textContent = err?.message?.includes('unique')
          ? 'That PIN is already in use. Generate a new one.'
          : 'Could not save guest. Please try again.';
      }
    });

    // Initial load
    await renderCustomers();

    // ═══════════════════════════════════════════════════════════════════════════
    // GALLERY PANEL
    // ═══════════════════════════════════════════════════════════════════════════

    let isUploading          = false;
    const uploadedSignatures = new Set();

    async function renderGallery(items = []) {
      if (!galleryGrid) return;

      if (!items.length) {
        galleryGrid.innerHTML = '<p class="empty-state">No media uploaded yet. Drop files above to begin.</p>';
        return;
      }

      // Resolve signed URLs in parallel
      const resolved = await Promise.allSettled(
        items.map(async (item) => {
          const url = await AnnDB.getMediaSignedUrl(item.path);
          return { ...item, url };
        })
      );

      galleryGrid.innerHTML = resolved.map((result, i) => {
        if (result.status === 'rejected') {
          return `<div class="gallery-card">
            <div class="gallery-meta"><p>${AnnDB.escapeHtml(items[i].title)} — unavailable</p></div>
          </div>`;
        }
        const { url, title, type, id, path } = result.value;
        const safeUrl   = AnnDB.escapeHtml(url);
        const safeTitle = AnnDB.escapeHtml(title);
        const media     = type === 'video'
          ? `<video controls src="${safeUrl}" preload="metadata"></video>`
          : `<img src="${safeUrl}" alt="${safeTitle}" loading="lazy">`;

        return `
          <div class="gallery-card" data-media-id="${id}" data-path="${AnnDB.escapeHtml(path)}">
            ${media}
            <div class="gallery-meta">
              <p>${safeTitle}</p>
              <button class="btn btn-danger btn-sm" data-action="delete-media" data-id="${id}" data-path="${AnnDB.escapeHtml(path)}">Remove</button>
            </div>
          </div>
        `;
      }).join('');

      galleryGrid.querySelectorAll('[data-action="delete-media"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const { id, path } = btn.dataset;
          if (!confirm('Remove this media permanently?')) return;
          try {
            await Promise.all([
              AnnDB.deleteMediaRecord(id),
              AnnDB.deleteFileFromStorage(path),
            ]);
            await refreshGallery();
          } catch (err) {
            console.error('[Gallery] Delete failed:', err);
            alert('Could not remove media. Please try again.');
          }
        });
      });
    }

    async function refreshGallery() {
      try {
        const items = await AnnDB.fetchAllMedia();
        await renderGallery(items);
      } catch (err) {
        console.error('[Gallery] Load failed:', err);
        if (galleryGrid) galleryGrid.innerHTML = '<p class="empty-state error">Unable to load media.</p>';
      }
    }

    async function compressImage(file) {
      if (!file.type.startsWith('image/')) return file;
      try {
        const bitmap   = await createImageBitmap(file);
        const MAX      = 1920;
        const scale    = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
        const canvas   = Object.assign(document.createElement('canvas'), {
          width:  Math.round(bitmap.width  * scale),
          height: Math.round(bitmap.height * scale),
        });
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const mime    = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = mime === 'image/jpeg' ? 0.82 : 0.92;
        const blob    = await new Promise((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('Compression failed')), mime, quality));
        return blob.size < file.size
          ? new File([blob], file.name, { type: blob.type, lastModified: Date.now() })
          : file;
      } catch {
        return file; // fall back silently
      }
    }

    function updateProgress(value, label) {
      if (progressBar)   progressBar.value   = value;
      if (progressLabel) progressLabel.textContent = label;
    }

    async function uploadFiles(files) {
      if (!files.length || isUploading) return;
      isUploading = true;
      uploadBtn && (uploadBtn.disabled = true);
      dropZone?.classList.add('uploading');
      updateProgress(0, 'Preparing upload…');

      // Deduplicate
      const seen = new Set();
      const queue = [];
      for (const file of files) {
        const sig = `${file.name}_${file.size}_${file.lastModified}`;
        if (seen.has(sig) || uploadedSignatures.has(sig)) continue;
        seen.add(sig);
        const prepared = file.type.startsWith('image/') ? await compressImage(file) : file;
        queue.push({ file: prepared, original: file, sig });
      }

      if (!queue.length) {
        updateProgress(100, 'No new files to upload.');
        isUploading = false;
        uploadBtn && (uploadBtn.disabled = false);
        dropZone?.classList.remove('uploading');
        return;
      }

      let done = 0;
      const errors = [];

      await Promise.all(queue.map(async ({ file, original, sig }) => {
        try {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const path = await AnnDB.uploadFileToStorage(file);
          await AnnDB.createMediaRecord({
            title:       original.name,
            file_url: path,
            file_type: type,
            uploaded_at: new Date().toISOString(),
          });
          uploadedSignatures.add(sig);
        } catch (err) {
          errors.push({ name: original.name, err });
          console.error('[Upload] Failed:', original.name, err);
        } finally {
          done++;
          updateProgress(Math.round((done / queue.length) * 100), `Uploading ${done}/${queue.length}…`);
        }
      }));

      await refreshGallery();

      if (errors.length) {
        updateProgress(100, `Done — ${errors.length} file(s) failed. Check console.`);
      } else {
        updateProgress(100, `${done} file(s) uploaded successfully.`);
      }

      isUploading = false;
      uploadBtn && (uploadBtn.disabled = false);
      dropZone?.classList.remove('uploading');

      // Clear input so same file can be re-selected if needed
      if (fileInput) fileInput.value = '';
    }

    // Upload button triggers file input
    uploadBtn?.addEventListener('click', () => fileInput?.click());

    // Drop zone
    dropZone?.addEventListener('click', () => fileInput?.click());
    dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      await uploadFiles(Array.from(e.dataTransfer.files ?? []));
    });

    fileInput?.addEventListener('change', async (e) => {
      await uploadFiles(Array.from(e.target.files ?? []));
    });

    // Initial gallery load
    await refreshGallery();

    // ═══════════════════════════════════════════════════════════════════════════
    // QUIZ PANEL
    // ═══════════════════════════════════════════════════════════════════════════

    async function loadQuiz() {
      try {
        const quiz   = await AnnDB.fetchQuiz();
        const answers = quiz.answers ?? CONFIG.DEFAULT_QUIZ.answers;
        if (quizQuestion) quizQuestion.value = quiz.question ?? CONFIG.DEFAULT_QUIZ.question;
        if (quizAnswer1)  quizAnswer1.value  = answers[0] ?? '';
        if (quizAnswer2)  quizAnswer2.value  = answers[1] ?? '';
        if (quizAnswer3)  quizAnswer3.value  = answers[2] ?? '';
        if (quizAnswer4)  quizAnswer4.value  = answers[3] ?? '';
      } catch (err) {
        console.error('[Quiz] Load failed:', err);
        if (quizMessage) quizMessage.textContent = 'Unable to load quiz settings.';
      }
    }

    saveQuizBtn?.addEventListener('click', async () => {
      if (quizMessage) quizMessage.textContent = '';

      const payload = {
        question: (quizQuestion?.value.trim()) || CONFIG.DEFAULT_QUIZ.question,
        answers: [
          (quizAnswer1?.value.trim()) || CONFIG.DEFAULT_QUIZ.answers[0],
          (quizAnswer2?.value.trim()) || CONFIG.DEFAULT_QUIZ.answers[1],
          (quizAnswer3?.value.trim()) || CONFIG.DEFAULT_QUIZ.answers[2],
          (quizAnswer4?.value.trim()) || CONFIG.DEFAULT_QUIZ.answers[3],
        ],
      };

      try {
        await AnnDB.saveQuiz(payload);
        if (quizMessage) {
          quizMessage.textContent = 'Quiz saved.';
          quizMessage.className   = 'toast-message toast-success';
        }
      } catch (err) {
        console.error('[Quiz] Save failed:', err);
        if (quizMessage) quizMessage.textContent = 'Could not save quiz. Please try again.';
      }
    });

    await loadQuiz();

  });
})();

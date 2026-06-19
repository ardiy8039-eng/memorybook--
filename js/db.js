/**
 * Anniversary Book — Supabase Client
 *
 * Initializes and exposes a single Supabase client instance as window.db.
 * Must load AFTER config.js and AFTER the Supabase CDN script.
 *
 * Root cause fix: The previous code called `window.supabase.createClient()`
 * which is correct with the UMD build, but then a second `supabase.js` file
 * checked `window.db` at module level before it was set, and defined database
 * helper functions that were never properly namespaced. This file consolidates
 * all Supabase initialization and database helpers into one place.
 */

(function () {
  'use strict';

  // Guard: Supabase CDN UMD exposes `supabase` on the window object.
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('[AnniversaryBook] Supabase CDN did not load. Check your network connection.');
    return;
  }

  const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  window.db = db;

  // ─── Utility ────────────────────────────────────────────────────────────────

  /**
   * Escape HTML special characters to prevent XSS in innerHTML contexts.
   * @param {*} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Auth / Session Helpers ─────────────────────────────────────────────────

  function setSession(mode, payload) {
    sessionStorage.setItem(CONFIG.MODE_KEY, mode);
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(payload));
  }

  function getSession() {
    const mode = sessionStorage.getItem(CONFIG.MODE_KEY);
    const raw  = sessionStorage.getItem(CONFIG.SESSION_KEY);
    if (!mode || !raw) return null;
    try {
      return { mode, data: JSON.parse(raw) };
    } catch {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(CONFIG.MODE_KEY);
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  }

  function requireHost(redirectTo = 'index.html') {
    const session = getSession();
    if (!session || session.mode !== 'host' || !session.data?.hostId) {
      window.location.replace(redirectTo);
      return null;
    }
    return session.data;
  }

  function requireGuest(redirectTo = 'index.html') {
    const session = getSession();
    if (!session || session.mode !== 'guest' || !session.data?.guestId) {
      window.location.replace(redirectTo);
      return null;
    }
    return session.data;
  }

  // ─── Hosts ──────────────────────────────────────────────────────────────────

  async function lookupHostByPin(pin) {
    const { data, error } = await db
      .from(CONFIG.TABLE_HOSTS)
      .select('id, name')
      .eq('pin', pin)
      .maybeSingle();
    if (error) throw error;
    return data; // null if not found
  }

  async function getHostById(id) {
    const { data, error } = await db
      .from(CONFIG.TABLE_HOSTS)
      .select('id, name')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // ─── Guests (books table) ────────────────────────────────────────────────────

  async function lookupGuestByPin(pin) {
    const { data, error } = await db
      .from(CONFIG.TABLE_BOOKS)
      .select('id, name, message, pin')
      .eq('pin', pin)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getGuestById(id) {
    const { data, error } = await db
      .from(CONFIG.TABLE_BOOKS)
      .select('id, name, message, pin')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function fetchAllGuests(searchTerm = '') {
    let query = db
      .from(CONFIG.TABLE_BOOKS)
      .select('*')
      .order('created_at', { ascending: false });
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,pin.ilike.%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async function createGuest(payload) {
    const { data, error } = await db
      .from(CONFIG.TABLE_BOOKS)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateGuest(id, updates) {
    const { data, error } = await db
      .from(CONFIG.TABLE_BOOKS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteGuest(id) {
    const { error } = await db
      .from(CONFIG.TABLE_BOOKS)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ─── Media ──────────────────────────────────────────────────────────────────

  async function fetchAllMedia() {
    const { data, error } = await db
      .from(CONFIG.TABLE_MEDIA)
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async function createMediaRecord(record) {
    const { data, error } = await db
      .from(CONFIG.TABLE_MEDIA)
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteMediaRecord(id) {
    const { error } = await db
      .from(CONFIG.TABLE_MEDIA)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async function getMediaSignedUrl(path) {
    const { data, error } = await db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async function uploadFileToStorage(file) {
    const ext      = file.name.split('.').pop().toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(safeName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data?.path ?? safeName;
  }

  async function deleteFileFromStorage(path) {
    const { error } = await db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .remove([path]);
    if (error) throw error;
  }

  // ─── Quiz ───────────────────────────────────────────────────────────────────

  async function fetchQuiz() {
    try {
      const { data, error } = await db
        .from(CONFIG.TABLE_QUIZ)
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data ?? CONFIG.DEFAULT_QUIZ;
    } catch {
      return CONFIG.DEFAULT_QUIZ;
    }
  }

  async function saveQuiz(payload) {
    const { data, error } = await db
      .from(CONFIG.TABLE_QUIZ)
      .upsert({ id: 1, ...payload }, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── Expose public API ──────────────────────────────────────────────────────

  window.AnnDB = {
    // Auth
    setSession,
    getSession,
    clearSession,
    requireHost,
    requireGuest,
    // Hosts
    lookupHostByPin,
    getHostById,
    // Guests
    lookupGuestByPin,
    getGuestById,
    fetchAllGuests,
    createGuest,
    updateGuest,
    deleteGuest,
    // Media
    fetchAllMedia,
    createMediaRecord,
    deleteMediaRecord,
    getMediaSignedUrl,
    uploadFileToStorage,
    deleteFileFromStorage,
    // Quiz
    fetchQuiz,
    saveQuiz,
    // Util
    escapeHtml,
  };

  console.debug('[AnniversaryBook] Database client ready.');
})();

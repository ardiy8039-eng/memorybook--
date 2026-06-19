/**
 * Anniversary Book — Global Configuration
 * Single source of truth for all environment constants.
 */

const CONFIG = Object.freeze({
  SUPABASE_URL:     'https://ciulubaaypbfclbgpyja.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdWx1YmFheXBiZmNsYmdweWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDA0ODEsImV4cCI6MjA5NzM3NjQ4MX0.2LWTSpDIawtRh9KN-O0VNK_e_yVFB3LTU00QxgFlRrA',

  // Table names
  TABLE_HOSTS:  'hosts',
  TABLE_BOOKS:  'books',
  TABLE_MEDIA:  'media',
  TABLE_QUIZ:   'quiz',

  // Storage
  STORAGE_BUCKET: 'anniversary',

  // Session keys
  SESSION_KEY:  'ann_session',
  MODE_KEY:     'ann_mode',

  // Default quiz fallback
  DEFAULT_QUIZ: {
    question: 'Which memory should we revisit next?',
    answers: [
      'Dinner under the stars',
      'Beach walk at sunset',
      'Surprise gift moment',
      'One more dance',
    ],
  },
});

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HouseData } from './types';

// History/reporting layer only — live gameplay state never touches this file.
// If Supabase isn't configured, every function below becomes a no-op so the
// game keeps working without a database (see server/sql/schema.sql for setup).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('[db] Supabase history logging enabled');
} else {
  console.warn('[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — game history will not be saved. See server/sql/schema.sql.');
}

export const isHistoryEnabled = () => client !== null;

export const recordSessionStart = async (sessionId: string, eventSlug: string) => {
  if (!client) return;
  try {
    const r1 = await client.from('events').upsert({ event_slug: eventSlug }, { onConflict: 'event_slug' });
    if (r1.error) console.error('[db] events upsert error:', r1.error);
    const r2 = await client.from('game_sessions').upsert({ id: sessionId, event_slug: eventSlug }, { onConflict: 'id' });
    if (r2.error) console.error('[db] game_sessions upsert error:', r2.error);
    else console.log('[db] session start recorded:', sessionId);
  } catch (err) {
    console.error('[db] failed to record session start:', err);
  }
};

export const recordSessionResults = async (sessionId: string, houses: Record<number, HouseData>) => {
  if (!client) return;
  try {
    const rows = Object.values(houses).map((h) => ({
      session_id: sessionId,
      house_id: h.houseId,
      score: h.score,
      correct_answers: h.correctAnswers,
      role: h.role ?? null,
      is_dead: h.isDead ?? null,
    }));
    const r = await client.from('house_results').upsert(rows, { onConflict: 'session_id,house_id' });
    if (r.error) console.error('[db] house_results upsert error:', r.error);
    else console.log('[db] house results recorded:', sessionId);
  } catch (err) {
    console.error('[db] failed to record session results:', err);
  }
};

export const recordSessionFinished = async (sessionId: string) => {
  if (!client) return;
  try {
    const r = await client.from('game_sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId);
    if (r.error) console.error('[db] mark finished error:', r.error);
  } catch (err) {
    console.error('[db] failed to mark session finished:', err);
  }
};

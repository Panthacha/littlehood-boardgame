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
      post_correct_answers: h.postCorrectAnswers ?? null,
      role: h.role ?? null,
      is_dead: h.isDead ?? null,
    }));
    let r = await client.from('house_results').upsert(rows, { onConflict: 'session_id,house_id' });
    if (r.error?.code === 'PGRST204') {
      // post_correct_answers column not added yet (see sql/schema.sql) — save the rest
      console.warn('[db] house_results.post_correct_answers missing; run the ALTER in sql/schema.sql');
      const legacy = rows.map(({ post_correct_answers, ...rest }) => rest);
      r = await client.from('house_results').upsert(legacy, { onConflict: 'session_id,house_id' });
    }
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

// Curriculum Parts 1-5 — live read/write, not just history. savePartProgress
// is called on every step change / field edit so a refresh never loses a
// team's work; getPartProgress lets a later part (e.g. Part 4's Blueprint)
// read what earlier parts saved for that same house.
export const savePartProgress = async (
  sessionId: string,
  eventSlug: string,
  houseId: number,
  partNumber: number,
  step: number,
  data: Record<string, any>,
  completed: boolean
): Promise<boolean> => {
  if (!client) return false;
  try {
    // Parts can start saving before hostStartGame's recordSessionStart ran
    // (e.g. Supabase configured mid-session), so make sure the parent rows exist.
    await client.from('events').upsert({ event_slug: eventSlug }, { onConflict: 'event_slug' });
    await client.from('game_sessions').upsert({ id: sessionId, event_slug: eventSlug }, { onConflict: 'id' });

    const row: Record<string, any> = {
      session_id: sessionId,
      house_id: houseId,
      part_number: partNumber,
      current_step: step,
      data,
      updated_at: new Date().toISOString()
    };
    if (completed) row.completed_at = new Date().toISOString();

    const r = await client.from('part_progress').upsert(row, { onConflict: 'session_id,house_id,part_number' });
    if (r.error) {
      console.error('[db] part_progress upsert error:', r.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[db] failed to save part progress:', err);
    return false;
  }
};

export const getPartProgress = async (
  sessionId: string,
  houseId: number
): Promise<Record<number, { step: number; data: Record<string, any>; completedAt: string | null }>> => {
  if (!client) return {};
  try {
    const r = await client
      .from('part_progress')
      .select('part_number, current_step, data, completed_at')
      .eq('session_id', sessionId)
      .eq('house_id', houseId);
    if (r.error) {
      console.error('[db] part_progress select error:', r.error);
      return {};
    }
    const result: Record<number, { step: number; data: Record<string, any>; completedAt: string | null }> = {};
    for (const row of r.data || []) {
      result[row.part_number] = { step: row.current_step, data: row.data || {}, completedAt: row.completed_at };
    }
    return result;
  } catch (err) {
    console.error('[db] failed to get part progress:', err);
    return {};
  }
};

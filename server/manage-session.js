export async function manageSession(db, input) {
  if (input?.action === 'create') {
    const start = typeof input.start === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.start)
      ? Date.parse(input.start + ':00+08:00') : NaN
    const location = typeof input.location === 'string' ? input.location.trim() : ''
    if (!Number.isFinite(start) || start <= Date.now() || !location || location.length > 100) {
      return '請輸入未來的開打時間與球場。'
    }
    const [result] = await db.batch([db.prepare(`
      INSERT OR IGNORE INTO sessions (starts_at, location, is_open)
      SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE starts_at > unixepoch() AND cancelled = 0)
    `).bind(start / 1000, location), db.prepare(`
      INSERT INTO session_notices (id, session_id, kind)
      SELECT ?, id, 'create' FROM sessions WHERE starts_at = ? AND changes() = 1
    `).bind(crypto.randomUUID(), start / 1000)])
    return result.meta.changes ? null : '已有未開始的場次，或此開打時間已使用。'
  }
  if (!Number.isSafeInteger(input?.sessionId)) return '請選擇場次。'
  if (input.action === 'cancel') {
    const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 200) : ''
    const [result] = await db.batch([
      db.prepare('UPDATE sessions SET cancelled = 1, is_open = 0 WHERE id = ? AND cancelled = 0 AND starts_at > unixepoch()').bind(input.sessionId),
      db.prepare(`
        INSERT INTO session_notices (id, session_id, kind, reason)
        SELECT ?, id, 'cancel', ? FROM sessions WHERE id = ? AND changes() = 1
      `).bind(crypto.randomUUID(), reason, input.sessionId)
    ])
    return result.meta.changes ? null : '這個場次已取消或已開始。'
  }
  const sql = {
    pause: 'UPDATE sessions SET is_open = 0 WHERE id = ? AND cancelled = 0 AND starts_at > unixepoch()',
    resume: 'UPDATE sessions SET is_open = 1 WHERE id = ? AND cancelled = 0 AND starts_at > unixepoch()',
    guests: 'INSERT OR IGNORE INTO guest_registration_open SELECT id FROM sessions WHERE id = ? AND cancelled = 0 AND starts_at > unixepoch()',
    'close-guests': 'DELETE FROM guest_registration_open WHERE session_id = ?'
  }
  if (!Object.hasOwn(sql, input.action)) return '無法辨識場次操作。'
  await db.prepare(sql[input.action]).bind(input.sessionId).run()
  return null
}

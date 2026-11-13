export async function manageSession(db, input) {
  if (input?.action === 'create') {
    const start = typeof input.start === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.start)
      ? Date.parse(input.start + ':00+08:00') : NaN
    const location = typeof input.location === 'string' ? input.location.trim() : ''
    if (!Number.isFinite(start) || start <= Date.now() || !location || location.length > 100) {
      return '請輸入未來的開打時間與球場。'
    }
    const result = await db.prepare(`
      INSERT OR IGNORE INTO sessions (starts_at, location, is_open)
      SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE starts_at > unixepoch())
    `).bind(start / 1000, location).run()
    return result.meta.changes ? null : '已有未開始的場次，或此開打時間已使用。'
  }
  if (!Number.isSafeInteger(input?.sessionId)) return '請選擇場次。'
  const sql = {
    pause: 'UPDATE sessions SET is_open = 0 WHERE id = ? AND starts_at > unixepoch()',
    resume: 'UPDATE sessions SET is_open = 1 WHERE id = ? AND starts_at > unixepoch()',
    guests: 'INSERT OR IGNORE INTO guest_registration_open SELECT id FROM sessions WHERE id = ? AND starts_at > unixepoch()',
    'close-guests': 'DELETE FROM guest_registration_open WHERE session_id = ?'
  }
  if (!Object.hasOwn(sql, input.action)) return '無法辨識場次操作。'
  await db.prepare(sql[input.action]).bind(input.sessionId).run()
  return null
}

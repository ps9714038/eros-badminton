export async function status(db, user = '', sessionId = null) {
  return db.prepare(`
    SELECT id, starts_at, location, is_open,
      EXISTS(SELECT 1 FROM guest_registration_open WHERE session_id = sessions.id) AS guests_open,
      (SELECT count(*) FROM registrations WHERE session_id = sessions.id) AS booked,
      EXISTS(SELECT 1 FROM registrations WHERE session_id = sessions.id AND user_id = ?1) AS joined,
      (SELECT role FROM members WHERE user_id = ?1) AS role
    FROM sessions WHERE starts_at > unixepoch() AND (?2 IS NULL OR id = ?2)
    ORDER BY starts_at LIMIT 1
  `).bind(user, sessionId).first()
}

export async function change(db, sessionId, user, action, eventId = null) {
  const event = eventId && db.prepare(
    'INSERT OR IGNORE INTO webhook_events (id) VALUES (?)'
  ).bind(eventId)
  const guard = event ? ' AND changes() = 1' : ''
  const mutation = action === '+1'
    ? db.prepare(`
        INSERT OR IGNORE INTO registrations (session_id, user_id)
        SELECT s.id, m.user_id FROM sessions s CROSS JOIN members m
        WHERE s.id = ?1 AND m.user_id = ?2 AND s.is_open = 1
        AND s.starts_at > unixepoch()
        AND (m.role = 'regular' OR s.id IN (
          SELECT session_id FROM guest_registration_open
        ))
        AND (SELECT count(*) FROM registrations WHERE session_id = s.id) < 7${guard}
      `).bind(sessionId, user)
    : db.prepare(`
        DELETE FROM registrations WHERE session_id = ?1 AND user_id = ?2
        AND EXISTS (SELECT 1 FROM sessions WHERE id = ?1 AND starts_at > unixepoch())${guard}
      `).bind(sessionId, user)
  if (event) {
    const [receipt] = await db.batch([event, mutation])
    if (!receipt.meta.changes) return null
  } else {
    await mutation.run()
  }
  return { session: await status(db, user, sessionId) }
}

export function describe(session, action) {
  if (!session) return '目前沒有可報名的場次。'
  const count = `目前 ${session.booked}／7 人，剩 ${7 - session.booked} 位。`
  if (session.joined) return `你已報名。${count}`
  if (action === '-1') return `你目前沒有報名。${count}`
  if (!session.role) return '請先聯絡團長 Ro 開通報名資格。'
  if (action === '+1' && !session.is_open) return '這場目前暫停報名。'
  if (action === '+1' && session.booked >= 7) return `目前額滿。${count}`
  if (session.role === 'guest' && !session.guests_open) return '朋友名額請先向團長 Ro 確認。'
  return `你尚未報名。${count}`
}


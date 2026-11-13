export async function status(db, user = '', sessionId = null) {
  return db.prepare(`
    SELECT id, starts_at, location, is_open, cancelled,
      (SELECT count(*) FROM registrations WHERE session_id = sessions.id) AS booked,
      EXISTS(SELECT 1 FROM registrations WHERE session_id = sessions.id AND user_id = ?1) AS joined
    FROM sessions WHERE starts_at > unixepoch() AND (?2 IS NULL OR id = ?2)
    ORDER BY cancelled, starts_at LIMIT 1
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
        SELECT s.id, ?2 FROM sessions s
        WHERE s.id = ?1 AND s.is_open = 1 AND s.cancelled = 0
        AND s.starts_at > unixepoch()
        AND (SELECT count(*) FROM registrations WHERE session_id = s.id) < 7${guard}
      `).bind(sessionId, user)
    : db.prepare(`
        DELETE FROM registrations WHERE session_id = ?1 AND user_id = ?2
        AND EXISTS (SELECT 1 FROM sessions WHERE id = ?1 AND starts_at > unixepoch())${guard}
      `).bind(sessionId, user)
  // Keep the existing foreign key valid for first-time participants.
  const statements = action === '+1' ? [db.prepare(`
    INSERT OR IGNORE INTO members (user_id, role)
    SELECT ?2, 'guest' FROM sessions
    WHERE id = ?1 AND is_open = 1 AND cancelled = 0 AND starts_at > unixepoch()
    AND (SELECT count(*) FROM registrations WHERE session_id = ?1) < 7
  `).bind(sessionId, user)] : []
  let changes
  if (event) {
    const [receipt, result] = (await db.batch([...statements, event, mutation])).slice(-2)
    if (!receipt.meta.changes) return null
    changes = result.meta.changes
  } else if (statements.length) {
    const [, result] = await db.batch([...statements, mutation])
    changes = result.meta.changes
  } else {
    changes = (await mutation.run()).meta.changes
  }
  return { session: await status(db, user, sessionId), changed: changes > 0 }
}

export function describe(session, action, changed = false) {
  if (!session) return '目前沒有可報名的場次。'
  if (session.cancelled) return '這個場次已取消。'
  const count = `目前 ${session.booked}／7 人，剩 ${7 - session.booked} 位。`
  if (action === '+1' && changed && session.joined) return `報名成功！${count}`
  if (session.joined) return `你已報名。${count}`
  if (action === '-1') return `你目前沒有報名。${count}`
  if (action === '+1' && !session.is_open) return '這場目前暫停報名。'
  if (action === '+1' && session.booked >= 7) return `目前額滿。${count}`
  return `你尚未報名。${count}`
}

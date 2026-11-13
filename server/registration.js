export async function status(db, user = '', sessionId = null) {
  return db.prepare(`
    SELECT id, starts_at, location, is_open, cancelled,
      (SELECT count(*) FROM registrations WHERE session_id = sessions.id) AS booked,
      EXISTS(SELECT 1 FROM registrations WHERE session_id = sessions.id AND user_id = ?1 || ':friend') AS friend_joined,
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
  const adding = action === '+1' || action === '+2'
  const seats = action === '+2' ? 2 : 1
  const mutation = adding
    ? db.prepare(`
        INSERT OR IGNORE INTO registrations (session_id, user_id)
        SELECT s.id, participant.user_id FROM sessions s
        CROSS JOIN (
          SELECT ?2 AS user_id UNION ALL SELECT ?2 || ':friend' WHERE ?3 = 2
        ) participant
        WHERE s.id = ?1 AND s.is_open = 1 AND s.cancelled = 0
        AND s.starts_at > unixepoch()
        AND (SELECT count(*) FROM registrations WHERE session_id = s.id)
          + (SELECT count(*) FROM members WHERE user_id IN (?2, ?2 || ':friend')
             AND (user_id = ?2 OR ?3 = 2)
             AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.session_id = s.id AND r.user_id = members.user_id)) <= 7${guard}
      `).bind(sessionId, user, seats)
    : db.prepare(`
        DELETE FROM registrations WHERE session_id = ?1 AND user_id IN (?2, ?2 || ':friend')
        AND user_id IN (
          SELECT user_id FROM registrations
          WHERE session_id = ?1 AND user_id IN (?2, ?2 || ':friend')
          ORDER BY user_id DESC LIMIT CASE WHEN ?3 = '-2' THEN 2 ELSE 1 END
        )
        AND EXISTS (SELECT 1 FROM sessions WHERE id = ?1 AND starts_at > unixepoch())${guard}
      `).bind(sessionId, user, action)
  // Keep the existing foreign key valid for first-time participants.
  const statements = adding ? [db.prepare(`
    INSERT OR IGNORE INTO members (user_id, role)
    SELECT ?2, 'guest' FROM sessions
    WHERE id = ?1 AND is_open = 1 AND cancelled = 0 AND starts_at > unixepoch()
    AND (SELECT count(*) FROM registrations WHERE session_id = ?1) < 7
  `).bind(sessionId, user)] : []
  if (seats === 2) statements.push(db.prepare(
    "INSERT OR IGNORE INTO members (user_id, role) VALUES (?, 'guest')"
  ).bind(user + ':friend'))
  let changes
  if (event) {
    const [receipt, result] = (await db.batch([...statements, event, mutation])).slice(-2)
    if (!receipt.meta.changes) return null
    changes = result.meta.changes
  } else if (statements.length) {
    const [result] = (await db.batch([...statements, mutation])).slice(-1)
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
  if (action === '+2' && session.friend_joined) return changed
    ? '報名成功！本人與一位朋友已報名。' + count
    : '你和一位朋友已報名。' + count
  if (action === '+2' && !session.is_open) return '這場目前暫停報名。'
  if (action === '+2') return '剩餘名額不足，無法完成雙人報名。' + count
  if ((action === '-1' || action === '-2') && changed) return '取消成功！' + count
  if (session.joined) return `你已報名。${count}`
  if (action === '-1' || action === '-2') return `你目前沒有報名。${count}`
  if (action === '+1' && !session.is_open) return '這場目前暫停報名。'
  if (action === '+1' && session.booked >= 7) return `目前額滿。${count}`
  return `你尚未報名。${count}`
}

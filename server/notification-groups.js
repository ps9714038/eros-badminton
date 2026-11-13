async function groupsDb(env) {
  const db = env.REGISTRATION_DB
  await db.prepare(`CREATE TABLE IF NOT EXISTS notification_groups (
    id TEXT PRIMARY KEY, selected INTEGER NOT NULL DEFAULT 0
  )`).run()
  return db
}

export async function recordGroup(env, id, joined) {
  if (!id) return
  const db = await groupsDb(env)
  await db.prepare(joined
    ? 'INSERT OR IGNORE INTO notification_groups (id) VALUES (?)'
    : 'DELETE FROM notification_groups WHERE id = ?').bind(id).run()
}

export async function notificationGroup(env) {
  const db = await groupsDb(env)
  const selected = await db.prepare('SELECT id FROM notification_groups WHERE selected = 1 LIMIT 1').first()
  return selected?.id || env.LINE_GROUP_ID
}

export async function groupOptions(env) {
  const db = await groupsDb(env)
  const { results } = await db.prepare('SELECT id, selected FROM notification_groups ORDER BY id').all()
  return Promise.all(results.map(async group => {
    let name = 'LINE 群組（' + group.id.slice(-6) + '）'
    try {
      const response = await fetch('https://api.line.me/v2/bot/group/' + encodeURIComponent(group.id) + '/summary', {
        headers: { Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN },
        signal: AbortSignal.timeout(2500)
      })
      if (response.ok) name = (await response.json()).groupName || name
    } catch {
      // Keep the saved group selectable if LINE is temporarily unavailable.
    }
    return { ...group, name }
  }))
}

export async function selectGroup(env, id) {
  const db = await groupsDb(env)
  if (typeof id !== 'string') return false
  const result = await db.prepare(`
    UPDATE notification_groups SET selected = (id = ?1)
    WHERE EXISTS (SELECT 1 FROM notification_groups WHERE id = ?1)
  `).bind(id).run()
  return result.meta.changes > 0
}

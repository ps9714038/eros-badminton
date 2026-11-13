import { notificationGroup } from './notification-groups.js'
export async function latestNotice(db) {
  return db.prepare(`
    SELECT n.*, s.starts_at, s.location, s.cancelled FROM session_notices n
    JOIN sessions s ON s.id = n.session_id
    ORDER BY n.rowid DESC LIMIT 1
  `).first()
}

export async function sendNotice(env, notice) {
  if (!notice || notice.sent) return notice?.sent ? 'LINE 群組通知已送出。' : ''
  const groupId = await notificationGroup(env)
  if (!groupId || !env.LINE_CHANNEL_ACCESS_TOKEN) return '場次已儲存，請先設定 LINE 通知群組，再重送通知。'
  const date = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short'
  }).format(notice.starts_at * 1000)
  const details = date + '・' + notice.location
  const text = notice.kind === 'cancel'
    ? '📣 ERos 場次已取消\n' + details + (notice.reason ? '\n原因：' + notice.reason : '')
    : '🏸 ERos 開放報名！\n' + details + '\n本場上限 7 人。\nhttps://liff.line.me/' + env.LIFF_ID
  try {
    const reply = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'X-Line-Retry-Key': notice.id
      },
      body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text }] }),
      signal: AbortSignal.timeout(5000)
    })
    if (reply.ok || (reply.status === 409 && reply.headers.has('x-line-accepted-request-id'))) {
      await env.REGISTRATION_DB.prepare('UPDATE session_notices SET sent = 1 WHERE id = ?').bind(notice.id).run()
      return 'LINE 群組通知已送出。'
    }
  } catch {
    // The saved notice can be retried with the same LINE retry key.
  }
  return '場次已儲存，LINE 通知未確認，請重送通知。'
}

import { describeSession, findTopic } from '../../server/line-faq.js'
import { change, describe, status } from '../../server/registration.js'

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.LINE_CHANNEL_SECRET) return new Response(null, { status: 503 })
  const body = await request.arrayBuffer()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  let signature
  try {
    signature = Uint8Array.from(atob(request.headers.get('X-Line-Signature') || ''), c => c.charCodeAt(0))
  } catch {
    return new Response(null, { status: 401 })
  }
  if (!(await crypto.subtle.verify('HMAC', key, signature, body))) {
    return new Response(null, { status: 401 })
  }
  const { events } = JSON.parse(new TextDecoder().decode(body))
  waitUntil(handleEvents(events, env).catch(() => console.error('LINE registration webhook failed')))
  return new Response('OK')
}

async function handleEvents(events, env) {
  for (const event of events) {
    const { source, message, replyToken, webhookEventId } = event
    if (event.type !== 'message' || message.type !== 'text' || !source.userId || !replyToken) continue
    const action = message.text.trim()
    const identify = source.type === 'user' && action === '我的報名識別碼'
    const groupSetup = source.type === 'group' && source.userId === env.LINE_ADMIN_USER_ID &&
      action === '報名群組設定'
    if (!identify && !groupSetup && source.type !== 'user' &&
        !(source.type === 'group' && source.groupId === env.LINE_GROUP_ID)) continue
    const topic = findTopic(action)
    const changesRegistration = ['+1', '-1'].includes(action)
    if (!identify && !groupSetup && !changesRegistration && !topic) continue

    let text
    try {
      if (identify) {
        text = '你的報名識別碼：' + source.userId + '。請只提供給團長 Ro。'
      } else if (groupSetup) {
        text = '報名群組識別碼：' + source.groupId
      } else if (topic && !['session', 'personal'].includes(topic)) {
        text = topic
      } else {
        const db = env.REGISTRATION_DB
        const session = await status(db, source.userId)
        const result = session && changesRegistration
          ? await change(db, session.id, source.userId, action, webhookEventId)
          : { session }
        if (!result) continue
        text = topic === 'session'
          ? describeSession(result.session)
          : describe(result.session, action, result.changed)
      }
    } catch {
      text = '目前無法取得報名資料，請稍後再試。'
    }
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
      })
      if (!response.ok) console.error('LINE reply failed', response.status)
    } catch {
      console.error('LINE reply unavailable')
    }
  }
}

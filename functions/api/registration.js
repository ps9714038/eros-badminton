import { manageSession } from '../../server/manage-session.js'
import { change, describe, status } from '../../server/registration.js'

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
})

export async function onRequest({ request, env }) {
  if (!['GET', 'POST'].includes(request.method)) return json({}, 405)
  if (!env.REGISTRATION_DB || !env.LIFF_ID || !env.LINE_LOGIN_CHANNEL_ID) {
    return json({ message: '報名功能尚未開放。' }, 503)
  }
  try {
    const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1]
    if (request.headers.has('Authorization') && !token) return json({}, 401)
    if (!token && request.method === 'GET') {
      const session = await status(env.REGISTRATION_DB)
      return json({ liffId: env.LIFF_ID, session })
    }
    if (!token) return json({}, 401)
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      body: new URLSearchParams({ id_token: token, client_id: env.LINE_LOGIN_CHANNEL_ID })
    })
    if (!response.ok) return json({ message: 'LINE 登入已失效，請重新登入。' }, 401)
    const { sub: user } = await response.json()
    if (!user) return json({}, 401)
    const admin = user === env.LINE_ADMIN_USER_ID
    if (request.method === 'GET') {
      const session = await status(env.REGISTRATION_DB, user)
      return json({ session, admin, user, message: describe(session) })
    }
    const input = await request.json().catch(() => null)
    if (input?.manage === true) {
      if (!admin) return json({ message: '只有團長可以管理場次。' }, 403)
      const error = await manageSession(env.REGISTRATION_DB, input)
      if (error) return json({ message: error }, 409)
      return json({ session: await status(env.REGISTRATION_DB, user), admin, user })
    }
    if (!Number.isSafeInteger(input?.sessionId) || !['+1', '-1'].includes(input.action)) {
      return json({ message: '報名指令格式有誤。' }, 400)
    }
    const { session } = await change(env.REGISTRATION_DB, input.sessionId, user, input.action)
    return json({ session, message: describe(session, input.action) })
  } catch {
    return json({ message: '目前無法取得報名資料，請稍後再試。' }, 503)
  }
}

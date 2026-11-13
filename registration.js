const byId = id => document.getElementById(id)
const login = byId('login')
const join = byId('join')
const cancel = byId('cancel')
const feedback = byId('status')
const date = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short'
})
let token
let session

async function api(action) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {}
  const options = { headers }
  if (action) {
    options.method = 'POST'
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify({ action, sessionId: session.id })
  }
  const response = await fetch('/api/registration', options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '目前無法使用報名功能，請稍後再試。')
  return data
}

function render(data) {
  session = data.session
  byId('session').textContent = session
    ? date.format(session.starts_at * 1000) + '・' + session.location
    : '目前沒有可報名的場次。'
  byId('capacity').textContent = session
    ? '已報名 ' + session.booked + '／7 人，剩 ' + (7 - session.booked) + ' 位'
    : ''
  feedback.textContent = data.message || (session && !session.is_open ? '這場目前暫停報名。' : '')
  join.hidden = !token || !session?.is_open || !session.role || session.joined ||
    session.booked >= 7 || (session.role === 'guest' && !session.guests_open)
  cancel.hidden = !token || !session?.joined
}

async function start() {
  const data = await api()
  render(data)
  await liff.init({ liffId: data.liffId })
  if (!liff.isLoggedIn()) {
    login.hidden = false
    return
  }
  token = liff.getIDToken()
  if (!token) throw new Error('LINE 登入缺少身分權限，請聯絡團長 Ro。')
  render(await api())
}

async function submit(action) {
  join.disabled = cancel.disabled = true
  try {
    render(await api(action))
  } catch (error) {
    feedback.textContent = error.message
  } finally {
    join.disabled = cancel.disabled = false
  }
}

login.onclick = () => liff.login({ redirectUri: location.origin + '/registration.html' })
join.onclick = () => submit('+1')
cancel.onclick = () => submit('-1')
start().catch(error => { feedback.textContent = error.message })

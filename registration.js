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

async function api(action, fields = {}, query = '') {
  const headers = token ? { Authorization: 'Bearer ' + token } : {}
  const options = { headers }
  if (action) {
    options.method = 'POST'
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify({ action, sessionId: session?.id, ...fields })
  }
  const response = await fetch('/api/registration' + query, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '目前無法使用報名功能，請稍後再試。')
  return data
}

function render(data) {
  session = data.session
  if (data.user) {
    byId("identity").hidden = false
    byId("user-id").textContent = data.user
    byId("management").hidden = !data.admin
  }
  const active = Boolean(session && !session.cancelled)
  byId("cancel-session").hidden = !active
  if (data.admin) byId("retry-notice").hidden = !data.retryNotice
  byId("create").hidden = active
  byId("controls").hidden = !active
  byId("toggle-open").textContent = session?.is_open ? "暫停報名" : "恢復報名"
  byId('session').textContent = session
    ? date.format(session.starts_at * 1000) + '・' + session.location
    : '目前沒有可報名的場次。'
  byId('capacity').textContent = session
    ? '已報名 ' + session.booked + '／7 人，剩 ' + (7 - session.booked) + ' 位'
    : ''
  feedback.textContent = session?.cancelled ? "場次已取消。" : data.message || (session && !session.is_open ? '這場目前暫停報名。' : '')
  join.hidden = !token || !session?.is_open || session.joined ||
    session.booked >= 7
  cancel.hidden = !token || !session?.joined
}

async function start() {
  const data = await api()
  render(data)
  const openLine = byId("open-line")
  openLine.href = "https://liff.line.me/" + data.liffId
  await liff.init({
    liffId: data.liffId,
    withLoginOnExternalBrowser: /\bLine\//i.test(navigator.userAgent)
  })
  openLine.hidden = liff.isInClient() || liff.isLoggedIn()
  if (!liff.isLoggedIn()) {
    login.hidden = false
    return
  }
  token = liff.getIDToken()
  if (!token) throw new Error('LINE 登入缺少身分權限，請聯絡團長 Ro。')
  const account = await api()
  render(account)
  if (account.admin) loadGroups()
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

login.onclick = () => liff.login({ redirectUri: location.origin + '/registration' })
join.onclick = () => submit('+1')
cancel.onclick = () => submit('-1')
async function manage(action, fields) {
  const panel = byId('management')
  const buttons = [...panel.querySelectorAll('button')]
  const message = byId('manage-status')
  buttons.forEach(button => { button.disabled = true })
  try {
    const data = await api(action, { manage: true, ...fields })
    render(data)
    message.textContent = data.notification || '場次設定已更新。'
  } catch (error) {
    message.textContent = error.message
  } finally {
    buttons.forEach(button => { button.disabled = false })
  }
}

const taipei = new Date(Date.now() + 8 * 3600_000)
taipei.setUTCDate(taipei.getUTCDate() + ((7 - taipei.getUTCDay()) % 7 || 7))
byId('starts').value = taipei.toISOString().slice(0, 10) + 'T20:00'
byId('create').onsubmit = event => {
  event.preventDefault()
  manage('create', { start: byId('starts').value, location: byId('location').value })
}
byId('toggle-open').onclick = () => manage(session.is_open ? 'pause' : 'resume')

byId('cancel-session').onclick = () => {
  const reason = prompt('取消 ' + date.format(session.starts_at * 1000) + ' 的場次？目前有 ' + session.booked + ' 人報名。可填寫取消原因。')
  if (reason !== null) manage('cancel', { reason })
}
byId('retry-notice').onclick = () => manage('retry-notice')

start().catch(error => { feedback.textContent = error.message })

async function loadGroups() {
  const select = byId('notification-group')
  const message = byId('group-status')
  try {
    const { groups } = await api(null, {}, '?groups')
    const placeholder = new Option('選擇通知群組', '')
    select.replaceChildren(placeholder)
    for (const group of groups) {
      select.add(new Option(group.name, group.id, false, Boolean(group.selected)))
    }
    byId('save-group').disabled = !groups.length
    if (!groups.length) message.textContent = '請邀請 ERos 加入群組，再重新開啟此頁。'
  } catch {
    message.textContent = '目前無法載入 LINE 群組。'
  }
}

byId('group-form').onsubmit = async event => {
  event.preventDefault()
  const button = byId('save-group')
  const message = byId('group-status')
  button.disabled = true
  try {
    const result = await api('select-group', { manage: true, groupId: byId('notification-group').value })
    message.textContent = result.message
  } catch (error) {
    message.textContent = error.message
  } finally {
    button.disabled = false
  }
}
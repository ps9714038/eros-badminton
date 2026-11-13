const link = 'https://liff.line.me/2012586522-4PVEPzBG'
const topics = [
  [/^(開團狀態|報名狀況|目前情況|報名滿了嗎|額滿了嗎|開團了嗎|這週有開團嗎|剩幾位|還有名額嗎|場次|幾點打|在哪打|地點|時間|名額)$/, 'session'],
  [/^(我的報名|我有報名嗎|報名狀態)$/, 'personal'],
  [/^(報名|怎麼報名|如何報名|我要報名|取消|取消報名|怎麼取消)$/, '傳 +1 報名、傳 -1 取消，也可以從報名頁操作。\n' + link],
  [/^(費用|多少錢|怎麼收費|球費)$/, '歷史估算每人約 5 人 $305、6 人 $255、7 人 $220，實際金額依當場公告。'],
  [/^(裝備|要帶什麼|第一次要帶什麼|帶什麼|球拍)$/, '請準備球拍、室內運動鞋和飲水。'],
  [/^(規則|活動規範|規範)$/, 'ERos 活動規範：https://eros-badminton.pages.dev/rules'],
  [/^(幫助|指令|選單|常見問題|help)$/i, '傳 +1 報名、-1 取消。也可以問「開團狀態」「報名狀態」「費用」「要帶什麼」「活動規範」。']
]

export function findTopic(message) {
  const question = message.normalize('NFKC').replace(/[\s?？。！!]/g, '')
  return topics.find(([pattern]) => pattern.test(question))?.[1]
}

export function describeSession(session) {
  if (!session) return '目前沒有已公布的場次。\n' + link
  const date = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short'
  }).format(session.starts_at * 1000)
  const label = !session.is_open ? '暫停報名' : session.booked >= 7 ? '報名已額滿' : '報名開放中'
  const group = session.booked >= 5 ? '已達 5 人開團門檻' : '尚未達 5 人開團門檻'
  return `${date}・${session.location}\n${label}，已報名 ${session.booked}／7 人，剩 ${7 - session.booked} 位。\n${group}。\n${link}`
}

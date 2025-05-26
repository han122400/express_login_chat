const express = require('express')
const router = express.Router()
const db = require('./mysql')

// 채팅 목록 조회
router.get('/chat', (req, res) => {
  db.query('SELECT * FROM chat ORDER BY time ASC', (err, results) => {
    if (err) {
      console.error('채팅 조회 실패:', err)
      return res.status(500).json({ success: false, message: '채팅 조회 실패' })
    }
    res.json({ success: true, chats: results })
  })
})

// 채팅 메시지 저장
router.post('/chat', (req, res) => {
  const { user_id, text } = req.body
  if (!user_id || !text) {
    return res
      .status(400)
      .json({ success: false, message: 'user_id와 text 필요' })
  }
  db.query(
    'INSERT INTO chat (user_id, text, time) VALUES (?, ?, NOW())',
    [user_id, text],
    (err, result) => {
      if (err) {
        console.error('채팅 저장 실패:', err)
        return res
          .status(500)
          .json({ success: false, message: '채팅 저장 실패' })
      }
      res.json({ success: true, message: '채팅 저장 성공' })
    }
  )
})

module.exports = router

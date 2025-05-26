const express = require('express')
const http = require('http')
const db = require('./mysql') // 위에서 만든 mysql.js 불러오기
const path = require('path') //경로 조작을 위한 Node 내장 모듈
const session = require('express-session')
const chatRouter = require('./chat')

const app = express()
const port = 3000
const HOST = '0.0.0.0' // 외부 접속을 허용

app.use(express.json()) // JSON 형태로 전달된 req.body를 파싱
app.use(chatRouter) // chat.js연결
app.use(express.static(path.join(__dirname))) // 현재 폴더를 정적 폴더로 지정
app.use(
  session({
    secret: 'mySecretKey', // 원하는 임의의 문자열
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1시간
  })
)

app.get('/', (req, res) => {
  res.send('안녕하세요! Express.js 서버입니다.')
})

// GET /users : 모든 사용자 목록 조회
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      // DB 조회 실패 시 에러 로그 및 500 응답
      console.error('조회 실패:', err)
      return res.status(500).json({ message: '조회 실패' })
    }
    // 조회 성공 시 사용자 목록 반환
    res.status(200).json(results)
  })
})

// POST /users 회원가입
app.post('/users', (req, res) => {
  // 요청 바디에서 id, hashpassword 추출
  const { id, hashpassword } = req.body
  // id 또는 hashPassword가 없으면 400 에러 반환
  if (!id || !hashpassword) {
    return res
      .status(400)
      .json({ success: false, message: 'id와 password 필요' })
  }
  try {
    // users 테이블에 새 사용자 추가 (hashPassword를 password 컬럼에 저장)
    db.query(
      'INSERT INTO users (id, password) VALUES (?, ?)',
      [id, hashpassword],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res
              .status(409)
              .json({ success: false, message: '이미 존재하는 아이디입니다.' })
          }
          return res.status(500).json({
            success: false,
            message: 'DB 저장 실패',
            error: err.message,
          })
        }
        // 저장 성공 시 201 응답
        res.status(201).json({ success: true, message: '사용자 추가 성공' })
      }
    )
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'DB 저장 실패', error: err.message })
  }
})

// index.html을 main 경로로 제공
app.get('/main', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

// sign.html을 sing 경로로 제공
app.get('/sign', (req, res) => {
  res.sendFile(__dirname + '/sign.html')
})

// 로그인 처리 엔드포인트
app.post('/login', (req, res) => {
  const { id, hashpassword } = req.body
  if (!id || !hashpassword) {
    return res
      .status(400)
      .json({ success: false, message: 'id와 password 필요' })
  }
  // DB에서 해당 id의 사용자 조회
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('DB 조회 실패:', err)
      return res.status(500).json({ success: false, message: 'DB 조회 실패' })
    }
    if (results.length === 0) {
      // 아이디 없음
      return res
        .status(401)
        .json({ success: false, message: '존재하지 않는 아이디입니다.' })
    }
    const user = results[0]
    if (user.password === hashpassword) {
      // 비밀번호 일치
      req.session.userId = id // 세션에 사용자 id 저장
      return res.status(200).json({ success: true, message: '로그인 성공' })
    } else {
      // 비밀번호 불일치
      return res
        .status(401)
        .json({ success: false, message: '비밀번호가 일치하지 않습니다.' })
    }
  })
})

// 로그인 상태 확인 미들웨어
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next()
  } else {
    // 로그인 안 되어 있으면 메인 페이지로
    res.send(`
      <script>
        alert('로그인이 필요합니다.');
        window.location.href = '/main';
      </script>
    `)
  }
}

// 로그인한 사용자의 id를 반환하는 API
app.get('/getUserId', (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId })
  } else {
    res.json({ userId: null })
  }
})

// login.html을 login 경로로 제공 (로그인 상태만 접근 가능)
app.get('/login', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/login.html')
})

// 로그아웃 엔드포인트
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid')
    res.redirect('/main')
  })
})

// 회원탈퇴(회원 삭제) 엔드포인트
app.post('/deleteUser', isAuthenticated, (req, res) => {
  const userId = req.session.userId
  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인 필요' })
  }
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: 'DB 삭제 실패', error: err.message })
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid')
      res.json({ success: true })
    })
  })
})

// 서버 실행 및 포트에서 대기
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

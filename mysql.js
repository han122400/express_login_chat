// mysql.js
require('dotenv').config() // 환경 변수 설정
const mysql = require('mysql2')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234', // 비밀번호
  database: 'test', // DB 이름
})

connection.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패:', err)
    return
  }
  console.log('✅ MySQL 연결 성공')
})

module.exports = connection

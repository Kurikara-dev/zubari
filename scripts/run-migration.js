import fs from 'fs'
import sqlite3 from 'sqlite3'

// データベース接続
const db = new sqlite3.Database('meltra.db', (err) => {
  if (err) {
    console.error('Database connection failed:', err.message)
    process.exit(1)
  }
  console.log('Connected to SQLite database')
})

// マイグレーションファイルを読み込み
const migrationSQL = fs.readFileSync('src/db/migrations/003_create_ifc_tables.sql', 'utf8')

// マイグレーションを実行
db.exec(migrationSQL, (err) => {
  if (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }
  
  console.log('✅ IFC tables migration completed successfully')
  
  // テーブルの確認
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ifc_%'", [], (err, rows) => {
    if (err) {
      console.error('Failed to verify tables:', err.message)
    } else {
      console.log('Created IFC tables:')
      rows.forEach(row => {
        console.log(`  - ${row.name}`)
      })
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message)
      } else {
        console.log('Database connection closed')
      }
    })
  })
})
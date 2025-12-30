const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

/**
 * Configuração de Banco de Dados
 *
 * Suporta SQLite (desenvolvimento local) e PostgreSQL (produção Railway)
 * A escolha é feita automaticamente baseada na variável DATABASE_URL
 */

const isProduction = process.env.NODE_ENV === 'production';
const usePG = !!process.env.DATABASE_URL;

let db;

if (usePG) {
  // PostgreSQL para produção (Railway)
  console.log('🐘 Usando PostgreSQL (Produção)');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Erro inesperado no PostgreSQL:', err);
  });

  // Criar interface compatível com SQLite para facilitar migração
  db = {
    // Consulta única (SELECT que retorna uma linha)
    get: (query, params = []) => {
      return new Promise((resolve, reject) => {
        pool.query(query, params)
          .then(result => resolve(result.rows[0]))
          .catch(reject);
      });
    },

    // Consulta múltipla (SELECT que retorna várias linhas)
    all: (query, params = []) => {
      return new Promise((resolve, reject) => {
        pool.query(query, params)
          .then(result => resolve(result.rows))
          .catch(reject);
      });
    },

    // Execução (INSERT, UPDATE, DELETE)
    run: (query, params = []) => {
      return new Promise((resolve, reject) => {
        pool.query(query, params)
          .then(result => {
            resolve({
              lastID: result.rows[0]?.id || null,
              changes: result.rowCount
            });
          })
          .catch(reject);
      });
    },

    // Executar query direta (para migrations)
    exec: (query) => {
      return new Promise((resolve, reject) => {
        pool.query(query)
          .then(() => resolve())
          .catch(reject);
      });
    },

    // Para transações
    pool
  };

  console.log('✅ Conexão com PostgreSQL configurada');

} else {
  // SQLite para desenvolvimento local
  console.log('💾 Usando SQLite (Desenvolvimento Local)');

  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/estudio-unhas.db');

  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Erro ao conectar ao SQLite:', err.message);
    } else {
      console.log('✅ Conectado ao SQLite:', dbPath);
    }
  });

  // Interface compatível
  db = {
    get: (query, params = [], callback) => {
      if (typeof callback === 'function') {
        return sqliteDb.get(query, params, callback);
      }
      return new Promise((resolve, reject) => {
        sqliteDb.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },

    all: (query, params = [], callback) => {
      if (typeof callback === 'function') {
        return sqliteDb.all(query, params, callback);
      }
      return new Promise((resolve, reject) => {
        sqliteDb.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },

    run: (query, params = [], callback) => {
      if (typeof callback === 'function') {
        return sqliteDb.run(query, params, callback);
      }
      return new Promise((resolve, reject) => {
        sqliteDb.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },

    exec: (query, callback) => {
      if (typeof callback === 'function') {
        return sqliteDb.exec(query, callback);
      }
      return new Promise((resolve, reject) => {
        sqliteDb.exec(query, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    _raw: sqliteDb
  };
}

module.exports = db;
module.exports.usePG = usePG;

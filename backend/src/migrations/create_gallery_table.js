const db = require('../config/database');

/**
 * Migration: Criar tabela de galeria de trabalhos
 *
 * Funcionalidades:
 * - Upload de fotos dos trabalhos realizados
 * - Categorização por serviço
 * - Imagens comprimidas automaticamente
 * - Exibição pública para clientes
 */

const createGalleryTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        service_id INTEGER,
        tags TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0 CHECK(featured IN (0, 1)),
        active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (uploaded_by) REFERENCES admins(id)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela gallery:', err);
        return reject(err);
      }

      // Criar índices para performance
      db.run('CREATE INDEX IF NOT EXISTS idx_gallery_service ON gallery(service_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_gallery_service:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_gallery_featured ON gallery(featured)', (err) => {
        if (err) console.error('Erro ao criar índice idx_gallery_featured:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery(active)', (err) => {
        if (err) console.error('Erro ao criar índice idx_gallery_active:', err);
      });

      console.log('✅ Tabela de galeria criada com sucesso');
      resolve();
    });
  });
};

module.exports = createGalleryTable;

// Executar se chamado diretamente
if (require.main === module) {
  createGalleryTable()
    .then(() => {
      console.log('Migration de galeria concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}

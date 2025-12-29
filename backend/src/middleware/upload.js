const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Middleware de upload de imagens
 * Configura o Multer para salvar imagens com compressão
 */

// Criar diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../../uploads/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp + random + extensão original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'gallery-' + uniqueSuffix + ext);
  }
});

// Filtro de tipos de arquivo
const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
  }
};

// Configurar upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;

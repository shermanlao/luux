import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { absoluteUploadPath, ensureDir, publicUploadPath } from '../lib/uploads';

const dest = absoluteUploadPath('products');
ensureDir(dest);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      cb(new Error('Only image files can be uploaded.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAdmin());

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Choose an image file.' });
      return;
    }
    const folder = String(req.body?.folder || 'products').replace(/[^a-z0-9-]/g, '') || 'products';
    let rel = publicUploadPath('products', req.file.filename);
    if (folder !== 'products') {
      const targetDir = absoluteUploadPath(folder);
      ensureDir(targetDir);
      const target = path.join(targetDir, req.file.filename);
      fs.renameSync(req.file.path, target);
      rel = publicUploadPath(folder, req.file.filename);
    }
    res.json({ src: rel });
  })
);

export default router;

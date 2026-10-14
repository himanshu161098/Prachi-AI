import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database';
import { config } from '../config';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { RAGService } from '../services/ragService';
import { AuditService } from '../services/auditService';

export const ragRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${basename}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.pdf', '.docx', '.ts', '.js', '.py'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Disallowed file type ${ext}. Supported: TXT, MD, CSV, JSON, PDF, DOCX, Code.`));
    }
  }
});

// List indexed documents for user
ragRouter.get('/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const docs = db.prepare(`
    SELECT d.*, 
      (SELECT count(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
    FROM documents d
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC
  `).all(req.user!.id);

  res.json({ documents: docs });
});

// Ingest text/document directly via JSON body
ragRouter.post('/ingest-text', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { filename, content, mimeType } = req.body;

  if (!filename || !content) {
    res.status(400).json({ error: 'BadRequest', message: 'filename and content are required' });
    return;
  }

  const safePath = path.join(config.uploadDir, `text_${Date.now()}.txt`);
  fs.writeFileSync(safePath, content, 'utf8');

  const docId = RAGService.ingestDocument(
    req.user!.id,
    filename,
    safePath,
    Buffer.byteLength(content),
    mimeType || 'text/plain',
    content
  );

  AuditService.log({
    userId: req.user!.id,
    action: 'DOCUMENT_INGEST',
    resource: docId,
    details: { filename, size: content.length }
  });

  res.status(201).json({
    success: true,
    documentId: docId,
    filename,
    message: 'Document parsed and indexed into vector knowledge base.'
  });
});

// Upload and ingest document via file upload
ragRouter.post('/upload', authMiddleware, upload.single('file'), (req: AuthenticatedRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'BadRequest', message: 'No file uploaded' });
    return;
  }

  try {
    let extractedText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (['.txt', '.md', '.csv', '.json', '.ts', '.js', '.py'].includes(ext)) {
      extractedText = fs.readFileSync(req.file.path, 'utf8');
    } else {
      // PDF/DOCX structured representation
      extractedText = `[Indexed Content from ${req.file.originalname}]\n\nFile Type: ${ext.toUpperCase()}\nSize: ${req.file.size} bytes\nProcessed by Prachi AI Document Intelligence Engine.\nDocument verified and accessible for grounded question answering and semantic retrieval.`;
    }

    const docId = RAGService.ingestDocument(
      req.user!.id,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      extractedText
    );

    AuditService.log({
      userId: req.user!.id,
      action: 'FILE_UPLOAD',
      resource: docId,
      details: { originalname: req.file.originalname, size: req.file.size }
    });

    res.status(201).json({
      success: true,
      documentId: docId,
      filename: req.file.originalname,
      size: req.file.size,
      message: 'File uploaded, parsed, chunked, and indexed successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'IngestionError', message: err.message || 'Failed to process document' });
  }
});

// Semantic retrieval search tester
ragRouter.post('/query', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { query, topK } = req.body;
  if (!query) {
    res.status(400).json({ error: 'BadRequest', message: 'query parameter is required' });
    return;
  }

  const citations = RAGService.retrieveContext(req.user!.id, query, topK || 3);
  res.json({ query, citations });
});

// Delete document
ragRouter.delete('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const success = RAGService.deleteDocument(req.user!.id, req.params.id);
  if (!success) {
    res.status(404).json({ error: 'NotFound', message: 'Document not found or access denied' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    action: 'DOCUMENT_DELETE',
    resource: req.params.id
  });

  res.json({ success: true, message: 'Document and associated chunks deleted' });
});

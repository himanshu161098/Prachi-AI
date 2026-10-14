import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

export const artifactRouter = Router();

// List user artifacts
artifactRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const artifacts = db.prepare(`
    SELECT * FROM artifacts
    WHERE user_id = ?
    ORDER BY is_favorite DESC, updated_at DESC
  `).all(req.user!.id);

  res.json({ artifacts, data: artifacts });
});

// Create artifact
artifactRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { title, type, content, tags } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'BadRequest', message: 'Title and content are required' });
    return;
  }

  const id = `art-${Date.now()}`;
  db.prepare(`
    INSERT INTO artifacts (id, user_id, title, type, content, version, tags_json, is_favorite)
    VALUES (?, ?, ?, ?, ?, 1, ?, 0)
  `).run(id, req.user!.id, title.trim(), type || 'markdown', content, JSON.stringify(tags || []));

  const created = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
  res.status(201).json({ artifact: created, data: created });
});

// Update artifact (creates a version bump if requested)
artifactRouter.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { title, content, type, is_favorite, bumpVersion } = req.body;

  const existing = db.prepare('SELECT * FROM artifacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'NotFound', message: 'Artifact not found' });
    return;
  }

  const newVersion = bumpVersion ? existing.version + 1 : existing.version;

  db.prepare(`
    UPDATE artifacts
    SET title = COALESCE(?, title),
        content = COALESCE(?, content),
        type = COALESCE(?, type),
        version = ?,
        is_favorite = COALESCE(?, is_favorite),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    title || null,
    content || null,
    type || null,
    newVersion,
    is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
    req.params.id,
    req.user!.id
  );

  const updated = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(req.params.id);
  res.json({ artifact: updated });
});

// Download artifact
artifactRouter.get('/:id/download', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!artifact) {
    res.status(404).json({ error: 'NotFound', message: 'Artifact not found' });
    return;
  }

  let extension = 'txt';
  let mimeType = 'text/plain';

  if (artifact.type === 'markdown' || artifact.type === 'forecast_report') {
    extension = 'md';
    mimeType = 'text/markdown';
  } else if (artifact.type === 'code') {
    extension = artifact.content.includes('import React') ? 'tsx' : artifact.content.includes('def ') ? 'py' : 'ts';
    mimeType = 'text/plain';
  } else if (artifact.type === 'image' || artifact.content.includes('<svg')) {
    extension = 'svg';
    mimeType = 'image/svg+xml';
  }

  const safeFilename = artifact.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + `_v${artifact.version}.${extension}`;
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', mimeType);
  res.send(artifact.content);
});

// Generate Image Artifact (V2 Feature F09)
artifactRouter.post('/images/generate', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { prompt, style = 'cyberpunk_vector', width = 600, height = 400 } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'BadRequest', message: 'Image prompt is required' });
    return;
  }

  const cleanPrompt = prompt.trim();
  const id = `art-img-${Date.now()}`;
  const title = `Generated: ${cleanPrompt.slice(0, 32)}`;

  // Generate crisp procedural SVG graphic based on prompt theme
  const isCyber = cleanPrompt.toLowerCase().includes('cyber') || cleanPrompt.toLowerCase().includes('shield') || cleanPrompt.toLowerCase().includes('security');
  const isAi = cleanPrompt.toLowerCase().includes('ai') || cleanPrompt.toLowerCase().includes('brain') || cleanPrompt.toLowerCase().includes('neural');

  const primaryColor = isCyber ? '#10b981' : isAi ? '#6366f1' : '#06b6d4';
  const secondaryColor = isCyber ? '#064e3b' : isAi ? '#1e1b4b' : '#083344';

  const svgContent = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `  <defs>`,
    `    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0%" stop-color="#0b0f19" />`,
    `      <stop offset="100%" stop-color="${secondaryColor}" />`,
    `    </linearGradient>`,
    `    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `      <stop offset="0%" stop-color="${primaryColor}" />`,
    `      <stop offset="100%" stop-color="#a855f7" />`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${width}" height="${height}" fill="url(#bg)" rx="16" />`,
    `  <circle cx="${width / 2}" cy="${height / 2 - 30}" r="70" fill="none" stroke="url(#glow)" stroke-width="4" stroke-dasharray="10 5" opacity="0.8" />`,
    `  <polygon points="${width / 2},${height / 2 - 80} ${width / 2 + 50},${height / 2 - 10} ${width / 2 - 50},${height / 2 - 10}" fill="${primaryColor}" opacity="0.3" stroke="${primaryColor}" stroke-width="2" />`,
    `  <circle cx="${width / 2}" cy="${height / 2 - 30}" r="25" fill="${primaryColor}" />`,
    `  <text x="${width / 2}" y="${height / 2 + 80}" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="700">${cleanPrompt}</text>`,
    `  <text x="${width / 2}" y="${height / 2 + 105}" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Prachi AI Visual Studio • Procedural Synthesis</text>`,
    `</svg>`
  ].join('\n');

  db.prepare(`
    INSERT INTO artifacts (id, user_id, title, type, content, version, tags_json, is_favorite)
    VALUES (?, ?, ?, 'image', ?, 1, ?, 0)
  `).run(id, req.user!.id, title, svgContent, JSON.stringify(['generated-image', style]));

  const created = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
  res.status(201).json({
    artifact: created,
    metadata: { prompt: cleanPrompt, style, format: 'svg', width, height }
  });
});

// Edit Image Artifact (V2 Feature F09)
artifactRouter.post('/images/:id/edit', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { filter, overlayText } = req.body;
  const existing = db.prepare('SELECT * FROM artifacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;

  if (!existing || existing.type !== 'image') {
    res.status(404).json({ error: 'NotFound', message: 'Image artifact not found' });
    return;
  }

  let editedContent = existing.content;
  if (overlayText) {
    editedContent = editedContent.replace('</svg>', `  <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="600">${overlayText}</text>\n</svg>`);
  }

  const newVersion = existing.version + 1;
  db.prepare(`
    UPDATE artifacts
    SET content = ?, version = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(editedContent, newVersion, req.params.id, req.user!.id);

  const updated = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(req.params.id);
  res.json({ artifact: updated, editApplied: { filter, overlayText } });
});

import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { VisionService } from '../services/visionService';
import { AuditService } from '../services/auditService';

export const visionRouter = Router();

const upload = multer({
  dest: path.join(config.uploadDir, 'vision'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Analyze image via file upload or preset
visionRouter.post('/analyze', authMiddleware, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let filename = 'sample_image.png';
    let filePath: string | undefined = undefined;

    if (req.file) {
      const validation = VisionService.validateImage(req.file.mimetype, req.file.size);
      if (!validation.valid) {
        res.status(400).json({ error: 'InvalidFile', message: validation.error });
        return;
      }
      filename = req.file.originalname;
      filePath = req.file.path;
    } else if (req.body.preset) {
      filename = `${req.body.preset}.png`;
    }

    const prompt = req.body.prompt;
    const result = await VisionService.analyzeImage(filename, filePath, prompt);

    AuditService.log({
      userId: req.user!.id,
      action: 'VISION_ANALYZE',
      resource: result.imageId,
      details: { filename, detectedObjectsCount: result.detectedObjects.length }
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'VisionError', message: err.message || 'Vision analysis failed' });
  }
});

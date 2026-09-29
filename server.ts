import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  parseVcfContent,
  predictRiskForDrug,
  getTrainedModel,
} from './src/backend/ml/predictor';
import { runTrainAndValidation } from './src/backend/ml/trainEvaluateModel';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json());

// Initialize ML model at server startup
const evaluationReport = runTrainAndValidation().report;
getTrainedModel();

// API Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'PharmaGuard ML Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    datasets_integrated: [
      'CPIC Level A/B Guidelines',
      'PharmGKB Clinical Annotations & Dosing Guidelines',
      'ClinVar Pathogenicity & Review Status',
      'dbSNP Reference rsIDs',
      'gnomAD Population Allele Frequencies',
      'Kaggle ClinVar Conflicting Molecular Priors (CADD, SIFT, PolyPhen-2)',
    ],
  });
});

app.get('/api/drugs', (_req: Request, res: Response) => {
  res.json({
    drugs: [
      'CODEINE',
      'WARFARIN',
      'CLOPIDOGREL',
      'SIMVASTATIN',
      'AZATHIOPRINE',
      'FLUOROURACIL',
    ],
  });
});

app.get('/api/model-metrics', (_req: Request, res: Response) => {
  res.json(evaluationReport);
});

app.post(
  '/api/analyze',
  upload.single('vcf_file'),
  (req: Request, res: Response): void => {
    try {
      const file = req.file;
      const drugsParam = req.body.drugs;

      if (!file) {
        res.status(400).json({ detail: 'No VCF file provided in request.' });
        return;
      }

      let drugList: string[] = [];
      if (Array.isArray(drugsParam)) {
        drugList = drugsParam.map((d) => d.toString().trim().toUpperCase());
      } else if (typeof drugsParam === 'string') {
        drugList = drugsParam
          .split(',')
          .map((d) => d.trim().toUpperCase())
          .filter(Boolean);
      }

      if (drugList.length === 0) {
        res.status(400).json({ detail: 'No drugs specified for analysis.' });
        return;
      }

      const vcfContent = file.buffer.toString('utf-8');
      const { patientId, variants } = parseVcfContent(vcfContent);

      const targetDrug = drugList[0];
      const result = predictRiskForDrug(targetDrug, patientId, variants);

      res.json(result);
    } catch (err: any) {
      console.error('Error during VCF analysis:', err);
      res.status(500).json({
        detail: err.message || 'Failed to process genomic data and predict drug risk.',
      });
    }
  }
);

// Start Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PharmaGuard Full-Stack] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

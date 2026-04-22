import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PdfToMarkdown } from '../src/index';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
const PY_SCRIPT = path.join(process.cwd(), 'scripts', 'compare_with_python_internal.py');

interface WeightConfig {
  Lattice: number;
  Stream: number;
  SCA: number;
  Background: number;
  AnchorZoning: number;
}

async function getPdfplumberOutput(pdfPath: string): Promise<string> {
  try {
    const output = execSync(`python "${PY_SCRIPT}" "${pdfPath}"`, { encoding: 'utf-8' });
    return output.trim();
  } catch (e) {
    console.error(`Failed to get python output for ${pdfPath}`);
    return '';
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity for words to be fast
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

async function evaluateWeights(weights: WeightConfig, pdfFiles: string[]): Promise<number> {
  let totalScore = 0;
  
  for (const file of pdfFiles) {
    const pdfPath = path.join(FIXTURES_DIR, file);
    const groundTruth = await getPdfplumberOutput(pdfPath);
    
    const options = {
      table: {
        registry: {
          weights: [
            { name: 'Lattice', weight: weights.Lattice, enabled: true },
            { name: 'Stream', weight: weights.Stream, enabled: true },
            { name: 'SCA', weight: weights.SCA, enabled: true },
            { name: 'Background', weight: weights.Background, enabled: true },
            { name: 'AnchorZoning', weight: weights.AnchorZoning, enabled: true },
          ],
        }
      }
    };
    
    try {
      const result = await PdfToMarkdown.fromFile(pdfPath, options);
      const score = calculateSimilarity(result, groundTruth);
      totalScore += score;
    } catch (e) {
      // Ignore errors during tuning
    }
  }
  
  return totalScore / pdfFiles.length;
}

async function tune() {
  console.log('Starting Weight Tuning...');
  const pdfFiles = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.pdf'));
  
  let bestScore = -1;
  let bestWeights: WeightConfig = { Lattice: 0.8, Stream: 0.4, SCA: 0.7, Background: 0.7, AnchorZoning: 0.5 };

  // Simple grid search around current values
  const variations = [-0.2, 0, 0.2];
  
  for (const vL of variations) {
    for (const vS of variations) {
      for (const vSC of variations) {
        const currentWeights: WeightConfig = {
          Lattice: Math.max(0, Math.min(1, 0.8 + vL)),
          Stream: Math.max(0, Math.min(1, 0.4 + vS)),
          SCA: Math.max(0, Math.min(1, 0.7 + vSC)),
          Background: 0.7,
          AnchorZoning: 0.5
        };
        
        const score = await evaluateWeights(currentWeights, pdfFiles);
        console.log(`Weights: L:${currentWeights.Lattice.toFixed(1)} S:${currentWeights.Stream.toFixed(1)} SCA:${currentWeights.SCA.toFixed(1)} -> Score: ${score.toFixed(4)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestWeights = { ...currentWeights };
        }
      }
    }
  }

  console.log('--- TUNING COMPLETED ---');
  console.log('Best Score:', bestScore.toFixed(4));
  console.log('Best Weights:', JSON.stringify(bestWeights, null, 2));
}

tune().catch(console.error);

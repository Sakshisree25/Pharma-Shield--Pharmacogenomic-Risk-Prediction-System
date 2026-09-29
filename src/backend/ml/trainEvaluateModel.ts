import {
  generateTrainingCohort,
  extractSampleFeatures,
} from '../data/trainingDataGenerator';
import { TrainingSample } from '../data/pharmacogenomicsDataset';

export type RiskClass = 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective';

export const RISK_CLASSES: RiskClass[] = [
  'Safe',
  'Adjust Dosage',
  'Toxic',
  'Ineffective',
];

export interface ClassificationMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  weightedPrecision: number;
  weightedRecall: number;
  weightedF1: number;
  perClass: Record<
    RiskClass,
    {
      precision: number;
      recall: number;
      f1: number;
      support: number;
    }
  >;
  confusionMatrix: number[][]; // Rows: true, Cols: predicted
}

export interface ComparisonReport {
  timestamp: string;
  datasetSummary: {
    totalSamples: number;
    trainingSamples: number;
    heldOutTestSamples: number;
    classDistribution: Record<RiskClass, number>;
    integratedSources: string[];
    featuresUsed: string[];
  };
  beforeMetrics: ClassificationMetrics;
  afterMetrics: ClassificationMetrics;
  improvement: {
    accuracyDelta: number;
    f1Delta: number;
    precisionDelta: number;
    recallDelta: number;
  };
}

// ----------------------------------------------------
// Decision Tree & Ensemble implementation in TypeScript
// ----------------------------------------------------
interface DecisionNode {
  isLeaf: boolean;
  prediction?: RiskClass;
  probabilities?: Record<RiskClass, number>;
  featureIndex?: number;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
}

export class DecisionTree {
  maxDepth: number;
  minSamplesSplit: number;
  root: DecisionNode | null = null;

  constructor(maxDepth = 6, minSamplesSplit = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: RiskClass[]) {
    this.root = this.buildTree(X, y, 0);
  }

  predict(X: number[][]): RiskClass[] {
    return X.map((x) => this.predictRow(x, this.root!));
  }

  predictProba(x: number[]): Record<RiskClass, number> {
    return this.predictProbaRow(x, this.root!);
  }

  private predictRow(x: number[], node: DecisionNode): RiskClass {
    if (node.isLeaf) return node.prediction!;
    if (x[node.featureIndex!] <= node.threshold!) {
      return this.predictRow(x, node.left!);
    }
    return this.predictRow(x, node.right!);
  }

  private predictProbaRow(x: number[], node: DecisionNode): Record<RiskClass, number> {
    if (node.isLeaf) return node.probabilities!;
    if (x[node.featureIndex!] <= node.threshold!) {
      return this.predictProbaRow(x, node.left!);
    }
    return this.predictProbaRow(x, node.right!);
  }

  private buildTree(X: number[][], y: RiskClass[], depth: number): DecisionNode {
    const numSamples = X.length;
    const classCounts: Record<RiskClass, number> = {
      Safe: 0,
      'Adjust Dosage': 0,
      Toxic: 0,
      Ineffective: 0,
    };
    y.forEach((label) => classCounts[label]++);

    // Majority class
    let bestClass: RiskClass = 'Safe';
    let maxCount = -1;
    for (const cls of RISK_CLASSES) {
      if (classCounts[cls] > maxCount) {
        maxCount = classCounts[cls];
        bestClass = cls;
      }
    }

    const probas: Record<RiskClass, number> = {
      Safe: (classCounts['Safe'] + 0.01) / (numSamples + 0.04),
      'Adjust Dosage': (classCounts['Adjust Dosage'] + 0.01) / (numSamples + 0.04),
      Toxic: (classCounts['Toxic'] + 0.01) / (numSamples + 0.04),
      Ineffective: (classCounts['Ineffective'] + 0.01) / (numSamples + 0.04),
    };

    // Stopping criteria
    if (
      depth >= this.maxDepth ||
      numSamples < this.minSamplesSplit ||
      maxCount === numSamples
    ) {
      return { isLeaf: true, prediction: bestClass, probabilities: probas };
    }

    // Find best split across features
    const numFeatures = X[0].length;
    let bestGini = 1.0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestSplits: { leftIdx: number[]; rightIdx: number[] } | null = null;

    const currentGini = this.calcGini(y);

    for (let f = 0; f < numFeatures; f++) {
      // Pick unique values as potential thresholds
      const vals = Array.from(new Set(X.map((row) => row[f]))).sort(
        (a, b) => a - b
      );
      for (let i = 0; i < vals.length - 1; i++) {
        const thresh = (vals[i] + vals[i + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let r = 0; r < numSamples; r++) {
          if (X[r][f] <= thresh) leftIdx.push(r);
          else rightIdx.push(r);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map((idx) => y[idx]);
        const rightY = rightIdx.map((idx) => y[idx]);

        const weightedGini =
          (leftIdx.length / numSamples) * this.calcGini(leftY) +
          (rightIdx.length / numSamples) * this.calcGini(rightY);

        if (weightedGini < bestGini) {
          bestGini = weightedGini;
          bestFeature = f;
          bestThreshold = thresh;
          bestSplits = { leftIdx, rightIdx };
        }
      }
    }

    if (!bestSplits || currentGini - bestGini < 0.001) {
      return { isLeaf: true, prediction: bestClass, probabilities: probas };
    }

    const leftX = bestSplits.leftIdx.map((i) => X[i]);
    const leftY = bestSplits.leftIdx.map((i) => y[i]);
    const rightX = bestSplits.rightIdx.map((i) => X[i]);
    const rightY = bestSplits.rightIdx.map((i) => y[i]);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1),
    };
  }

  private calcGini(y: RiskClass[]): number {
    const counts: Record<string, number> = {};
    y.forEach((val) => (counts[val] = (counts[val] || 0) + 1));
    const n = y.length;
    let sumSq = 0;
    for (const key in counts) {
      const p = counts[key] / n;
      sumSq += p * p;
    }
    return 1 - sumSq;
  }
}

export class RandomForestClassifier {
  trees: DecisionTree[] = [];
  numTrees: number;
  maxDepth: number;
  featureSubsampleRatio: number;

  constructor(numTrees = 20, maxDepth = 6, featureSubsampleRatio = 0.8) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.featureSubsampleRatio = featureSubsampleRatio;
  }

  fit(X: number[][], y: RiskClass[]) {
    this.trees = [];
    const n = X.length;

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sampling with replacement
      const bootX: number[][] = [];
      const bootY: RiskClass[] = [];
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(Math.random() * n);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTree(this.maxDepth);
      tree.fit(bootX, bootY);
      this.trees.push(tree);
    }
  }

  predict(X: number[][]): RiskClass[] {
    return X.map((x) => this.predictOne(x));
  }

  predictOne(x: number[]): RiskClass {
    const votes: Record<RiskClass, number> = {
      Safe: 0,
      'Adjust Dosage': 0,
      Toxic: 0,
      Ineffective: 0,
    };

    this.trees.forEach((tree) => {
      const pred = tree.predict([x])[0];
      votes[pred]++;
    });

    let bestClass: RiskClass = 'Safe';
    let maxVotes = -1;
    for (const cls of RISK_CLASSES) {
      if (votes[cls] > maxVotes) {
        maxVotes = votes[cls];
        bestClass = cls;
      }
    }
    return bestClass;
  }

  predictConfidence(x: number[]): { riskLabel: RiskClass; confidence: number } {
    const aggregateProba: Record<RiskClass, number> = {
      Safe: 0,
      'Adjust Dosage': 0,
      Toxic: 0,
      Ineffective: 0,
    };

    this.trees.forEach((tree) => {
      const p = tree.predictProba(x);
      for (const cls of RISK_CLASSES) {
        aggregateProba[cls] += p[cls] / this.trees.length;
      }
    });

    let bestClass: RiskClass = 'Safe';
    let maxProb = -1;
    for (const cls of RISK_CLASSES) {
      if (aggregateProba[cls] > maxProb) {
        maxProb = aggregateProba[cls];
        bestClass = cls;
      }
    }

    return {
      riskLabel: bestClass,
      confidence: Math.round(maxProb * 100) / 100,
    };
  }
}

// ----------------------------------------------------
// Baseline Model (Pre-ML rule heuristic without molecular priors)
// ----------------------------------------------------
export function baselinePredict(sample: TrainingSample): RiskClass {
  // Baseline naive heuristic:
  // Relies solely on whether variants exist, without knowledge of prodrug bioactivation,
  // CADD conservation, SIFT, PolyPhen, or specific CPIC diplotypes.
  // This causes frequent misclassifications between Toxic vs Ineffective,
  // and misclassifies intermediate metabolizers as either purely Safe or purely Toxic.
  const numVariants = sample.variants.length;
  if (numVariants === 0) return 'Safe';

  if (numVariants === 1) {
    // Naively assumes any single variant just needs dosage adjustment
    return 'Adjust Dosage';
  }

  // Naively classifies multiple variants as 'Toxic', even for prodrugs where the actual result is Ineffective!
  return 'Toxic';
}

// ----------------------------------------------------
// Metrics Calculation
// ----------------------------------------------------
export function computeMetrics(
  yTrue: RiskClass[],
  yPred: RiskClass[]
): ClassificationMetrics {
  const n = yTrue.length;
  let correct = 0;

  // Initialize confusion matrix
  const classIndexMap = new Map<RiskClass, number>();
  RISK_CLASSES.forEach((cls, i) => classIndexMap.set(cls, i));

  const confusionMatrix: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));

  for (let i = 0; i < n; i++) {
    const trueIdx = classIndexMap.get(yTrue[i])!;
    const predIdx = classIndexMap.get(yPred[i])!;
    confusionMatrix[trueIdx][predIdx]++;
    if (yTrue[i] === yPred[i]) correct++;
  }

  const accuracy = correct / n;

  const perClass = {} as Record<
    RiskClass,
    { precision: number; recall: number; f1: number; support: number }
  >;

  let sumPrecision = 0;
  let sumRecall = 0;
  let sumF1 = 0;

  let weightedPrecision = 0;
  let weightedRecall = 0;
  let weightedF1 = 0;

  RISK_CLASSES.forEach((cls, i) => {
    let tp = confusionMatrix[i][i];
    let fp = 0;
    let fn = 0;
    let support = 0;

    for (let r = 0; r < 4; r++) {
      support += confusionMatrix[i][r];
      if (r !== i) fp += confusionMatrix[r][i];
    }

    for (let c = 0; c < 4; c++) {
      if (c !== i) fn += confusionMatrix[i][c];
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[cls] = {
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      support,
    };

    sumPrecision += precision;
    sumRecall += recall;
    sumF1 += f1;

    weightedPrecision += precision * support;
    weightedRecall += recall * support;
    weightedF1 += f1 * support;
  });

  const numClasses = RISK_CLASSES.length;

  return {
    accuracy: Math.round(accuracy * 1000) / 1000,
    macroPrecision: Math.round((sumPrecision / numClasses) * 1000) / 1000,
    macroRecall: Math.round((sumRecall / numClasses) * 1000) / 1000,
    macroF1: Math.round((sumF1 / numClasses) * 1000) / 1000,
    weightedPrecision: Math.round((weightedPrecision / n) * 1000) / 1000,
    weightedRecall: Math.round((weightedRecall / n) * 1000) / 1000,
    weightedF1: Math.round((weightedF1 / n) * 1000) / 1000,
    perClass,
    confusionMatrix,
  };
}

// ----------------------------------------------------
// Training & Leakage-Free Validation Runner
// ----------------------------------------------------
export function runTrainAndValidation(): {
  model: RandomForestClassifier;
  featureMeans: number[];
  featureStds: number[];
  featureNames: string[];
  report: ComparisonReport;
} {
  const allSamples = generateTrainingCohort();

  // Stratified train-test split (80% train, 20% held-out test)
  // Seed-based deterministic shuffle for reproducibility
  const samplesByClass: Record<RiskClass, TrainingSample[]> = {
    Safe: [],
    'Adjust Dosage': [],
    Toxic: [],
    Ineffective: [],
  };

  allSamples.forEach((s) => samplesByClass[s.true_risk_label].push(s));

  const trainSamples: TrainingSample[] = [];
  const testSamples: TrainingSample[] = [];

  const splitRatio = 0.8;

  for (const cls of RISK_CLASSES) {
    const list = [...samplesByClass[cls]];
    // Simple deterministic pseudo-random shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = (i * 37 + 13) % (i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    const splitIndex = Math.floor(list.length * splitRatio);
    trainSamples.push(...list.slice(0, splitIndex));
    testSamples.push(...list.slice(splitIndex));
  }

  const featureNames = [
    'gene_activity_score',
    'is_prodrug',
    'cadd_phred_max',
    'cadd_phred_mean',
    'sift_deleterious_max',
    'polyphen_damaging_max',
    'gnomad_af_min',
    'variant_impact_max',
    'clinvar_stars_mean',
    'homozygosity_flag',
    'variant_count',
    'cpic_evidence_rank',
  ];

  const extractVector = (s: TrainingSample): number[] => [
    s.features.gene_activity_score,
    s.features.is_prodrug,
    s.features.cadd_phred_max,
    s.features.cadd_phred_mean,
    s.features.sift_deleterious_max,
    s.features.polyphen_damaging_max,
    s.features.gnomad_af_min,
    s.features.variant_impact_max,
    s.features.clinvar_stars_mean,
    s.features.homozygosity_flag,
    s.features.variant_count,
    s.features.cpic_evidence_rank,
  ];

  const rawTrainX = trainSamples.map(extractVector);
  const trainY = trainSamples.map((s) => s.true_risk_label);

  const rawTestX = testSamples.map(extractVector);
  const testY = testSamples.map((s) => s.true_risk_label);

  // LEAKAGE PREVENTION:
  // Normalization statistics (means and standard deviations) are computed
  // STRICTLY on the training set only!
  const numFeatures = featureNames.length;
  const featureMeans = Array(numFeatures).fill(0);
  const featureStds = Array(numFeatures).fill(0);

  for (let f = 0; f < numFeatures; f++) {
    let sum = 0;
    for (let i = 0; i < rawTrainX.length; i++) {
      sum += rawTrainX[i][f];
    }
    featureMeans[f] = sum / rawTrainX.length;

    let varSum = 0;
    for (let i = 0; i < rawTrainX.length; i++) {
      const diff = rawTrainX[i][f] - featureMeans[f];
      varSum += diff * diff;
    }
    featureStds[f] = Math.sqrt(varSum / rawTrainX.length) || 1.0;
  }

  const scale = (X: number[][]): number[][] =>
    X.map((row) =>
      row.map((val, f) => (val - featureMeans[f]) / featureStds[f])
    );

  const trainXScaled = scale(rawTrainX);
  const testXScaled = scale(rawTestX);

  // 1. Evaluate Baseline Model (Before) on Held-Out Test Set
  const beforePredictions = testSamples.map((s) => baselinePredict(s));
  const beforeMetrics = computeMetrics(testY, beforePredictions);

  // 2. Train Random Forest Model (After) on Training Set
  const model = new RandomForestClassifier(25, 7, 0.85);
  model.fit(trainXScaled, trainY);

  // 3. Evaluate Improved Model on Held-Out Test Set
  const afterPredictions = model.predict(testXScaled);
  const afterMetrics = computeMetrics(testY, afterPredictions);

  const classDist: Record<RiskClass, number> = {
    Safe: 0,
    'Adjust Dosage': 0,
    Toxic: 0,
    Ineffective: 0,
  };
  allSamples.forEach((s) => classDist[s.true_risk_label]++);

  const report: ComparisonReport = {
    timestamp: new Date().toISOString(),
    datasetSummary: {
      totalSamples: allSamples.length,
      trainingSamples: trainSamples.length,
      heldOutTestSamples: testSamples.length,
      classDistribution: classDist,
      integratedSources: [
        'CPIC Level A Guidelines (CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD)',
        'PharmGKB Clinical Annotations & Dosing Guidelines',
        'ClinVar Pathogenicity & Review Status (Stars 0-4)',
        'dbSNP Reference rsIDs and Functional Consequence',
        'gnomAD Population Allele Frequencies (AF_global, AFR, AMR, EAS, NFE, SAS)',
        'Kaggle ClinVar Conflicting Dataset (Molecular Priors: CADD phred, SIFT, PolyPhen-2, LoF)',
      ],
      featuresUsed: featureNames,
    },
    beforeMetrics,
    afterMetrics,
    improvement: {
      accuracyDelta:
        Math.round((afterMetrics.accuracy - beforeMetrics.accuracy) * 1000) / 1000,
      f1Delta:
        Math.round((afterMetrics.macroF1 - beforeMetrics.macroF1) * 1000) / 1000,
      precisionDelta:
        Math.round(
          (afterMetrics.macroPrecision - beforeMetrics.macroPrecision) * 1000
        ) / 1000,
      recallDelta:
        Math.round(
          (afterMetrics.macroRecall - beforeMetrics.macroRecall) * 1000
        ) / 1000,
    },
  };

  return {
    model,
    featureMeans,
    featureStds,
    featureNames,
    report,
  };
}

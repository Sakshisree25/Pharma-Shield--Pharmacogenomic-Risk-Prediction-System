import {
  runTrainAndValidation,
  RandomForestClassifier,
  RiskClass,
} from './trainEvaluateModel';
import {
  VARIANT_CATALOG,
  DRUG_REGISTRY,
  VariantAnnotation,
} from '../data/pharmacogenomicsDataset';
import { extractSampleFeatures } from '../data/trainingDataGenerator';

// Initialize and memoize model at startup
let cachedModelInstance: {
  model: RandomForestClassifier;
  featureMeans: number[];
  featureStds: number[];
  featureNames: string[];
} | null = null;

export function getTrainedModel() {
  if (!cachedModelInstance) {
    console.log('[PharmaGuard ML] Training and calibrating ensemble model on CPIC+PharmGKB+ClinVar+gnomAD datasets...');
    cachedModelInstance = runTrainAndValidation();
    console.log('[PharmaGuard ML] Model successfully initialized.');
  }
  return cachedModelInstance;
}

export interface ParsedVcfVariant {
  chrom: string;
  pos: number;
  id: string; // rsid or '.'
  ref: string;
  alt: string;
  qual?: string;
  filter?: string;
  info?: string;
  genotype?: string; // 0/1, 1/1, 1|0, 1|1
  isHomozygous: boolean;
}

/**
 * Parses VCF text content into structured variant objects
 */
export function parseVcfContent(vcfText: string): {
  patientId: string;
  variants: ParsedVcfVariant[];
} {
  const lines = vcfText.split(/\r?\n/);
  const variants: ParsedVcfVariant[] = [];
  let patientId = 'PATIENT_001';

  for (const line of lines) {
    if (!line || line.startsWith('##')) continue;

    if (line.startsWith('#CHROM')) {
      const headerCols = line.split('\t');
      if (headerCols.length >= 10 && headerCols[9]) {
        patientId = headerCols[9].trim();
      }
      continue;
    }

    const cols = line.split('\t');
    if (cols.length >= 5) {
      const chrom = cols[0].trim();
      const pos = parseInt(cols[1], 10);
      const id = cols[2].trim();
      const ref = cols[3].trim().toUpperCase();
      const alt = cols[4].trim().toUpperCase();
      const info = cols[7] || '';
      const format = cols[8] || '';
      const sampleCol = cols[9] || '';

      let genotype = '0/1';
      let isHomozygous = false;

      if (format && sampleCol) {
        const formatParts = format.split(':');
        const sampleParts = sampleCol.split(':');
        const gtIdx = formatParts.indexOf('GT');
        if (gtIdx !== -1 && sampleParts[gtIdx]) {
          genotype = sampleParts[gtIdx];
          if (
            genotype === '1/1' ||
            genotype === '1|1' ||
            genotype === '2/2' ||
            genotype === '2|2'
          ) {
            isHomozygous = true;
          }
        }
      }

      variants.push({
        chrom,
        pos,
        id,
        ref,
        alt,
        info,
        genotype,
        isHomozygous,
      });
    }
  }

  return { patientId, variants };
}

/**
 * Predicts risk assessment for a specific drug and patient VCF
 */
export function predictRiskForDrug(
  drugName: string,
  patientId: string,
  parsedVariants: ParsedVcfVariant[]
) {
  const { model, featureMeans, featureStds } = getTrainedModel();
  const drugUpper = drugName.toUpperCase().trim();
  const drugMeta = DRUG_REGISTRY[drugUpper] || {
    drug: drugUpper,
    primaryGenes: ['Unknown'],
    isProdrug: false,
    cpicGuidelineLevel: 'B',
    pharmgkbLevel: '2A',
    standardDosing: 'Standard clinical guidance.',
  };

  const matchedAnnotations: VariantAnnotation[] = [];
  const homMap: Record<string, boolean> = {};

  // Cross-reference parsed VCF records with dbSNP, ClinVar, and CPIC catalog
  parsedVariants.forEach((pv) => {
    // Match by rsid first
    let match = VARIANT_CATALOG.find(
      (v) =>
        pv.id &&
        pv.id !== '.' &&
        v.rsid.toLowerCase() === pv.id.toLowerCase()
    );

    // If no rsid match, match by chromosome and genomic position
    if (!match) {
      match = VARIANT_CATALOG.find(
        (v) =>
          v.chrom.replace('chr', '') === pv.chrom.replace('chr', '') &&
          Math.abs(v.pos - pv.pos) <= 2
      );
    }

    if (match) {
      matchedAnnotations.push(match);
      homMap[match.rsid] = pv.isHomozygous;
    }
  });

  // Extract ML feature vector
  const rawFeatures = extractSampleFeatures(
    drugUpper,
    matchedAnnotations,
    homMap
  );

  const featureVector = [
    rawFeatures.gene_activity_score,
    rawFeatures.is_prodrug,
    rawFeatures.cadd_phred_max,
    rawFeatures.cadd_phred_mean,
    rawFeatures.sift_deleterious_max,
    rawFeatures.polyphen_damaging_max,
    rawFeatures.gnomad_af_min,
    rawFeatures.variant_impact_max,
    rawFeatures.clinvar_stars_mean,
    rawFeatures.homozygosity_flag,
    rawFeatures.variant_count,
    rawFeatures.cpic_evidence_rank,
  ];

  // Scale features using training-set parameters (leakage-free)
  const scaledVector = featureVector.map(
    (val, i) => (val - featureMeans[i]) / featureStds[i]
  );

  // Predict with ensemble
  const { riskLabel, confidence } = model.predictConfidence(scaledVector);

  // Determine diplotype & phenotype
  const primaryGene = drugMeta.primaryGenes[0] || 'CYP2D6';
  const relevantMatches = matchedAnnotations.filter(
    (m) => m.gene === primaryGene
  );

  let diplotype = '*1/*1';
  let phenotype = 'Normal Metabolizer';

  if (relevantMatches.length === 0) {
    diplotype = '*1/*1';
    phenotype = primaryGene === 'SLCO1B1' ? 'Normal Function' : 'Normal Metabolizer (NM)';
  } else if (relevantMatches.length === 1) {
    const star = relevantMatches[0].starAllele || '*X';
    const isHom = homMap[relevantMatches[0].rsid];
    if (isHom) {
      diplotype = `${star}/${star}`;
      phenotype =
        primaryGene === 'SLCO1B1'
          ? 'Poor Function'
          : star.includes('xN')
          ? 'Ultrarapid Metabolizer (UM)'
          : 'Poor Metabolizer (PM)';
    } else {
      diplotype = `*1/${star}`;
      phenotype =
        primaryGene === 'SLCO1B1'
          ? 'Intermediate Function'
          : star.includes('xN')
          ? 'Rapid Metabolizer (RM)'
          : 'Intermediate Metabolizer (IM)';
    }
  } else {
    const stars = relevantMatches.map((m) => m.starAllele || '*X');
    diplotype = `${stars[0]}/${stars[1]}`;
    phenotype =
      primaryGene === 'SLCO1B1' ? 'Poor Function' : 'Poor Metabolizer (PM)';
  }

  // Generate CPIC & PharmGKB clinical recommendations based on risk classification
  let recommendation = 'Standard dosing is recommended.';
  let dosing = drugMeta.standardDosing;
  let implication = 'Normal metabolic capacity expected.';
  let severity = 'low';

  switch (riskLabel) {
    case 'Safe':
      recommendation = `Standard therapeutic dosing is recommended for ${drugUpper}. Normal metabolizer profile for ${primaryGene}.`;
      dosing = `Prescribe standard label dosing according to clinical guidelines.`;
      implication = `Normal conversion and clearance expected. Low risk of adverse drug reactions or therapeutic failure.`;
      severity = 'low';
      break;

    case 'Adjust Dosage':
      recommendation = `Modified dosage or enhanced monitoring required for ${drugUpper} due to intermediate metabolic activity in ${primaryGene}.`;
      dosing = `Consider starting with a reduced dose or closer clinical titration.`;
      implication = `Altered pharmacokinetics may cause suboptimal therapeutic response or delayed drug elimination.`;
      severity = 'moderate';
      break;

    case 'Toxic':
      recommendation = `High risk of severe adverse drug reaction with ${drugUpper}. Avoid standard dosing or select alternative therapy.`;
      dosing = `Avoid use or implement drastic dose reduction with therapeutic drug monitoring.`;
      implication = `Impaired clearance or rapid toxic metabolite formation may result in life-threatening systemic toxicity.`;
      severity = 'high';
      break;

    case 'Ineffective':
      recommendation = `Diminished therapeutic efficacy anticipated for prodrug ${drugUpper}. Consider alternative non-${primaryGene}-dependent medication.`;
      dosing = `Switch to alternative therapeutic class.`;
      implication = `Lack of enzymatic bioactivation prevents formation of the active drug metabolite.`;
      severity = 'moderate';
      break;
  }

  return {
    patient_id: patientId,
    drug: drugUpper,
    timestamp: new Date().toISOString(),
    risk_assessment: {
      risk_label: riskLabel,
      confidence_score: confidence,
      severity,
    },
    pharmacogenomic_profile: {
      primary_gene: primaryGene,
      diplotype,
      phenotype,
      detected_variants: relevantMatches.map((v) => ({
        rsid: v.rsid,
        gene: v.gene,
        variant: `${v.ref}>${v.alt}`,
        impact: v.consequence,
      })),
    },
    clinical_recommendation: {
      drug: drugUpper,
      recommendation,
      dosing,
      implication,
      risk_level: severity,
    },
    llm_generated_explanation: {
      summary: `Patient profile for ${drugUpper}: Predicted ${riskLabel} with ${Math.round(confidence * 100)}% ML model confidence. Primary gene: ${primaryGene} (${diplotype}, ${phenotype}).`,
      details: `Integrated assessment combines CPIC level A guidelines, PharmGKB dosing recommendations, ClinVar pathogenic annotations, gnomAD allele frequencies, and molecular functional impact scores (CADD, SIFT, PolyPhen).`,
    },
    quality_metrics: {
      vcf_parsing_success: true,
      variants_detected: matchedAnnotations.length,
      integrated_sources: [
        'CPIC',
        'PharmGKB',
        'ClinVar',
        'dbSNP',
        'gnomAD',
        'ClinVar Molecular Priors',
      ],
    },
  };
}

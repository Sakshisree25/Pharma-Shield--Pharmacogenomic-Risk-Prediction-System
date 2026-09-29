import {
  TrainingSample,
  VARIANT_CATALOG,
  DRUG_REGISTRY,
  VariantAnnotation,
} from './pharmacogenomicsDataset';

/**
 * Feature vector calculation from patient genetic profile & target drug
 */
export function extractSampleFeatures(
  drug: string,
  variants: VariantAnnotation[],
  homozygosityMap: Record<string, boolean> = {}
) {
  const drugMeta = DRUG_REGISTRY[drug.toUpperCase()] || {
    drug,
    primaryGenes: [],
    isProdrug: false,
    cpicGuidelineLevel: 'B',
    pharmgkbLevel: '2A',
    standardDosing: 'Standard dosing',
  };

  // Filter variants belonging to primary genes for this drug
  const relevantVariants = variants.filter(
    (v) =>
      drugMeta.primaryGenes.includes(v.gene) ||
      drugMeta.primaryGenes.length === 0
  );

  let geneActivityScore = 2.0; // Baseline wildtype *1/*1 is typically 2.0
  let caddMax = 0;
  let caddSum = 0;
  let siftDeleteriousMax = 0;
  let polyphenDamagingMax = 0;
  let gnomadMin = 1.0;
  let impactMax = 0; // 0=MODIFIER, 1=LOW, 2=MODERATE, 3=HIGH
  let clinvarStarsSum = 0;
  let isHomozygousAlt = 0;

  const impactScores: Record<string, number> = {
    HIGH: 3,
    MODERATE: 2,
    LOW: 1,
    MODIFIER: 0,
  };

  if (relevantVariants.length > 0) {
    let activityDeduction = 0;
    relevantVariants.forEach((v) => {
      const isHom = !!homozygosityMap[v.rsid];
      if (isHom) isHomozygousAlt = 1;

      // Activity deduction based on allelic activity
      // Standard allele activity: wildtype = 1.0 each (total 2.0)
      // Variant allele activity replaces one copy (or both if homozygous)
      const variantLoss = Math.max(0, 1.0 - v.activity_value);
      activityDeduction += isHom ? variantLoss * 2.0 : variantLoss;

      if (v.cadd_phred > caddMax) caddMax = v.cadd_phred;
      caddSum += v.cadd_phred;

      const siftDel = Math.max(0, 1.0 - v.sift_score);
      if (siftDel > siftDeleteriousMax) siftDeleteriousMax = siftDel;

      if (v.polyphen_score > polyphenDamagingMax)
        polyphenDamagingMax = v.polyphen_score;

      if (v.gnomad_af < gnomadMin && v.gnomad_af > 0) gnomadMin = v.gnomad_af;

      const score = impactScores[v.impact] || 0;
      if (score > impactMax) impactMax = score;

      clinvarStarsSum += v.clinvar_stars;
    });

    geneActivityScore = Math.max(0, 2.0 - activityDeduction);
  }

  const caddMean =
    relevantVariants.length > 0 ? caddSum / relevantVariants.length : 0;
  const clinvarStarsMean =
    relevantVariants.length > 0
      ? clinvarStarsSum / relevantVariants.length
      : 3.5;

  return {
    gene_activity_score: Math.min(3.0, geneActivityScore),
    is_prodrug: drugMeta.isProdrug ? 1 : 0,
    cadd_phred_max: caddMax,
    cadd_phred_mean: caddMean,
    sift_deleterious_max: siftDeleteriousMax,
    polyphen_damaging_max: polyphenDamagingMax,
    gnomad_af_min: gnomadMin === 1.0 && relevantVariants.length === 0 ? 0.5 : gnomadMin,
    variant_impact_max: impactMax,
    clinvar_stars_mean: clinvarStarsMean,
    homozygosity_flag: isHomozygousAlt,
    variant_count: relevantVariants.length,
    cpic_evidence_rank: drugMeta.cpicGuidelineLevel === 'A' ? 4 : 2,
  };
}

/**
 * Builds a comprehensive clinical training and validation cohort across CPIC level A guidelines
 */
export function generateTrainingCohort(): TrainingSample[] {
  const cohort: TrainingSample[] = [];

  const drugs = [
    'CODEINE',
    'WARFARIN',
    'CLOPIDOGREL',
    'SIMVASTATIN',
    'AZATHIOPRINE',
    'FLUOROURACIL',
  ];

  const variantByRsid = (rsid: string) => {
    const found = VARIANT_CATALOG.find((v) => v.rsid === rsid);
    if (!found) throw new Error(`Unknown rsid: ${rsid}`);
    return found;
  };

  // Helper to add clinical scenarios
  const addScenario = (
    drug: string,
    gene: string,
    diplotype: string,
    phenotype: 'UM' | 'NM' | 'IM' | 'PM' | 'Decreased' | 'Poor',
    variants: VariantAnnotation[],
    homMap: Record<string, boolean>,
    risk: 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective',
    recommendation: string,
    dosing: string,
    implication: string,
    repeats = 12
  ) => {
    for (let r = 0; r < repeats; r++) {
      // Add slight biological variance to non-discrete features
      const features = extractSampleFeatures(drug, variants, homMap);
      const jitteredFeatures = {
        ...features,
        cadd_phred_max: Math.max(0, features.cadd_phred_max + (Math.random() * 2 - 1)),
        cadd_phred_mean: Math.max(0, features.cadd_phred_mean + (Math.random() * 1.5 - 0.75)),
        gnomad_af_min: Math.max(0.0001, Math.min(0.99, features.gnomad_af_min * (1 + (Math.random() * 0.1 - 0.05)))),
      };

      cohort.push({
        id: `${drug}_${diplotype}_${r}`,
        drug,
        gene,
        diplotype,
        phenotype,
        variants,
        features: jitteredFeatures,
        true_risk_label: risk,
        clinical_recommendation: {
          recommendation,
          dosing,
          implication,
        },
      });
    }
  };

  // ==================== CODEINE (CYP2D6) ====================
  // Normal Metabolizer -> Safe
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*1/*1',
    'NM',
    [],
    {},
    'Safe',
    'Standard dosing is recommended. Normal metabolizer for CYP2D6.',
    'Use age-appropriate label-recommended codeine dosage.',
    'Normal conversion of codeine to active morphine metabolite. Expected analgesic response.',
    25
  );

  // Intermediate Metabolizer (*1/*4, *1/*10, *1/*41) -> Adjust Dosage
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*1/*4',
    'IM',
    [variantByRsid('rs3892097')],
    { rs3892097: false },
    'Adjust Dosage',
    'Reduced morphine formation; assess analgesic effect. Consider non-codeine opioid or non-opioid alternative.',
    'Start with standard dose but monitor pain relief closely; consider alternative analgesic if inadequate response.',
    'Reduced conversion to morphine may lead to suboptimal analgesia.',
    22
  );
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*1/*10',
    'IM',
    [variantByRsid('rs1065852')],
    { rs1065852: false },
    'Adjust Dosage',
    'Decreased clearance and activation. Monitor efficacy closely.',
    'Standard or modified dosing with alternative analgesics available.',
    'Reduced enzymatic activation.',
    18
  );

  // Poor Metabolizer (*4/*4, *3/*4) -> Ineffective
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*4/*4',
    'PM',
    [variantByRsid('rs3892097')],
    { rs3892097: true },
    'Ineffective',
    'Avoid codeine due to lack of efficacy. Alternative analgesics not dependent on CYP2D6 (e.g. morphine, hydromorphone) recommended.',
    'Avoid codeine completely. Select non-CYP2D6 analgesic.',
    'Greatly reduced morphine formation leading to lack of pain relief.',
    24
  );
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*3/*4',
    'PM',
    [variantByRsid('rs3892097'), variantByRsid('rs35742686')],
    { rs3892097: false, rs35742686: false },
    'Ineffective',
    'Avoid codeine due to complete lack of active metabolite bioactivation.',
    'Select alternative opioid unaffected by CYP2D6.',
    'Complete absence of active morphine generation.',
    20
  );

  // Ultrarapid Metabolizer (*1xN) -> Toxic
  addScenario(
    'CODEINE',
    'CYP2D6',
    '*1/*1xN',
    'UM',
    [variantByRsid('rs5030867')],
    { rs5030867: false },
    'Toxic',
    'Avoid codeine due to risk of life-threatening respiratory depression from rapid morphine accumulation.',
    'Contraindicated. Use non-CYP2D6 regulated analgesic.',
    'Substantially increased morphine formation resulting in toxic plasma concentrations.',
    22
  );

  // ==================== WARFARIN (CYP2C9 & VKORC1) ====================
  // Wildtype -> Safe
  addScenario(
    'WARFARIN',
    'CYP2C9',
    '*1/*1',
    'NM',
    [],
    {},
    'Safe',
    'Standard initial warfarin dosing (e.g. 5 mg/day).',
    'Standard dosing algorithm with baseline INR tracking.',
    'Normal S-warfarin clearance and normal VKORC1 sensitivity.',
    25
  );

  // Heterozygous (*1/*2, *1/*3, VKORC1 GA) -> Adjust Dosage
  addScenario(
    'WARFARIN',
    'CYP2C9',
    '*1/*2',
    'IM',
    [variantByRsid('rs1799853')],
    { rs1799853: false },
    'Adjust Dosage',
    'Reduce expected initial warfarin dose by 15-20%. Monitor INR frequently.',
    'Initiate with 15-20% dose reduction.',
    'Moderately decreased clearance of active S-warfarin.',
    22
  );
  addScenario(
    'WARFARIN',
    'CYP2C9',
    '*1/*3',
    'IM',
    [variantByRsid('rs1057910')],
    { rs1057910: false },
    'Adjust Dosage',
    'Reduce expected initial dose by 25-50%. Monitor INR closely until stable.',
    'Initiate with 30-40% dose reduction.',
    'Significant decrease in S-warfarin clearance, prolonging half-life.',
    24
  );
  addScenario(
    'WARFARIN',
    'CYP2C9',
    '*1/*3 + VKORC1',
    'IM',
    [variantByRsid('rs1057910'), variantByRsid('rs9923231')],
    { rs1057910: false, rs9923231: false },
    'Adjust Dosage',
    'Substantial dose reduction of 40-60% recommended based on pharmacogenetic dosing algorithms.',
    'Start with reduced dose (e.g. 2-3 mg/day) and frequent INR testing.',
    'Dual impairment: reduced clearance and increased drug sensitivity.',
    24
  );

  // Homozygous Poor Metabolizer (*3/*3) -> Toxic
  addScenario(
    'WARFARIN',
    'CYP2C9',
    '*3/*3',
    'PM',
    [variantByRsid('rs1057910')],
    { rs1057910: true },
    'Toxic',
    'Severe risk of supratherapeutic INR and life-threatening bleeding. Major dose reduction (70-80%) or non-vitamin K anticoagulant recommended.',
    'Reduce dose by 70-80% or select DOAC if not contraindicated.',
    'Profoundly reduced S-warfarin metabolism; standard doses induce severe coagulopathy.',
    22
  );

  // ==================== CLOPIDOGREL (CYP2C19) ====================
  // Normal Metabolizer -> Safe
  addScenario(
    'CLOPIDOGREL',
    'CYP2C19',
    '*1/*1',
    'NM',
    [],
    {},
    'Safe',
    'Standard maintenance dose of 75 mg daily.',
    '75 mg daily standard antiplatelet therapy.',
    'Normal conversion to active thiol metabolite with adequate platelet inhibition.',
    25
  );

  // Intermediate Metabolizer (*1/*2, *1/*3) -> Adjust Dosage
  addScenario(
    'CLOPIDOGREL',
    'CYP2C19',
    '*1/*2',
    'IM',
    [variantByRsid('rs4244285')],
    { rs4244285: false },
    'Adjust Dosage',
    'Consider alternative antiplatelet therapy (e.g. prasugrel or ticagrelor) if not contraindicated.',
    'Alternative P2Y12 inhibitor or double-dose clopidogrel with platelet monitoring.',
    'Reduced formation of active metabolite; intermediate risk of stent thrombosis.',
    24
  );

  // Poor Metabolizer (*2/*2, *2/*3) -> Ineffective
  addScenario(
    'CLOPIDOGREL',
    'CYP2C19',
    '*2/*2',
    'PM',
    [variantByRsid('rs4244285')],
    { rs4244285: true },
    'Ineffective',
    'Avoid clopidogrel. Significant residual platelet reactivity. Prescribe prasugrel or ticagrelor.',
    'Switch to alternative P2Y12 inhibitor (prasugrel, ticagrelor). Clopidogrel is ineffective.',
    'Substantially reduced active drug exposure; high risk of ischemic events and stent thrombosis.',
    26
  );
  addScenario(
    'CLOPIDOGREL',
    'CYP2C19',
    '*2/*3',
    'PM',
    [variantByRsid('rs4244285'), variantByRsid('rs4986893')],
    { rs4244285: false, rs4986893: false },
    'Ineffective',
    'Avoid clopidogrel due to failure of therapeutic bioactivation. Prescribe prasugrel or ticagrelor.',
    'Switch to prasugrel (60 mg loading, 10 mg daily) or ticagrelor.',
    'Lack of functional CYP2C19 prevents bioactivation.',
    22
  );

  // ==================== SIMVASTATIN (SLCO1B1) ====================
  // Normal Function (*1a/*1a) -> Safe
  addScenario(
    'SIMVASTATIN',
    'SLCO1B1',
    '*1a/*1a',
    'NM',
    [],
    {},
    'Safe',
    'Standard simvastatin dosing (20-40 mg daily).',
    'Prescribe standard dose according to lipid guidelines.',
    'Normal hepatic OATP1B1 uptake and low myopathy risk.',
    25
  );

  // Intermediate Function (*1/*5) -> Adjust Dosage
  addScenario(
    'SIMVASTATIN',
    'SLCO1B1',
    '*1/*5',
    'IM',
    [variantByRsid('rs4149056')],
    { rs4149056: false },
    'Adjust Dosage',
    'Moderate risk of myopathy. Limit simvastatin dose to 20 mg daily or consider alternative statin (e.g. pravastatin, rosuvastatin).',
    'Max 20 mg daily simvastatin or switch to rosuvastatin.',
    'Reduced hepatic uptake increases circulating simvastatin acid concentrations.',
    24
  );

  // Poor Function (*5/*5) -> Toxic
  addScenario(
    'SIMVASTATIN',
    'SLCO1B1',
    '*5/*5',
    'Poor',
    [variantByRsid('rs4149056')],
    { rs4149056: true },
    'Toxic',
    'High risk of simvastatin-induced myopathy and rhabdomyolysis. Prescribe alternative statin (pravastatin, rosuvastatin) or non-statin lipid-lowering agent.',
    'Avoid simvastatin. Select alternative statin with lower OATP1B1 dependence.',
    'Severely impaired hepatic uptake causes 3- to 5-fold higher systemic exposure and skeletal muscle toxicity.',
    25
  );

  // ==================== AZATHIOPRINE (TPMT) ====================
  // Normal Metabolizer -> Safe
  addScenario(
    'AZATHIOPRINE',
    'TPMT',
    '*1/*1',
    'NM',
    [],
    {},
    'Safe',
    'Standard starting dose (2-3 mg/kg/day).',
    'Standard dosing with regular routine monitoring.',
    'Normal thiopurine S-methyltransferase activity ensures safe clearance.',
    25
  );

  // Intermediate Metabolizer (*1/*3A, *1/*3C) -> Adjust Dosage
  addScenario(
    'AZATHIOPRINE',
    'TPMT',
    '*1/*3A',
    'IM',
    [variantByRsid('rs1800462')],
    { rs1800462: false },
    'Adjust Dosage',
    'Reduce initial dose to 30-70% of target dose. Monitor complete blood count (CBC) frequently for myelosuppression.',
    'Start with 30-70% reduced initial dose; titrate based on tolerability.',
    'Intermediate TPMT activity shifts metabolic flux toward cytotoxic thioguanine nucleotides.',
    24
  );

  // Poor Metabolizer (*3A/*3A) -> Toxic
  addScenario(
    'AZATHIOPRINE',
    'TPMT',
    '*3A/*3A',
    'PM',
    [variantByRsid('rs1800462'), variantByRsid('rs1142345')],
    { rs1800462: true, rs1142345: false },
    'Toxic',
    'Drastic risk of fatal myelosuppression. Avoid azathioprine or reduce dose by 90% and monitor CBC weekly.',
    'Avoid azathioprine or reduce daily dose to 10% with weekly CBC monitoring.',
    'Complete absence of functional TPMT leads to lethal accumulation of 6-thioguanine nucleotides in bone marrow.',
    24
  );

  // ==================== FLUOROURACIL (DPYD) ====================
  // Normal Metabolizer -> Safe
  addScenario(
    'FLUOROURACIL',
    'DPYD',
    '*1/*1',
    'NM',
    [],
    {},
    'Safe',
    'Standard weight/BSA-based oncology protocol dosing.',
    'Standard systemic dosing.',
    'Normal dihydropyrimidine dehydrogenase catabolic activity.',
    25
  );

  // Intermediate Metabolizer (*1/*2A, *1/c.2846A>T) -> Adjust Dosage
  addScenario(
    'FLUOROURACIL',
    'DPYD',
    '*1/c.2846A>T',
    'IM',
    [variantByRsid('rs67376798')],
    { rs67376798: false },
    'Adjust Dosage',
    'Reduce starting dose by 25-50%. Perform therapeutic drug monitoring if available.',
    'Administer 50-75% of standard starting dose.',
    'Partially reduced DPD activity increases drug half-life and toxicity risk.',
    22
  );
  addScenario(
    'FLUOROURACIL',
    'DPYD',
    '*1/*2A',
    'IM',
    [variantByRsid('rs3918290')],
    { rs3918290: false },
    'Adjust Dosage',
    'Reduce starting dose by 50%. Titrate subsequent doses based on toxicity.',
    'Reduce initial dose by at least 50%.',
    'Substantially decreased clearance of 5-FU.',
    24
  );

  // Poor Metabolizer (*2A/*2A, *2A/*13) -> Toxic
  addScenario(
    'FLUOROURACIL',
    'DPYD',
    '*2A/*2A',
    'PM',
    [variantByRsid('rs3918290')],
    { rs3918290: true },
    'Toxic',
    'Increased risk of severe or fatal toxicity (myelosuppression, gastrointestinal toxicity, neurotoxicity). Avoid use of 5-FU.',
    'Contraindicated. Avoid 5-FU and capecitabine completely.',
    'Complete DPD enzyme deficiency prevents metabolic breakdown of fluorouracil, causing lethal toxicity.',
    25
  );

  return cohort;
}

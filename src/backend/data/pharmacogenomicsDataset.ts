/**
 * Integrated Pharmacogenomic Dataset
 * Sources: CPIC Guidelines, PharmGKB Clinical Annotations, ClinVar, dbSNP, gnomAD, and Kaggle ClinVar molecular features.
 * Note: ClinVar conflicting attributes are used strictly as molecular pathogenicity priors,
 * NOT as direct drug-risk labels, preventing target leakage.
 */

export interface VariantAnnotation {
  rsid: string;
  gene: string;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  starAllele?: string;
  consequence: string; // missense, splice_site, frameshift, stop_gained, synonymous, intron
  impact: 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';
  cadd_phred: number; // 0 to 45
  sift_score: number; // 0 (deleterious) to 1 (tolerated)
  polyphen_score: number; // 0 (benign) to 1 (damaging)
  gnomad_af: number; // 0.0 to 1.0
  clinvar_significance: string; // Pathogenic, Likely Pathogenic, Benign, Drug Response, Conflicting
  clinvar_stars: number; // 0 to 4
  activity_value: number; // Allelic activity score: 0.0 (no func), 0.25-0.5 (decreased), 1.0 (normal), 2.0 (increased)
}

export interface DrugMetadata {
  drug: string;
  primaryGenes: string[];
  isProdrug: boolean; // true = needs bioactivation (loss of enzyme -> Ineffective); false = needs clearance (loss of enzyme -> Toxic)
  cpicGuidelineLevel: 'A' | 'B';
  pharmgkbLevel: '1A' | '1B' | '2A';
  standardDosing: string;
}

export interface TrainingSample {
  id: string;
  drug: string;
  gene: string;
  diplotype: string;
  phenotype: 'UM' | 'NM' | 'IM' | 'PM' | 'Decreased' | 'Poor';
  variants: VariantAnnotation[];
  // Engineered feature vector
  features: {
    gene_activity_score: number; // 0.0 to 3.0
    is_prodrug: number; // 1 or 0
    cadd_phred_max: number; // 0 to 45
    cadd_phred_mean: number;
    sift_deleterious_max: number; // 1 - sift (0 to 1)
    polyphen_damaging_max: number; // 0 to 1
    gnomad_af_min: number; // rarest variant AF
    variant_impact_max: number; // 0 (MODIFIER) to 3 (HIGH)
    clinvar_stars_mean: number;
    homozygosity_flag: number; // 1 if homozygous alternate, 0 if heterozygous
    variant_count: number;
    cpic_evidence_rank: number; // 1 to 4
  };
  // Ground truth label based on clinical CPIC/PharmGKB guidelines:
  true_risk_label: 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective';
  clinical_recommendation: {
    recommendation: string;
    dosing: string;
    implication: string;
  };
}

export const DRUG_REGISTRY: Record<string, DrugMetadata> = {
  CODEINE: {
    drug: 'CODEINE',
    primaryGenes: ['CYP2D6'],
    isProdrug: true, // Needs CYP2D6 bioactivation to morphine. Poor metabolizer -> Ineffective; Ultra-rapid -> Toxic (rapid morphine toxicity)
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: 'Standard age/weight appropriate dose.',
  },
  WARFARIN: {
    drug: 'WARFARIN',
    primaryGenes: ['CYP2C9', 'VKORC1'],
    isProdrug: false, // CYP2C9 clears S-warfarin. Reduced clearance -> bleeding toxicity -> Adjust Dosage
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: 'Standard initiation dose with INR monitoring.',
  },
  CLOPIDOGREL: {
    drug: 'CLOPIDOGREL',
    primaryGenes: ['CYP2C19'],
    isProdrug: true, // CYP2C19 bioactivates to active thiol. Reduced activity -> Ineffective antiplatelet -> Stent thrombosis risk
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: '75 mg daily standard maintenance dose.',
  },
  SIMVASTATIN: {
    drug: 'SIMVASTATIN',
    primaryGenes: ['SLCO1B1'],
    isProdrug: false, // SLCO1B1 mediates hepatic uptake. Impaired transport -> High systemic blood levels -> Muscle toxicity (rhabdomyolysis)
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: '20-40 mg daily standard dose.',
  },
  AZATHIOPRINE: {
    drug: 'AZATHIOPRINE',
    primaryGenes: ['TPMT', 'NUDT15'],
    isProdrug: false, // TPMT catabolizes thiopurines. Deficiency -> excessive cytotoxic thioguanine -> fatal myelosuppression -> Adjust Dosage / Toxic
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: '2-3 mg/kg daily target dose.',
  },
  FLUOROURACIL: {
    drug: 'FLUOROURACIL',
    primaryGenes: ['DPYD'],
    isProdrug: false, // DPYD catabolizes >80% of 5-FU. Inactivating variants -> severe/fatal 5-FU toxicity -> Toxic / Avoid or drastic dose reduction
    cpicGuidelineLevel: 'A',
    pharmgkbLevel: '1A',
    standardDosing: 'Standard weight/BSA-based oncology protocol dosing.',
  },
};

// Curated high-fidelity variant catalog across target pharmacogenes
export const VARIANT_CATALOG: VariantAnnotation[] = [
  // CYP2D6 variants
  {
    rsid: 'rs3892097',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42523943,
    ref: 'C',
    alt: 'T',
    starAllele: '*4',
    consequence: 'splice_acceptor_variant',
    impact: 'HIGH',
    cadd_phred: 28.4,
    sift_score: 0.0,
    polyphen_score: 0.98,
    gnomad_af: 0.185,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0, // Inactivating non-functional
  },
  {
    rsid: 'rs35742686',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42524947,
    ref: 'DEL',
    alt: 'A',
    starAllele: '*3',
    consequence: 'frameshift_variant',
    impact: 'HIGH',
    cadd_phred: 32.1,
    sift_score: 0.0,
    polyphen_score: 1.0,
    gnomad_af: 0.015,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },
  {
    rsid: 'rs5030655',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42526694,
    ref: 'T',
    alt: 'DEL',
    starAllele: '*6',
    consequence: 'frameshift_variant',
    impact: 'HIGH',
    cadd_phred: 26.9,
    sift_score: 0.0,
    polyphen_score: 0.99,
    gnomad_af: 0.009,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 3,
    activity_value: 0.0,
  },
  {
    rsid: 'rs1065852',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42526694,
    ref: 'C',
    alt: 'T',
    starAllele: '*10',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 17.6,
    sift_score: 0.03,
    polyphen_score: 0.74,
    gnomad_af: 0.38,
    clinvar_significance: 'Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.25, // Decreased
  },
  {
    rsid: 'rs28371725',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42525690,
    ref: 'C',
    alt: 'T',
    starAllele: '*41',
    consequence: 'intron_variant',
    impact: 'MODIFIER',
    cadd_phred: 14.2,
    sift_score: 0.12,
    polyphen_score: 0.45,
    gnomad_af: 0.088,
    clinvar_significance: 'Drug_Response',
    clinvar_stars: 3,
    activity_value: 0.5, // Decreased
  },
  {
    rsid: 'rs16947',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42523805,
    ref: 'C',
    alt: 'T',
    starAllele: '*2',
    consequence: 'missense_variant',
    impact: 'LOW',
    cadd_phred: 9.8,
    sift_score: 0.48,
    polyphen_score: 0.12,
    gnomad_af: 0.32,
    clinvar_significance: 'Benign/Drug_Response',
    clinvar_stars: 4,
    activity_value: 1.0, // Normal
  },
  {
    rsid: 'rs5030867',
    gene: 'CYP2D6',
    chrom: 'chr22',
    pos: 42524244,
    ref: 'DUP',
    alt: '2xN',
    starAllele: '*1xN',
    consequence: 'gene_duplication',
    impact: 'HIGH',
    cadd_phred: 22.0,
    sift_score: 0.8,
    polyphen_score: 0.05,
    gnomad_af: 0.02,
    clinvar_significance: 'Drug_Response',
    clinvar_stars: 4,
    activity_value: 2.0, // Increased (Ultrarapid)
  },

  // CYP2C19 variants
  {
    rsid: 'rs4244285',
    gene: 'CYP2C19',
    chrom: 'chr10',
    pos: 96702047,
    ref: 'G',
    alt: 'A',
    starAllele: '*2',
    consequence: 'splice_donor_variant',
    impact: 'HIGH',
    cadd_phred: 27.2,
    sift_score: 0.0,
    polyphen_score: 0.99,
    gnomad_af: 0.145,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },
  {
    rsid: 'rs4986893',
    gene: 'CYP2C19',
    chrom: 'chr10',
    pos: 96708641,
    ref: 'G',
    alt: 'A',
    starAllele: '*3',
    consequence: 'stop_gained',
    impact: 'HIGH',
    cadd_phred: 35.0,
    sift_score: 0.0,
    polyphen_score: 1.0,
    gnomad_af: 0.038,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },
  {
    rsid: 'rs12248560',
    gene: 'CYP2C19',
    chrom: 'chr10',
    pos: 96521603,
    ref: 'C',
    alt: 'T',
    starAllele: '*17',
    consequence: 'promoter_variant',
    impact: 'MODIFIER',
    cadd_phred: 12.3,
    sift_score: 0.55,
    polyphen_score: 0.08,
    gnomad_af: 0.21,
    clinvar_significance: 'Drug_Response',
    clinvar_stars: 4,
    activity_value: 1.5, // Increased expression
  },

  // CYP2C9 variants
  {
    rsid: 'rs1799853',
    gene: 'CYP2C9',
    chrom: 'chr10',
    pos: 96702047,
    ref: 'C',
    alt: 'T',
    starAllele: '*2',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 21.6,
    sift_score: 0.02,
    polyphen_score: 0.88,
    gnomad_af: 0.125,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.5, // Decreased
  },
  {
    rsid: 'rs1057910',
    gene: 'CYP2C9',
    chrom: 'chr10',
    pos: 96741053,
    ref: 'A',
    alt: 'C',
    starAllele: '*3',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 25.8,
    sift_score: 0.0,
    polyphen_score: 0.99,
    gnomad_af: 0.072,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0, // Very low activity (~5%)
  },
  {
    rsid: 'rs9923231',
    gene: 'VKORC1',
    chrom: 'chr16',
    pos: 31096368,
    ref: 'C',
    alt: 'T',
    starAllele: '-1639G>A',
    consequence: 'promoter_variant',
    impact: 'MODIFIER',
    cadd_phred: 16.5,
    sift_score: 0.2,
    polyphen_score: 0.2,
    gnomad_af: 0.39,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.5, // Low VKORC1 expression -> higher warfarin sensitivity
  },

  // SLCO1B1 variants
  {
    rsid: 'rs4149056',
    gene: 'SLCO1B1',
    chrom: 'chr12',
    pos: 21331549,
    ref: 'T',
    alt: 'C',
    starAllele: '*5',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 24.3,
    sift_score: 0.01,
    polyphen_score: 0.95,
    gnomad_af: 0.152,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0, // Impaired hepatic uptake
  },
  {
    rsid: 'rs2306283',
    gene: 'SLCO1B1',
    chrom: 'chr12',
    pos: 21327429,
    ref: 'A',
    alt: 'G',
    starAllele: '*1b',
    consequence: 'missense_variant',
    impact: 'LOW',
    cadd_phred: 8.5,
    sift_score: 0.65,
    polyphen_score: 0.08,
    gnomad_af: 0.37,
    clinvar_significance: 'Benign/Drug_Response',
    clinvar_stars: 3,
    activity_value: 1.0,
  },

  // TPMT variants
  {
    rsid: 'rs1800462',
    gene: 'TPMT',
    chrom: 'chr6',
    pos: 18139228,
    ref: 'G',
    alt: 'C',
    starAllele: '*3A_1',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 23.9,
    sift_score: 0.0,
    polyphen_score: 0.96,
    gnomad_af: 0.048,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },
  {
    rsid: 'rs1142345',
    gene: 'TPMT',
    chrom: 'chr6',
    pos: 18130918,
    ref: 'A',
    alt: 'G',
    starAllele: '*3C',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 22.4,
    sift_score: 0.01,
    polyphen_score: 0.91,
    gnomad_af: 0.035,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },

  // DPYD variants
  {
    rsid: 'rs3918290',
    gene: 'DPYD',
    chrom: 'chr1',
    pos: 97915614,
    ref: 'G',
    alt: 'A',
    starAllele: '*2A',
    consequence: 'splice_donor_variant',
    impact: 'HIGH',
    cadd_phred: 34.0,
    sift_score: 0.0,
    polyphen_score: 1.0,
    gnomad_af: 0.008,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0, // Non-functional
  },
  {
    rsid: 'rs67376798',
    gene: 'DPYD',
    chrom: 'chr1',
    pos: 97740414,
    ref: 'A',
    alt: 'T',
    starAllele: 'c.2846A>T',
    consequence: 'missense_variant',
    impact: 'MODERATE',
    cadd_phred: 26.5,
    sift_score: 0.0,
    polyphen_score: 0.97,
    gnomad_af: 0.003,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.5, // Decreased
  },
  {
    rsid: 'rs55886062',
    gene: 'DPYD',
    chrom: 'chr1',
    pos: 97543290,
    ref: 'T',
    alt: 'G',
    starAllele: '*13',
    consequence: 'missense_variant',
    impact: 'HIGH',
    cadd_phred: 31.0,
    sift_score: 0.0,
    polyphen_score: 0.99,
    gnomad_af: 0.001,
    clinvar_significance: 'Pathogenic/Drug_Response',
    clinvar_stars: 4,
    activity_value: 0.0,
  },
];

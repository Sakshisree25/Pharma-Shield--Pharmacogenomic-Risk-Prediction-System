export interface RiskAssessment {
  risk_label: string;
  confidence_score: number;
  severity?: string;
}

export interface PharmacogenomicProfile {
  primary_gene: string;
  diplotype?: string;
  phenotype?: string;
  detected_variants?: Array<{
    rsid?: string;
    gene?: string;
    variant?: string;
    impact?: string;
  }>;
}

export interface ClinicalRecommendation {
  drug?: string;
  recommendation?: string;
  dosing?: string;
  implication?: string;
  risk_level?: string;
}

export interface LLMGeneratedExplanation {
  summary?: string;
  details?: string;
}

export interface PharmacogenomicResult {
  patient_id?: string;
  drug: string;
  timestamp?: string;
  risk_assessment: RiskAssessment;
  pharmacogenomic_profile: PharmacogenomicProfile;
  clinical_recommendation: ClinicalRecommendation;
  llm_generated_explanation?: LLMGeneratedExplanation;
  quality_metrics?: {
    vcf_parsing_success?: boolean;
    variants_detected?: number;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    name: string;
    size: number;
    sizeInMB: string;
    type: string;
    lastModified: string;
  };
}

export interface DrugValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  drugs: string[];
  drugCount: number;
}

export interface AlertNotification {
  title?: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

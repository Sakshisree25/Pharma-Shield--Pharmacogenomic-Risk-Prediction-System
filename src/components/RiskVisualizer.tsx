import React, { useState } from 'react';
import {
  DnaIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
} from './Icons';
import { PharmacogenomicResult } from '../types';

interface RiskGaugeProps {
  riskLevel?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ riskLevel = 'Unknown' }) => {
  const normalized = riskLevel?.toLowerCase() || 'unknown';
  let color = 'var(--color-unknown)';
  let width = '0%';

  if (normalized.includes('safe')) {
    color = 'var(--color-safe)';
    width = '33%';
  } else if (normalized.includes('adjust')) {
    color = 'var(--color-adjust)';
    width = '66%';
  } else if (
    normalized.includes('toxic') ||
    normalized.includes('ineffective') ||
    normalized.includes('high')
  ) {
    color = 'var(--color-toxic)';
    width = '100%';
  }

  return (
    <div className="risk-gauge-container">
      <div className="risk-gauge-track">
        <div
          className="risk-gauge-fill"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <div className="risk-label" style={{ color }}>
        {riskLevel}
      </div>
    </div>
  );
};

interface ConfidenceScoreProps {
  score?: number;
}

export const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ score = 0 }) => {
  const percentage = Math.round(score * 100);
  let color = '#ef4444';

  if (percentage > 70) {
    color = '#10b981';
  } else if (percentage > 40) {
    color = '#f59e0b';
  }

  return (
    <div className="confidence-container">
      <div className="confidence-header">
        <span className="confidence-label">AI Confidence</span>
        <span className="confidence-value">{percentage}%</span>
      </div>
      <div className="confidence-track">
        <div
          className="confidence-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

interface DrugCardProps {
  data: PharmacogenomicResult;
}

export const DrugCard: React.FC<DrugCardProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const drugName = data.drug || 'Unknown Drug';
  const riskLabel = data.risk_assessment?.risk_label || 'Unknown';
  const confidence = data.risk_assessment?.confidence_score || 0;
  const primaryGene = data.pharmacogenomic_profile?.primary_gene || 'N/A';
  const phenotype = data.pharmacogenomic_profile?.phenotype || 'N/A';
  const recommendation =
    data.clinical_recommendation?.recommendation ||
    data.clinical_recommendation?.dosing ||
    'No specific recommendation provided.';
  const diplotype = data.pharmacogenomic_profile?.diplotype || 'N/A';
  const implication =
    data.clinical_recommendation?.implication ||
    data.llm_generated_explanation?.details ||
    'N/A';

  const riskBadgeClass = `risk-badge badge-${riskLabel.toLowerCase().split(' ')[0]}`;

  return (
    <div className="drug-card">
      <div className="card-header">
        <div className="drug-name">{drugName}</div>
        <div className={riskBadgeClass}>{riskLabel}</div>
      </div>

      <div className="card-grid">
        <div className="data-column">
          <RiskGauge riskLevel={riskLabel} />
          <ConfidenceScore score={confidence} />
        </div>
        <div className="data-column">
          <div>
            <div className="detail-label">Primary Gene</div>
            <div className="key-genes-list">
              <span className="gene-tag">
                <DnaIcon /> {primaryGene}
              </span>
            </div>
          </div>
          <div>
            <div className="detail-label">Phenotype</div>
            <div className="detail-value" style={{ textAlign: 'left' }}>
              {phenotype}
            </div>
          </div>
        </div>
      </div>

      <button
        className="details-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span>
          {isExpanded ? 'Hide Clinical Details' : 'View Clinical Details'}
        </span>
        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>

      {isExpanded && (
        <div className="details-content">
          <div className="detail-row">
            <span className="detail-label">Recommendation</span>
            <span className="detail-value">{recommendation}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Diplotype</span>
            <span className="detail-value">{diplotype}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Implication</span>
            <span className="detail-value">{implication}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export function downloadJsonFile(
  data: unknown,
  fileName = 'pharmacogenomics_result.json'
) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(data: unknown): Promise<boolean> {
  try {
    const text = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

interface ResultsVisualizerProps {
  results: PharmacogenomicResult[];
}

export const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({ results }) => {
  const [copied, setCopied] = useState(false);

  if (!results || results.length === 0) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(results);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadJsonFile(results, 'pharmaguard_results.json');
  };

  return (
    <div className="risk-visualizer animate-fade-in">
      <div className="visualizer-header">
        <div className="visualizer-title">Pharmacogenomic Analysis</div>
        <div className="visualizer-actions">
          <button className="action-btn" onClick={handleCopy} type="button">
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="action-btn" onClick={handleDownload} type="button">
            <DownloadIcon /> Download JSON
          </button>
        </div>
      </div>
      {results.map((result, idx) => (
        <DrugCard key={`${result.drug}-${idx}`} data={result} />
      ))}
    </div>
  );
};

interface ExportActionsProps {
  data: unknown;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ data }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(data);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadJsonFile(data, 'pharmacogenomix_results.json');
  };

  return (
    <div className="download-section">
      <button
        className="btn btn-secondary btn-action"
        onClick={handleDownload}
        type="button"
      >
        <DownloadIcon /> Download JSON
      </button>
      <button
        className="btn btn-secondary btn-action"
        onClick={handleCopy}
        type="button"
      >
        {isCopied ? <CheckIcon /> : <CopyIcon />}{' '}
        {isCopied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
      </button>
    </div>
  );
};

interface ResultsPanelProps {
  results: PharmacogenomicResult[] | PharmacogenomicResult | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ results }) => {
  if (!results) return null;
  const list = Array.isArray(results) ? results : [results];

  return (
    <div className="results-panel animate-slide-up">
      <ResultsVisualizer results={list} />
      <div className="results-divider" />
      <ExportActions data={results} />
    </div>
  );
};

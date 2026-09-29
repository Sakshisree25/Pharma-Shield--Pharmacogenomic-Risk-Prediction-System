import React, { useEffect, useMemo, useState } from 'react';
import { VcfUploadCard } from '../components/VcfUploadCard';
import { DrugInputCard } from '../components/DrugInputCard';
import { AnalyzeButton } from '../components/AnalyzeButton';
import { ResultsPanel } from '../components/RiskVisualizer';
import { ErrorMessage } from '../components/ErrorMessage';
import { DnaIcon } from '../components/Icons';
import {
  fetchSupportedDrugs,
  analyzePharmacogenomics,
  DEFAULT_SUPPORTED_DRUGS,
} from '../services/api';
import { AlertNotification, PharmacogenomicResult } from '../types';

export const PlatformPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [drugs, setDrugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<AlertNotification | null>(null);
  const [results, setResults] = useState<PharmacogenomicResult[] | null>(null);
  const [supportedDrugs, setSupportedDrugs] = useState<string[]>(DEFAULT_SUPPORTED_DRUGS);

  useEffect(() => {
    (async () => {
      try {
        const drugList = await fetchSupportedDrugs();
        if (Array.isArray(drugList) && drugList.length > 0) {
          setSupportedDrugs(drugList);
        }
      } catch (err) {
        console.error('Failed to fetch drugs:', err);
      }
    })();
  }, []);

  const canAnalyze = useMemo(() => !!file && drugs.length > 0, [file, drugs]);

  const handleAnalyze = async () => {
    if (!file) {
      setNotification({
        title: 'VCF File Required',
        message: 'Please upload a VCF file to proceed.',
        type: 'error',
      });
      return;
    }

    if (drugs.length === 0) {
      setNotification({
        title: 'Drug Selection Required',
        message: 'Please select at least one drug for analysis.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);
    setResults(null);

    try {
      const outputList: PharmacogenomicResult[] = [];
      for (const drug of drugs) {
        const res = await analyzePharmacogenomics(file, drug);
        outputList.push(res);
      }
      setResults(outputList);
    } catch (err: any) {
      setNotification({
        title: 'Analysis Failed',
        message: err.message || 'Failed to analyze pharmacogenomics.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-container">
        <div className="platform-header">
          <h1 className="platform-title">Pharmacogenomic Risk Analysis</h1>
          <p className="platform-subtitle">
            Upload genomic data and select medications for personalized risk assessment.
          </p>
        </div>

        <div className="platform-grid">
          <section className="input-section">
            <VcfUploadCard onFileSelect={setFile} disabled={isLoading} />
            <DrugInputCard
              onDrugSelect={setDrugs}
              disabled={isLoading}
              supportedDrugs={supportedDrugs}
            />

            <div className="action-area">
              <AnalyzeButton
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                isLoading={isLoading}
              />

              {notification && (
                <div style={{ marginTop: '1rem' }}>
                  <ErrorMessage
                    title={notification.title}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="results-section">
            {isLoading ? (
              <div className="loading-container">
                <div
                  className="animate-spin"
                  style={{
                    fontSize: '3rem',
                    color: 'var(--color-primary-500)',
                  }}
                >
                  <DnaIcon />
                </div>
                <p className="loading-text">Analyzing genetic variants...</p>
              </div>
            ) : results ? (
              <ResultsPanel results={results} />
            ) : (
              <div className="results-placeholder">
                <DnaIcon className="placeholder-icon" />
                <h3>Ready to Analyze</h3>
                <p>
                  Upload a VCF file and select medications to view your personalized
                  pharmacogenomic risk assessment.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

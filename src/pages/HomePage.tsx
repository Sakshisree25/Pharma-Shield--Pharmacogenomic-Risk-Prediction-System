import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DnaIcon,
  PillIcon,
  ActivityIcon,
  BrainIcon,
  UploadIcon,
  CpuIcon,
  CheckCircleIcon,
  ShareIcon,
} from '../components/Icons';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const goTo = (path: string) => () => {
    navigate(path);
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            PHARMA GUARD
            <span className="hero-subtitle-text">
              Revolutionizing Drug Safety Through Genetic Intelligence
            </span>
          </h1>
          <p className="hero-subtitle">
            AI-powered pharmacogenomic risk prediction platform that analyzes
            genomic data to deliver personalized medication safety insights.
          </p>
          <button
            className="hero-get-started-btn"
            onClick={goTo('/vcf-upload')}
            type="button"
          >
            Ready to Get Started?
          </button>
        </div>
      </section>

      <section className="problem-section">
        <div className="container">
          <h2>Why Pharmacogenomics Matters</h2>
          <div className="problem-content">
            <p>
              Adverse drug reactions kill over 100,000 Americans annually. Many of
              these deaths are preventable through pharmacogenomic testing —
              analyzing how genetic variants affect drug metabolism.
            </p>
            <p>
              Our platform identifies pharmacogenomic variants across 6 critical
              genes:{' '}
              <strong>CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD</strong>.
            </p>
            <p className="highlight">
              We analyze genetic data and drug inputs to predict personalized
              risks and provide clinically actionable recommendations.
            </p>
          </div>
        </div>
      </section>

      <section className="platform-snapshot">
        <div className="container">
          <h2>What we provide</h2>
          <div className="snapshot-grid">
            <div
              className="snapshot-card"
              onClick={goTo('/vcf-upload')}
              role="button"
              tabIndex={0}
            >
              <DnaIcon className="card-icon" />
              <h3>Genomic Variant Analysis</h3>
              <p>Advanced VCF parsing and classification</p>
            </div>
            <div
              className="snapshot-card"
              onClick={goTo('/drug-input')}
              role="button"
              tabIndex={0}
            >
              <PillIcon className="card-icon" />
              <h3>Drug-Gene Interaction Mapping</h3>
              <p>Pharmacogenomic association alignment</p>
            </div>
            <div
              className="snapshot-card"
              onClick={goTo('/results-display')}
              role="button"
              tabIndex={0}
            >
              <ActivityIcon className="card-icon" />
              <h3>Risk Classification Engine</h3>
              <p>Intelligent risk level assessment</p>
            </div>
            <div
              className="snapshot-card"
              onClick={goTo('/ai-insights')}
              role="button"
              tabIndex={0}
            >
              <BrainIcon className="card-icon" />
              <h3>AI Clinical Insights</h3>
              <p>Explainable and interpretable outputs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <UploadIcon className="step-icon" />
              <h3>Upload Genomic Data</h3>
              <p>Securely upload your VCF file</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <PillIcon className="step-icon" />
              <h3>Select Medication</h3>
              <p>Choose one or multiple drugs</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <CpuIcon className="step-icon" />
              <h3>AI Variant Interpretation</h3>
              <p>Analyze genetic-drug interactions</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <CheckCircleIcon className="step-icon" />
              <h3>Receive Risk Report</h3>
              <p>Personalized pharmacogenomic insights</p>
            </div>
          </div>
        </div>
      </section>

      <section className="web-interface-features">
        <div className="container">
          <h2>Features</h2>
          <div className="features-grid">
            <div
              className="feature-card"
              onClick={goTo('/vcf-upload')}
              role="button"
              tabIndex={0}
            >
              <div className="feature-icon">
                <UploadIcon />
              </div>
              <h3>File Upload Interface</h3>
              <ul>
                <li>Drag-and-drop or file picker</li>
                <li>VCF validation before processing</li>
                <li>File size limit indicator</li>
              </ul>
            </div>
            <div
              className="feature-card"
              onClick={goTo('/drug-input')}
              role="button"
              tabIndex={0}
            >
              <div className="feature-icon">
                <PillIcon />
              </div>
              <h3>Drug Input Field</h3>
              <ul>
                <li>Text input or dropdown</li>
                <li>Multiple drug support</li>
                <li>Input validation</li>
              </ul>
            </div>
            <div
              className="feature-card"
              onClick={goTo('/results-display')}
              role="button"
              tabIndex={0}
            >
              <div className="feature-icon">
                <ActivityIcon />
              </div>
              <h3>Results Display</h3>
              <ul>
                <li>Clear risk visualization</li>
                <li>Color-coded labels</li>
                <li>Expandable sections</li>
              </ul>
            </div>
            <div
              className="feature-card"
              onClick={goTo('/export-share')}
              role="button"
              tabIndex={0}
            >
              <div className="feature-icon">
                <ShareIcon />
              </div>
              <h3>Export & Share</h3>
              <ul>
                <li>Download JSON output</li>
                <li>Copy-to-clipboard</li>
                <li>Secure data handling</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

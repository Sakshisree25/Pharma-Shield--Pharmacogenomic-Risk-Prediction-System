import React, { useState } from 'react';
import { SearchIcon, PlusIcon, CloseIcon, WarningIcon } from './Icons';
import { DEFAULT_SUPPORTED_DRUGS } from '../services/api';

interface DrugInputCardProps {
  onDrugSelect: (drugs: string[]) => void;
  disabled?: boolean;
  supportedDrugs?: string[];
}

export function validateDrugSelection(
  drugsInput: string | string[],
  supportedList: string[] = []
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  let drugs: string[] = [];

  if (typeof drugsInput === 'string') {
    drugs = drugsInput
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter((d) => d.length > 0);
  } else if (Array.isArray(drugsInput)) {
    drugs = drugsInput
      .map((d) => d.toString().trim().toUpperCase())
      .filter((d) => d.length > 0);
  }

  if (drugs.length === 0) {
    errors.push('Please enter at least one drug name');
  }

  if (drugs.length > 10) {
    warnings.push('Analyzing more than 10 drugs may take longer');
  }

  if (supportedList.length > 0) {
    const unknown = drugs.filter((d) => !supportedList.includes(d));
    if (unknown.length > 0) {
      warnings.push(`Unknown drugs: ${unknown.join(', ')}. Results may be limited.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    drugs,
    drugCount: drugs.length,
  };
}

export const DrugInputCard: React.FC<DrugInputCardProps> = ({
  onDrugSelect,
  disabled = false,
  supportedDrugs = DEFAULT_SUPPORTED_DRUGS,
}) => {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const addCurrentInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setErrors(['Please enter a drug name']);
      return;
    }

    const items = trimmed
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const toAdd: string[] = [];
    const duplicates: string[] = [];

    items.forEach((item) => {
      if (selectedDrugs.includes(item) || toAdd.includes(item)) {
        duplicates.push(item);
      } else {
        toAdd.push(item);
      }
    });

    if (toAdd.length === 0 && duplicates.length > 0) {
      setErrors([
        duplicates.length === 1
          ? 'Drug already added'
          : 'All specified drugs are already added',
      ]);
      setInputValue('');
      return;
    }

    const updated = [...selectedDrugs, ...toAdd];
    const validation = validateDrugSelection(updated, supportedDrugs);

    if (validation.isValid || validation.errors.length === 0) {
      setSelectedDrugs(updated);
      setInputValue('');
      setErrors(
        duplicates.length > 0
          ? [`Added new drugs, but skipped duplicates: ${duplicates.join(', ')}`]
          : []
      );
      setWarnings(validation.warnings);
      onDrugSelect(updated);
    } else {
      setErrors(validation.errors);
    }
  };

  const removeDrug = (indexToRemove: number) => {
    const updated = selectedDrugs.filter((_, idx) => idx !== indexToRemove);
    setSelectedDrugs(updated);
    if (updated.length > 0) {
      const validation = validateDrugSelection(updated, supportedDrugs);
      setWarnings(validation.warnings);
    } else {
      setWarnings([]);
      setErrors([]);
    }
    onDrugSelect(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCurrentInput();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.trim()) {
      setShowDropdown(true);
      setErrors([]);
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (drug: string) => {
    const upper = drug.toUpperCase();
    if (selectedDrugs.includes(upper)) {
      setInputValue('');
      setShowDropdown(false);
    } else {
      const updated = [...selectedDrugs, upper];
      setSelectedDrugs(updated);
      onDrugSelect(updated);
      setInputValue('');
      setShowDropdown(false);
      setErrors([]);
    }
  };

  const suggestions = (() => {
    const upper = inputValue.trim().toUpperCase();
    if (upper) {
      return supportedDrugs.filter(
        (d) => d.includes(upper) && !selectedDrugs.includes(d)
      );
    }
    return supportedDrugs.filter((d) => !selectedDrugs.includes(d));
  })();

  return (
    <div className="drug-input-card">
      <div className="card-header">
        <h3>Enter Drug(s)</h3>
      </div>
      <div className="input-area">
        <div className="search-wrapper">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            className={`drug-search-input ${errors.length > 0 ? 'error' : ''}`}
            placeholder="Search or type drug names (comma separated)..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            disabled={disabled}
            autoComplete="off"
          />
          {inputValue && (
            <button
              className="btn-add-inline"
              onClick={addCurrentInput}
              disabled={disabled}
              type="button"
              title="Add drug"
            >
              <PlusIcon />
            </button>
          )}

          {showDropdown && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="validation-area">
        {errors.length > 0 && (
          <p className="validation-msg error">❌ {errors[0]}</p>
        )}
        {warnings.length > 0 && (
          <p className="validation-msg warning">
            <WarningIcon /> {warnings[0]}
          </p>
        )}
      </div>

      <div className="selected-drugs-area">
        {selectedDrugs.length === 0 ? (
          <p className="empty-drugs-text">No drugs selected</p>
        ) : (
          <div className="chips-container">
            {selectedDrugs.map((drug, idx) => (
              <div key={idx} className="drug-chip">
                <span>{drug}</span>
                <button
                  className="chip-remove"
                  onClick={() => removeDrug(idx)}
                  type="button"
                  title="Remove drug"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

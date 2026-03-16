import { useState, useEffect } from 'react';
import { useFormulaStore } from '../stores/useFormulaStore';
import './FormulaJsonModal.css';

interface FormulaJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function FormulaJsonModal({ isOpen, onClose }: FormulaJsonModalProps) {
  const formulas = useFormulaStore((s) => s.formulas);
  const setAllFormulas = useFormulaStore((s) => s.setAllFormulas);
  const [editedJson, setEditedJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditedJson(JSON.stringify(formulas, null, 2));
      setError(null);
    }
  }, [isOpen, formulas]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedJson);
      setAllFormulas(parsed);
      setError(null);
      onClose();
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="formula-json-backdrop" onClick={onClose}>
      <div className="formula-json-content" onClick={(e) => e.stopPropagation()}>
        <div className="formula-json-header">
          <h3>Formula JSON</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {error && <div className="formula-json-error">{error}</div>}
        <textarea
          className="formula-json-editor"
          value={editedJson}
          onChange={(e) => setEditedJson(e.target.value)}
          spellCheck={false}
        />
        <div className="formula-json-actions">
          <button className="save-btn" onClick={handleSave}>Save</button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default FormulaJsonModal;

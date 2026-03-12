import { useState, useEffect } from 'react';
import './BuildJsonModal.css';
import Build from '../models/Build';

interface BuildJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBuild: Build;
  onSave: (jsonString: string) => void;
}

function BuildJsonModal({ isOpen, onClose, currentBuild, onSave }: BuildJsonModalProps) {
  const [editedJson, setEditedJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Convert Build to LlmBuild format using the toLlm method
      const llmBuild = currentBuild.toLlm();
      setEditedJson(JSON.stringify(llmBuild, null, 2));
      setError(null);
    }
  }, [isOpen, currentBuild]);

  const handleSave = () => {
    try {
      // Validate JSON
      JSON.parse(editedJson);
      setError(null);
      onSave(editedJson);
      onClose();
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="build-json-modal-backdrop" onClick={onClose}>
      <div className="build-json-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="build-json-modal-header">
          <h3>Edit Build JSON</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {error && <div className="build-json-error">{error}</div>}
        
        <textarea
          className="build-json-editor"
          value={editedJson}
          onChange={(e) => setEditedJson(e.target.value)}
          spellCheck={false}
        />
        
        <div className="build-json-modal-actions">
          <button className="save-btn" onClick={handleSave}>Save</button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default BuildJsonModal;

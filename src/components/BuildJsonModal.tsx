import { useState, useEffect } from 'react';
import './BuildJsonModal.css';
import Build from '../models/Build';
import LlmBuild from '../models/LlmBuild';

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
      // Convert Build to LlmBuild format
      const llmBuild = convertToLlmBuild(currentBuild);
      setEditedJson(JSON.stringify(llmBuild, null, 2));
      setError(null);
    }
  }, [isOpen, currentBuild]);

  const convertToLlmBuild = (build: Build): any => {
    const getModSlotValue = (modSlots: Record<string, Record<string, number>> | undefined, slotName: string): string | null => {
      if (!modSlots || !modSlots[slotName]) return null;
      const slotData = modSlots[slotName];
      const keys = Object.keys(slotData);
      return keys.length > 0 ? keys[0] : null;
    };

    return {
      specialization: build.specialization || '',
      primaryWeapon: build.primaryWeapon ? {
        name: build.primaryWeapon.weapon.name,
        weaponAttribute: '',
        muzzleIfOption: getModSlotValue(build.primaryWeapon.configuredModSlots, 'muzzle'),
        underbarrelIfOption: getModSlotValue(build.primaryWeapon.configuredModSlots, 'underbarrel'),
        magazineIfOption: getModSlotValue(build.primaryWeapon.configuredModSlots, 'magazine'),
        opticsIfOption: getModSlotValue(build.primaryWeapon.configuredModSlots, 'optics'),
      } : null,
      secondaryWeapon: build.secondaryWeapon ? {
        name: build.secondaryWeapon.weapon.name,
        weaponAttribute: '',
        muzzleIfOption: getModSlotValue(build.secondaryWeapon.configuredModSlots, 'muzzle'),
        underbarrelIfOption: getModSlotValue(build.secondaryWeapon.configuredModSlots, 'underbarrel'),
        magazineIfOption: getModSlotValue(build.secondaryWeapon.configuredModSlots, 'magazine'),
        opticsIfOption: getModSlotValue(build.secondaryWeapon.configuredModSlots, 'optics'),
      } : null,
      pistol: build.pistol ? {
        name: build.pistol.weapon.name,
        weaponAttribute: '',
        muzzleIfOption: getModSlotValue(build.pistol.configuredModSlots, 'muzzle'),
        underbarrelIfOption: getModSlotValue(build.pistol.configuredModSlots, 'underbarrel'),
        magazineIfOption: getModSlotValue(build.pistol.configuredModSlots, 'magazine'),
        opticsIfOption: getModSlotValue(build.pistol.configuredModSlots, 'optics'),
      } : null,
      mask: build.mask ? {
        name: build.mask.name,
        core: build.mask.core.type,
        minor1: build.mask.minor1?.key || null,
        minor2: build.mask.minor2?.key || null,
        minor3: build.mask.minor3?.key || null,
      } : null,
      chest: build.chest ? {
        name: build.chest.name,
        core: build.chest.core.type,
        minor1: build.chest.minor1?.key || null,
        minor2: build.chest.minor2?.key || null,
        minor3: build.chest.minor3?.key || null,
      } : null,
      holster: build.holster ? {
        name: build.holster.name,
        core: build.holster.core.type,
        minor1: build.holster.minor1?.key || null,
        minor2: build.holster.minor2?.key || null,
        minor3: build.holster.minor3?.key || null,
      } : null,
      backpack: build.backpack ? {
        name: build.backpack.name,
        core: build.backpack.core.type,
        minor1: build.backpack.minor1?.key || null,
        minor2: build.backpack.minor2?.key || null,
        minor3: build.backpack.minor3?.key || null,
      } : null,
      gloves: build.gloves ? {
        name: build.gloves.name,
        core: build.gloves.core.type,
        minor1: build.gloves.minor1?.key || null,
        minor2: build.gloves.minor2?.key || null,
        minor3: build.gloves.minor3?.key || null,
      } : null,
      kneepads: build.kneepads ? {
        name: build.kneepads.name,
        core: build.kneepads.core.type,
        minor1: build.kneepads.minor1?.key || null,
        minor2: build.kneepads.minor2?.key || null,
        minor3: build.kneepads.minor3?.key || null,
      } : null,
      skill1: build.skill1 || '',
      skill2: build.skill2 || '',
      watch: build.watch || null,
    };
  };

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

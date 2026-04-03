import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type Talent from '../models/Talent';
import './TalentPickerModal.css';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

interface TalentRow {
  talent: Talent;
  displayName: string;
  isPerfect: boolean;
  stacks: string;
  bonus: string;
}

interface TalentPickerModalProps {
  isOpen: boolean;
  talents: Talent[];
  onSelect: (talent: Talent, isPerfect: boolean) => void;
  onClose: () => void;
  title?: string;
}

function formatBonus(bonus: Record<string, number> | undefined): string {
  if (!bonus || Object.keys(bonus).length === 0) return '—';
  return Object.entries(bonus)
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}%`)
    .join(', ');
}

function formatStacks(stacks: any[] | undefined): string {
  if (!stacks || stacks.length === 0) return '—';
  return stacks
    .map((s) => {
      const parts: string[] = [];
      if (s.size) parts.push(`×${s.size}`);
      if (s.bonus && Object.keys(s.bonus).length > 0) {
        parts.push(formatBonus(s.bonus));
      }
      if (s.duration) parts.push(`${s.duration}s`);
      return parts.join(' ');
    })
    .join('; ');
}

function TalentPickerModal({
  isOpen,
  talents,
  onSelect,
  onClose,
  title = 'Select Talent',
}: TalentPickerModalProps) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useBackButtonClose(isOpen, stableOnClose);

  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const rows = useMemo<TalentRow[]>(() => {
    const result: TalentRow[] = [];
    for (const t of talents) {
      result.push({
        talent: t,
        displayName: t.name,
        isPerfect: false,
        stacks: formatStacks(t.stacks),
        bonus: formatBonus(t.bonus),
      });
      if (t.perfectName) {
        result.push({
          talent: t,
          displayName: t.perfectName,
          isPerfect: true,
          stacks: formatStacks(t.perfectStacks?.length ? t.perfectStacks : t.stacks),
          bonus: formatBonus(
            t.perfectBonus && Object.keys(t.perfectBonus).length > 0 ? t.perfectBonus : t.bonus,
          ),
        });
      }
    }
    return result;
  }, [talents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const lower = search.toLowerCase();
    return rows.filter((r) => r.displayName.toLowerCase().includes(lower));
  }, [rows, search]);

  if (!isOpen) return null;

  return (
    <div className="talent-picker-backdrop" onClick={onClose}>
      <div className="talent-picker-content" onClick={(e) => e.stopPropagation()}>
        <div className="talent-picker-header">
          <h4>{title}</h4>
          <button className="talent-picker-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="talent-picker-search">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter talents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter talents"
          />
        </div>

        <div className="talent-picker-list">
          <div className="talent-picker-row-header">
            <span className="talent-picker-col-header">Talent</span>
            <span className="talent-picker-col-header">Stacks</span>
            <span className="talent-picker-col-header">Bonus</span>
          </div>
          {filtered.length === 0 && (
            <div className="talent-picker-empty">No talents match your filter</div>
          )}
          {filtered.map((row, idx) => (
            <div
              key={`${row.displayName}-${idx}`}
              className={`talent-picker-row${row.isPerfect ? ' perfect' : ''}`}
              onClick={() => onSelect(row.talent, row.isPerfect)}
              title={row.isPerfect ? row.talent.perfectDescription : row.talent.description}
            >
              <span className="talent-picker-col name">{row.displayName}</span>
              <span className="talent-picker-col">{row.stacks}</span>
              <span className="talent-picker-col">{row.bonus}</span>
            </div>
          ))}
        </div>

        <div className="talent-picker-footer">
          <button className="divisiondb-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default TalentPickerModal;

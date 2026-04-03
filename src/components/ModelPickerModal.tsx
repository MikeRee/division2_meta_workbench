import React, { useState, useMemo, useCallback } from 'react';
import './ModelPickerModal.css';
import { useBackButtonClose } from '../hooks/useBackButtonClose';

interface OpenRouterModel {
  id: string;
  name: string;
  promptPrice: string;
  completionPrice: string;
}

interface ModelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: OpenRouterModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

type SortField = 'name' | 'promptPrice' | 'completionPrice' | 'estCost';
type SortDir = 'asc' | 'desc';

const RESPONSE_TOKENS = 2000;

function ModelPickerModal({
  isOpen,
  onClose,
  models,
  selectedModelId,
  onSelectModel,
}: ModelPickerModalProps) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useBackButtonClose(isOpen, stableOnClose);

  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [msgSize, setMsgSize] = useState(10000);

  const parsePrice = (val: string): number => {
    if (val === 'free') return 0;
    const cleaned = val.replace(/[^0-9.\-e]/gi, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const calcCost = (model: OpenRouterModel): number => {
    const prompt = parsePrice(model.promptPrice);
    const completion = parsePrice(model.completionPrice);
    return (msgSize / 1_000_000) * prompt + (RESPONSE_TOKENS / 1_000_000) * completion;
  };

  const formatCost = (cost: number): string => {
    if (cost === 0) return 'free';
    if (cost < 0.0001) return '$' + cost.toExponential(1);
    if (cost < 0.01) return '$' + cost.toFixed(4);
    return '$' + cost.toFixed(3);
  };

  const formatPrice = (val: string): string => {
    if (val === 'free') return 'free';
    const num = parsePrice(val);
    return '$' + num.toFixed(2);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const numericPrice = (val: string) => (val === 'free' ? 0 : parsePrice(val));

  const filtered = useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    let result = models.filter(
      (m) => m.name.toLowerCase().includes(lowerFilter) || m.id.toLowerCase().includes(lowerFilter),
    );

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'promptPrice':
          cmp = numericPrice(a.promptPrice) - numericPrice(b.promptPrice);
          break;
        case 'completionPrice':
          cmp = numericPrice(a.completionPrice) - numericPrice(b.completionPrice);
          break;
        case 'estCost':
          cmp = calcCost(a) - calcCost(b);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [models, filter, sortField, sortDir, msgSize]);

  if (!isOpen) return null;

  return (
    <div className="model-picker-backdrop" onClick={onClose}>
      <div className="model-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="model-picker-header">
          <h2>Select Model</h2>
          <div className="model-picker-controls">
            <input
              className="model-picker-filter"
              type="text"
              placeholder="Filter models..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
            <label className="model-picker-msg-size">
              Msg Size
              <input
                type="number"
                value={msgSize}
                onChange={(e) => setMsgSize(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                step={1000}
              />
              tokens
            </label>
          </div>
        </div>
        <div className="model-picker-table-wrap">
          <table className="model-picker-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Model{sortIndicator('name')}
                </th>
                <th className="sortable num" onClick={() => handleSort('promptPrice')}>
                  Prompt/1M{sortIndicator('promptPrice')}
                </th>
                <th className="sortable num" onClick={() => handleSort('completionPrice')}>
                  Completion/1M{sortIndicator('completionPrice')}
                </th>
                <th className="sortable num" onClick={() => handleSort('estCost')}>
                  Est. Cost{sortIndicator('estCost')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((model) => (
                <tr
                  key={model.id}
                  className={model.id === selectedModelId ? 'selected' : ''}
                  onClick={() => {
                    onSelectModel(model.id);
                    onClose();
                  }}
                >
                  <td className="model-name-cell">
                    <span className="model-display-name">{model.name}</span>
                    <span className="model-id">{model.id}</span>
                  </td>
                  <td className="num">{formatPrice(model.promptPrice)}</td>
                  <td className="num">{formatPrice(model.completionPrice)}</td>
                  <td className="num est-cost">{formatCost(calcCost(model))}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="no-results">
                    No models match your filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="model-picker-footer">
          <span className="model-picker-count">{filtered.length} models</span>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ModelPickerModal;

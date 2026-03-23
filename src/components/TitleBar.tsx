import React, { useState } from 'react';
import './TitleBar.css';
import { MdStorage } from 'react-icons/md';
import LoadModal from './LoadModal';
import DivisionDBModal from './DivisionDBModal';

interface TitleBarProps {
  onLoadData: (dataType: string, pageName: string, isCSV?: boolean) => Promise<void>;
}

function TitleBar({ onLoadData }: TitleBarProps) {
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isDBModalOpen, setIsDBModalOpen] = useState(false);

  return (
    <>
      <div className="title-bar">
        <h1 className="title">Division 2 Meta Workbench</h1>
        <div className="action-buttons">
          <button className="icon-button" onClick={() => setIsDBModalOpen(true)} title="DivisionDB">
            <MdStorage />
          </button>
          <button onClick={() => setIsLoadModalOpen(true)}>Load</button>
        </div>
      </div>
      <DivisionDBModal isOpen={isDBModalOpen} onClose={() => setIsDBModalOpen(false)} />
      <LoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoadData={onLoadData}
      />
    </>
  );
}

export default TitleBar;

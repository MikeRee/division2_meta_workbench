import React, { useState } from 'react';
import './TitleBar.css';
import LoadModal from './LoadModal';

interface TitleBarProps {
  onLoadData: (dataType: string, pageName: string, isCSV?: boolean) => Promise<void>;
}

function TitleBar({ onLoadData }: TitleBarProps) {
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  return (
    <>
      <div className="title-bar">
        <h1 className="title">Division 2 Meta Workbench</h1>
        <div className="action-buttons">
          <button onClick={() => setIsLoadModalOpen(true)}>Load</button>
        </div>
      </div>
      <LoadModal 
        isOpen={isLoadModalOpen} 
        onClose={() => setIsLoadModalOpen(false)}
        onLoadData={onLoadData}
      />
    </>
  );
}

export default TitleBar;

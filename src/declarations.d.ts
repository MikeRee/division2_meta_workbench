declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'react-mermaid2' {
  import React from 'react';
  interface MermaidProps {
    name?: string;
    chart: string;
    config?: Record<string, any>;
  }
  const Mermaid: React.FC<MermaidProps>;
  export default Mermaid;
}

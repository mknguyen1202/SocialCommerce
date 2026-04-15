import React, { useEffect } from 'react';
import { useUIStore } from '../../app/stores/uiStore';
import { CommunicationLayout } from './CommunicationLayout';

const CommunicationDomain: React.FC = () => {
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);

  useEffect(() => {
    setActiveDomain('communication');
  }, [setActiveDomain]);

  return <CommunicationLayout />;
};

export default CommunicationDomain;


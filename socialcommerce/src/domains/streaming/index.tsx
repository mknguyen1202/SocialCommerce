import React, { useEffect } from 'react';
import { useUIStore } from '../../app/stores/uiStore';
import { StreamingLayout } from './StreamingLayout';

const StreamingDomain: React.FC = () => {
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);

  useEffect(() => {
    setActiveDomain('streaming');
  }, [setActiveDomain]);

  return <StreamingLayout />;
};

export default StreamingDomain;

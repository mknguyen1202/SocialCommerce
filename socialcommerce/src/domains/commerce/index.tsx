import React, { useEffect } from 'react';
import { useUIStore } from '../../app/stores/uiStore';
import { CommerceLayout } from './CommerceLayout';

const CommerceDomain: React.FC = () => {
	const setActiveDomain = useUIStore((s) => s.setActiveDomain);

	useEffect(() => {
		setActiveDomain('commerce');
	}, [setActiveDomain]);

	return <CommerceLayout />;
};

export default CommerceDomain;

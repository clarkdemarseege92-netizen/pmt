// components/NearbyCouponsWrapper.tsx
'use client';

import { Component } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import NearbyCoupons with no SSR to avoid context issues
const NearbyCoupons = dynamic(() => import('./NearbyCouponsClient'), {
  ssr: false,
  loading: () => null,
});

interface State {
  hasError: boolean;
}

class NearbyCouponsErrorBoundary extends Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Only catch intl context errors, let others propagate
    if (error.message.includes('No intl context found') ||
        error.message.includes('useTranslations')) {
      console.warn('NearbyCoupons: Waiting for intl context...');
    } else {
      throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return <NearbyCoupons />;
  }
}

export default NearbyCouponsErrorBoundary;

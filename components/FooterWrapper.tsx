'use client';

import { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Footer with no SSR to avoid context issues
const Footer = dynamic(() => import('./FooterClient'), {
  ssr: false,
  loading: () => null,
});

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class FooterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
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
      console.warn('Footer: Waiting for intl context...');
    } else {
      throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return <Footer />;
  }
}

export default FooterErrorBoundary;

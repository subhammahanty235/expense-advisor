import React from 'react';
import { AdvancedAnalytics } from '@/components/analytics/AdvancedAnalytics';
import AuthWrapper from '@/components/AuthWrapper';

const Analytics: React.FC = () => {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <AdvancedAnalytics />
        </div>
      </div>
    </AuthWrapper>
  );
};

export default Analytics;
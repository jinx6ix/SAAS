import { Suspense } from 'react';
import BillingContent from './BillingContent';

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading billing...</p>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
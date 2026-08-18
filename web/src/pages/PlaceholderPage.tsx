import { Wrench } from 'lucide-react';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Wrench size={28} className="text-surface-400" />
      </div>
      <h1 className="text-lg font-bold text-surface-900">{title}</h1>
      <p className="text-sm text-surface-500 mt-1">This section is coming soon</p>
    </div>
  );
}

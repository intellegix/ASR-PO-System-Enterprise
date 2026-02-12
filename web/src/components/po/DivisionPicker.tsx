'use client';

interface Division {
  id: string;
  division_code: string;
  division_name: string;
  cost_center_prefix: string;
}

interface DivisionPickerProps {
  divisions: Division[];
  selectedId: string | null;
  userDivisionId?: string | null;
  onSelect: (division: Division) => void;
}

const DIVISION_ICONS: Record<string, string> = {
  'CAPEX': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'Roofing': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'Service Work': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

export default function DivisionPicker({ divisions, selectedId, userDivisionId, onSelect }: DivisionPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Pick Division</h2>
        <p className="text-sm text-slate-500">Which division is this purchase for?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {divisions.map((div) => {
          const isSelected = selectedId === div.id;
          const isUserDivision = div.id === userDivisionId;
          const iconPath = DIVISION_ICONS[div.division_name] || 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5';

          return (
            <button
              key={div.id}
              onClick={() => onSelect(div)}
              className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${
                isSelected
                  ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                  : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{div.division_name}</p>
                <p className="text-sm text-slate-500">{div.cost_center_prefix}</p>
              </div>
              {isUserDivision && (
                <span className="absolute top-2 right-2 text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  Your Division
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

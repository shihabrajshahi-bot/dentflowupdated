import React from 'react';
import { DentalChartEntry, ToothCondition, ToothSurface } from '../../types/dental';

interface ToothSvgProps {
  toothNumber: number;
  toothType: 'permanent' | 'primary';
  entries: DentalChartEntry[];
  isSelected: boolean;
  onSelect: (toothNumber: number) => void;
  onSurfaceClick?: (toothNumber: number, surface: ToothSurface) => void;
}

export const ToothSvg: React.FC<ToothSvgProps> = ({
  toothNumber,
  entries,
  isSelected,
  onSelect,
}) => {
  // Find primary or latest entry
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : undefined;
  const condition = latestEntry?.condition || 'Healthy';
  const procedureStatus = latestEntry?.procedureStatus || 'existing';

  const isAnterior = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43, 51, 52, 53, 61, 62, 63, 71, 72, 73, 81, 82, 83].includes(toothNumber);

  // Determine fill colors based on clinical condition
  const getConditionColor = (cond: ToothCondition): string => {
    switch (cond) {
      case 'Caries':
        return '#F87171'; // red
      case 'Filling':
        return '#38BDF8'; // blue
      case 'Crown':
        return '#FBBF24'; // amber/gold
      case 'Root Canal':
        return '#FB923C'; // orange
      case 'Implant':
        return '#A78BFA'; // purple
      case 'Extraction':
        return '#E11D48'; // deep crimson
      case 'Periodontal':
        return '#F472B6'; // pink
      case 'Missing':
        return '#CBD5E1'; // light slate
      case 'Other':
        return '#2DD4BF';
      case 'Healthy':
      default:
        return '#FFFFFF';
    }
  };

  const fillColor = getConditionColor(condition);
  const isMissing = condition === 'Missing';
  const isImplant = condition === 'Implant';
  const isRootCanal = condition === 'Root Canal';

  return (
    <div
      onClick={() => onSelect(toothNumber)}
      className={`group relative flex flex-col items-center p-1.5 rounded-lg cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? 'bg-teal-50 ring-2 ring-teal-600 shadow-sm'
          : 'hover:bg-slate-50 border border-slate-200/80 bg-white'
      }`}
      title={`Tooth #${toothNumber} (${isAnterior ? 'Anterior' : 'Posterior'})\nCondition: ${condition} (${procedureStatus})`}
    >
      {/* Tooth FDI Number Badge */}
      <span
        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          isSelected
            ? 'bg-teal-600 text-white'
            : latestEntry && condition !== 'Healthy'
            ? 'bg-slate-800 text-white font-mono'
            : 'text-slate-600 font-mono'
        }`}
      >
        {toothNumber}
      </span>

      {/* SVG Odontogram Surface Diagram */}
      <div className="relative w-11 h-14 my-1 flex items-center justify-center">
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Root Section */}
          <path
            d="M 30,55 C 30,20 40,5 50,5 C 60,5 70,20 70,55 Z"
            fill={isRootCanal ? '#FED7AA' : '#F1F5F9'}
            stroke={isRootCanal ? '#EA580C' : '#94A3B8'}
            strokeWidth="3"
            strokeDasharray={procedureStatus === 'planned' ? '4 2' : undefined}
          />
          {isRootCanal && (
            <line
              x1="50"
              y1="15"
              x2="50"
              y2="55"
              stroke="#C2410C"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {/* Crown & Anatomical Surfaces */}
          {/* Outer Crown outline */}
          <rect
            x="15"
            y="55"
            width="70"
            height="55"
            rx="12"
            fill={fillColor}
            stroke={isSelected ? '#0D9488' : '#64748B'}
            strokeWidth="3.5"
            strokeDasharray={procedureStatus === 'planned' ? '4 2' : undefined}
          />

          {/* 5-surface subdivisions for posterior or 3 for anterior */}
          {!isMissing && (
            <>
              {/* Buccal/Labial surface */}
              <polygon
                points="15,55 85,55 65,70 35,70"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              {/* Lingual/Palatal surface */}
              <polygon
                points="35,95 65,95 85,110 15,110"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              {/* Mesial surface */}
              <polygon
                points="15,55 35,70 35,95 15,110"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              {/* Distal surface */}
              <polygon
                points="85,55 65,70 65,95 85,110"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              {/* Center Occlusal / Incisal surface */}
              <rect
                x="35"
                y="70"
                width="30"
                height="25"
                fill={latestEntry?.surface === 'O' ? '#0284C7' : '#FFFFFF'}
                stroke="#64748B"
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Special Indicators */}
          {isMissing && (
            <g stroke="#EF4444" strokeWidth="6" strokeLinecap="round">
              <line x1="15" y1="20" x2="85" y2="105" />
              <line x1="85" y1="20" x2="15" y2="105" />
            </g>
          )}

          {isImplant && (
            <g stroke="#7C3AED" strokeWidth="3" fill="none">
              <line x1="50" y1="15" x2="50" y2="55" strokeWidth="5" />
              <line x1="40" y1="25" x2="60" y2="25" />
              <line x1="42" y1="35" x2="58" y2="35" />
              <line x1="44" y1="45" x2="56" y2="45" />
            </g>
          )}
        </svg>

        {/* Small condition status badge */}
        {latestEntry && condition !== 'Healthy' && (
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
              condition === 'Caries'
                ? 'bg-red-500'
                : condition === 'Filling'
                ? 'bg-blue-500'
                : condition === 'Crown'
                ? 'bg-amber-500'
                : condition === 'Root Canal'
                ? 'bg-orange-500'
                : condition === 'Implant'
                ? 'bg-purple-600'
                : condition === 'Missing'
                ? 'bg-slate-400'
                : 'bg-teal-500'
            }`}
          />
        )}
      </div>

      {/* Condition short text */}
      <span className="text-[10px] text-slate-500 truncate max-w-[50px] font-medium text-center">
        {condition === 'Healthy' ? '' : condition}
      </span>
    </div>
  );
};

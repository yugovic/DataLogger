import React from 'react';

import { SessionPresetId } from '../../lib/uiPresets';

export interface VinylSelectorOption {
  id: SessionPresetId;
  title: string;
  subtitle?: string;
  artwork?: string;
}

interface VinylSelectorProps {
  title?: string;
  options: VinylSelectorOption[];
  selected: SessionPresetId;
  onSelect: (id: SessionPresetId) => void;
}

export const VinylSelector: React.FC<VinylSelectorProps> = ({
  title = 'Mashup presets',
  options,
  selected,
  onSelect
}) => {
  return (
    <div className="bg-[var(--bg-shell-light)] rounded-[28px] p-4 mb-6">
      <div className="flex items-center justify-between text-[var(--text-muted)] px-2">
        <p className="uppercase text-xs tracking-[0.4em]">{title}</p>
      </div>
      <div className="mt-4 flex gap-6 justify-center">
        {options.map((option) => {
          const isActive = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`relative disc-button w-32 h-32 overflow-hidden flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-105' : 'scale-95 opacity-80'}`}
            >
              <div
                className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden"
                style={{
                  backgroundImage: option.artwork ? `url(${option.artwork})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              ></div>
              <div className="absolute bottom-2 text-center w-full text-white/80 text-xs">
                <p className="font-semibold">{option.subtitle || option.title}</p>
              </div>
              <div className="absolute bottom-3 right-3 w-2 h-2 bg-white rounded-full"></div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

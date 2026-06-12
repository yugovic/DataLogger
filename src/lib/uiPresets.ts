export type SessionPresetId = 'practice' | 'qualifying' | 'race';

export interface VinylPreset {
  id: SessionPresetId;
  title: string;
  subtitle: string;
  artwork: string;
}

export const vinylSessionPresets: VinylPreset[] = [
  {
    id: 'practice',
    title: 'Flow Mode',
    subtitle: '練習走行',
    artwork: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=60'
  },
  {
    id: 'qualifying',
    title: 'Precision',
    subtitle: '予選',
    artwork: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=60'
  },
  {
    id: 'race',
    title: 'Push Mode',
    subtitle: '決勝',
    artwork: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=60'
  }
];

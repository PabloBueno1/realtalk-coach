export interface ScoreData {
  id: number;
  value: number;
  label: string;
  color: string;
}

export const valueFormatter = (value: number) => `${value} (${((value / 100) * 100).toFixed(1)}%)`; 

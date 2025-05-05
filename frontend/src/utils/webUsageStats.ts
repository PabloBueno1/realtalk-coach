export interface ChartItem {
  id: number;
  value: number;
  label: string;
  color: string;
}

export const desktopOS: ChartItem[] = [
  {
    id: 0,
    value: 0,
    label: 'Poor (1-2)',
    color: '#F44336',
  },
  {
    id: 1,
    value: 0,
    label: 'Average (3)',
    color: '#FFC107',
  },
  {
    id: 2,
    value: 0,
    label: 'Good (4-5)',
    color: '#4CAF50',
  },
];

export const valueFormatter = (item: ChartItem) => `${item.value}`; 
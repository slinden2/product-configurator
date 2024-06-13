export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectOptionGroup {
  [key: string]: SelectOption[];
}

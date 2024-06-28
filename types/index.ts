export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  [key: string]: SelectOption[];
}

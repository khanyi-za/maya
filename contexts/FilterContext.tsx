import React, { createContext, useContext, useState, ReactNode } from 'react';

type FilterType = 'men' | 'women' | 'home-lifestyle';

interface FilterContextType {
  activePrimaryFilter: FilterType;
  setActivePrimaryFilter: (filter: FilterType) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const [activePrimaryFilter, setActivePrimaryFilter] = useState<FilterType>('women');

  return (
    <FilterContext.Provider value={{ activePrimaryFilter, setActivePrimaryFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
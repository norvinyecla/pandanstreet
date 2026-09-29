import { createContext, useContext } from 'react';

/** Incremented whenever the current user creates a tile, so pages can refetch. */
export const TilesVersionContext = createContext(0);

export function useTilesVersion(): number {
  return useContext(TilesVersionContext);
}

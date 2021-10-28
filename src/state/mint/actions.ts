import { createAction } from '@reduxjs/toolkit'

export enum Field {
  CURRENCY_A = 'CURRENCY_A',
  CURRENCY_B = 'CURRENCY_B'
}

export const typeInput = createAction<{ field: Field; typedValue: string; noLiquidity: boolean }>('mint/typeInputMint')
export const switchField = createAction<{ field: Field }>('mint/switchField')
export const resetMintState = createAction<void>('mint/resetMintState')

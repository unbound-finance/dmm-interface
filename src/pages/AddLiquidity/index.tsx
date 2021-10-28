import React, { useState } from 'react'
import { currencyEquals, WETH } from '@dynamic-amm/sdk'
import { RouteComponentProps } from 'react-router-dom'
import { AutoColumn } from '../../components/Column'
import { AddRemoveTabs } from '../../components/NavigationTabs'
import { MinimalPositionCard } from '../../components/PositionCard'

import { PairState } from '../../data/Reserves'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'

import { useDerivedMintInfo } from '../../state/mint/hooks'

import AppBody from '../AppBody'

import LiquidityProviderMode from 'components/LiquidityProviderMode'

import ZapIn from './ZapIn'
import TwoTokens from './TwoTokens'

export default function AddLiquidity({
  match: {
    params: { currencyIdA, currencyIdB, pairAddress }
  }
}: RouteComponentProps<{ currencyIdA: string; currencyIdB: string; pairAddress: string }>) {
  const { chainId } = useActiveWeb3React()
  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const currencyAIsWETH = !!(chainId && currencyA && currencyEquals(currencyA, WETH[chainId]))
  const currencyBIsWETH = !!(chainId && currencyB && currencyEquals(currencyB, WETH[chainId]))

  const oneCurrencyIsWETH = currencyBIsWETH || currencyAIsWETH

  const { pair, pairState, noLiquidity } = useDerivedMintInfo(
    currencyA ?? undefined,
    currencyB ?? undefined,
    pairAddress
  )

  const [activeTab, setActiveTab] = useState(0)

  return (
    <>
      <AppBody>
        <AddRemoveTabs creating={false} adding={true} />
        <div style={{ margin: '8px 0 24px 0' }}>
          <LiquidityProviderMode activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        {activeTab === 0 ? (
          <ZapIn currencyIdA={currencyIdA} currencyIdB={currencyIdB} pairAddress={pairAddress} />
        ) : (
          <TwoTokens currencyIdA={currencyIdA} currencyIdB={currencyIdB} pairAddress={pairAddress} />
        )}
      </AppBody>

      {pair && !noLiquidity && pairState !== PairState.INVALID ? (
        <AutoColumn style={{ minWidth: '20rem', width: '100%', maxWidth: '425px', marginTop: '24px' }}>
          <MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
        </AutoColumn>
      ) : null}
    </>
  )
}

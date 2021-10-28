import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Fraction, JSBI, Pair, Percent, Price } from '@dynamic-amm/sdk'
import React from 'react'
import { Text } from 'rebass'
import { ButtonPrimary } from '../../components/Button'
import { RowBetween, RowFixed } from '../../components/Row'
import CurrencyLogo from '../../components/CurrencyLogo'
import { Field } from '../../state/mint/actions'
import { TYPE } from '../../theme'
import { PoolPriceRangeBar } from 'components/PoolPriceBar'
import styled from 'styled-components'
import { useCurrencyConvertedToNative } from 'utils/dmm'
import CurrentPrice from 'components/CurrentPrice'

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.border4};
  border-radius: 4px;
  margin-bottom: 24px;
`

export function ConfirmAddModalBottom({
  pair,
  noLiquidity,
  price,
  currencies,
  parsedAmounts,
  poolTokenPercentage,
  onAdd,
  amplification,
  showInverted,
  setShowInverted
}: {
  pair: Pair | null | undefined
  noLiquidity?: boolean
  price?: Price
  currencies: { [field in Field]?: Currency }
  parsedAmounts: { [field in Field]?: CurrencyAmount }
  poolTokenPercentage?: Percent
  onAdd: () => void
  amplification?: Fraction
  showInverted?: boolean
  setShowInverted?: (showInverted: boolean) => void
}) {
  const amp = !!pair
    ? new Fraction(pair.amp).divide(JSBI.BigInt(10000)).toSignificant(5)
    : amplification?.divide(JSBI.BigInt(10000)).toSignificant(5)
  const tokenA = useCurrencyConvertedToNative(currencies[Field.CURRENCY_A] as Currency)
  const tokenB = useCurrencyConvertedToNative(currencies[Field.CURRENCY_B] as Currency)
  return (
    <>
      <Section>
        <RowBetween>
          <TYPE.body>
            <Trans>Pooled {tokenA?.symbol}</Trans>
          </TYPE.body>
          <RowFixed>
            <CurrencyLogo currency={currencies[Field.CURRENCY_A]} style={{ marginRight: '8px' }} />
            <TYPE.body>{parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)}</TYPE.body>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <TYPE.body>
            <TYPE.body>
              <Trans>Pooled {tokenB?.symbol}</Trans>
            </TYPE.body>
          </TYPE.body>
          <RowFixed>
            <CurrencyLogo currency={currencies[Field.CURRENCY_B]} style={{ marginRight: '8px' }} />
            <TYPE.body>{parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)}</TYPE.body>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <TYPE.body>Rates</TYPE.body>
          <TYPE.black fontWeight={400} fontSize={14}>
            <CurrentPrice price={price} showInverted={showInverted || false} setShowInverted={setShowInverted} />
          </TYPE.black>
        </RowBetween>
        <RowBetween>
          <TYPE.body>
            <Trans>Your Share of Pool</Trans>:
          </TYPE.body>
          <TYPE.body>{noLiquidity ? '100' : poolTokenPercentage?.toSignificant(4)}%</TYPE.body>
        </RowBetween>
      </Section>

      <Section>
        <TYPE.body>AMP{!!amp ? <>&nbsp;=&nbsp;{amp}</> : ''}</TYPE.body>
        <PoolPriceRangeBar pair={pair} currencies={currencies} price={price} amplification={amplification} />
      </Section>

      <ButtonPrimary style={{ margin: '4px 0 0 0', padding: '16px' }} onClick={onAdd}>
        <Text fontWeight={500} fontSize={18}>
          {noLiquidity ? 'Create Pool' : 'Confirm'}
        </Text>
      </ButtonPrimary>
    </>
  )
}

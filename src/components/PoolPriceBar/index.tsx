import { t, Trans } from '@lingui/macro'
import { ButtonEmpty } from 'components/Button'
import Card from 'components/Card'
import { FixedHeightRow } from 'components/PositionCard'
import QuestionHelper from 'components/QuestionHelper'
import { Currency, Fraction, JSBI, Pair, Percent, Price } from '@dynamic-amm/sdk'
import React, { ReactNode, useContext } from 'react'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'react-feather'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import { useCurrencyConvertedToNative, priceRangeCalc, priceRangeCalcByPair } from 'utils/dmm'
import { AutoColumn } from '../../components/Column'
import { AutoRow, RowFixed } from '../../components/Row'
import { ONE_BIPS } from '../../constants'
import { Field } from '../../state/mint/actions'
import { TYPE } from '../../theme'

const DEFAULT_MIN_PRICE = '0.00'
const DEFAULT_MAX_PRICE = '♾️'

const Section = styled(Card)`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.border4};
  border-radius: 8px;
`

const OutlineCard3 = styled(Section)`
  text-align: left;
`

const ChevronUp2 = styled(ChevronUp)`
  color: ${({ theme }) => theme.text1};
`
const ChevronDown2 = styled(ChevronDown)`
  color: ${({ theme }) => theme.text1};
`

export const Separator = styled.div`
  width: 100%;
  height: 1px;
  background-color: ${({ theme }) => theme.border};
`

const PoolPriceBarWrapper = styled.div<{ isAdd?: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 8px;

  @media only screen and (min-width: 1000px) {
    grid-template-columns: ${({ isAdd }) => (isAdd ? '1fr' : 'repeat(3, 1fr)')};
  }
`

const PoolPriceBarItem = styled.div<{ isAdd?: boolean }>`
  display: flex;
  justify-content: space-between;

  @media only screen and (min-width: 1000px) {
    flex-direction: ${({ isAdd }) => (isAdd ? 'row' : 'column-reverse')};
  }
`

export const DefaultPriceRange = () => {
  return (
    <>
      <TYPE.black>Max: {DEFAULT_MAX_PRICE}</TYPE.black>
      <TYPE.black>Min: {DEFAULT_MIN_PRICE}</TYPE.black>
    </>
  )
}

export const InvalidAMPPriceRange = () => {
  return (
    <>
      <TYPE.black>-</TYPE.black>
      <TYPE.black>-</TYPE.black>
    </>
  )
}

export function PoolPriceBar({
  currencies,
  noLiquidity,
  poolTokenPercentage,
  price
}: {
  currencies: { [field in Field]?: Currency }
  noLiquidity?: boolean
  poolTokenPercentage?: Percent
  price?: Price
  pair: Pair | null | undefined
}) {
  const theme = useContext(ThemeContext)
  const nativeA = useCurrencyConvertedToNative(currencies[Field.CURRENCY_A] as Currency)
  const nativeB = useCurrencyConvertedToNative(currencies[Field.CURRENCY_B] as Currency)

  return (
    <PoolPriceBarWrapper isAdd={!noLiquidity}>
      {noLiquidity && (
        <>
          <PoolPriceBarItem>
            <Text fontWeight={400} fontSize={14} color={theme.subText} pt={1}>
              {nativeB?.symbol} <Trans>per</Trans> {nativeA?.symbol}
            </Text>
            <TYPE.black fontWeight={400} fontSize={14} color={theme.text}>
              {price?.toSignificant(6) ?? '-'}
            </TYPE.black>
          </PoolPriceBarItem>

          <PoolPriceBarItem>
            <Text fontWeight={400} fontSize={14} color={theme.subText} pt={1}>
              {nativeA?.symbol} <Trans>per</Trans> {nativeB?.symbol}
            </Text>
            <TYPE.black fontWeight={400} fontSize={14} color={theme.text}>
              {price?.invert()?.toSignificant(6) ?? '-'}
            </TYPE.black>
          </PoolPriceBarItem>
        </>
      )}

      <PoolPriceBarItem isAdd={!noLiquidity}>
        <Text fontWeight={400} fontSize={14} color={theme.subText} pt={1}>
          <Trans>Share of Pool</Trans>
        </Text>
        <TYPE.black fontWeight={400} color={theme.text} fontSize={14}>
          {noLiquidity && price
            ? '100'
            : (poolTokenPercentage?.lessThan(ONE_BIPS) ? '<0.01' : poolTokenPercentage?.toFixed(2)) ?? '0'}
          %
        </TYPE.black>
      </PoolPriceBarItem>
    </PoolPriceBarWrapper>
  )
}

export function ToggleComponent({
  children,
  title = '',
  question = ''
}: {
  children: ReactNode
  title: string
  question: string
}) {
  const theme = useContext(ThemeContext)
  const [showDetails, setShowDetails] = useState(true)
  return (
    <>
      <FixedHeightRow style={{ marginBottom: '16px' }}>
        <AutoRow>
          <Text fontWeight={500} fontSize={14} color={theme.text2}>
            {title}
          </Text>
          <QuestionHelper text={question} />
        </AutoRow>
        <RowFixed gap="8px">
          <ButtonEmpty
            padding="6px 8px"
            borderRadius="12px"
            width="fit-content"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronUp2 size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown2 size="20" style={{ marginLeft: '10px' }} />
            )}
          </ButtonEmpty>
        </RowFixed>
      </FixedHeightRow>
      {showDetails && <>{children}</>}
    </>
  )
}

export function PoolPriceRangeBarToggle({
  currencies,
  price,
  pair,
  amplification
}: {
  currencies: { [field in Field]?: Currency }
  price?: Price | Fraction
  pair: Pair | null | undefined
  amplification?: Fraction
}) {
  return (
    <OutlineCard3>
      <ToggleComponent
        title={t`Active Price Range`}
        question={t`Tradable token pair price range for this pool based on AMP. If the price goes below or above this range, the pool may become inactive.`}
      >
        <PoolPriceRangeBar currencies={currencies} price={price} pair={pair} amplification={amplification} />
      </ToggleComponent>
    </OutlineCard3>
  )
}

export function PoolPriceRangeBar({
  currencies,
  price,
  pair,
  amplification
}: {
  currencies: { [field in Field]?: Currency }
  price?: Price | Fraction
  pair: Pair | null | undefined
  amplification?: Fraction
}) {
  const theme = useContext(ThemeContext)
  const nativeA = useCurrencyConvertedToNative(currencies[Field.CURRENCY_A] as Currency)
  const nativeB = useCurrencyConvertedToNative(currencies[Field.CURRENCY_B] as Currency)

  const existedPriceRange = () => {
    const amp = amplification?.divide(JSBI.BigInt(10000))
    const show = !!pair && !!priceRangeCalcByPair(pair)[0][0]
    return (
      <AutoColumn gap="md">
        <AutoRow justify="space-between" gap="4px">
          <AutoColumn gap="sm">
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              {nativeA?.symbol}/{nativeB?.symbol}
            </Text>
            {!amp || amp.lessThan('1') ? (
              <InvalidAMPPriceRange />
            ) : show && !!pair ? (
              <>
                <TYPE.black color={theme.text}>
                  Max:{' '}
                  {priceRangeCalcByPair(pair)[
                    currencies[Field.CURRENCY_A]?.symbol === pair.token0.symbol ? 0 : 1
                  ][1]?.toSignificant(6) ?? '-'}
                </TYPE.black>
                <TYPE.black color={theme.text}>
                  Min:{' '}
                  {priceRangeCalcByPair(pair)[
                    currencies[Field.CURRENCY_A]?.symbol === pair.token0.symbol ? 0 : 1
                  ][0]?.toSignificant(6) ?? '-'}
                </TYPE.black>
              </>
            ) : (
              <DefaultPriceRange />
            )}
          </AutoColumn>
          <AutoColumn gap="sm" justify="end">
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              {nativeB?.symbol}/{nativeA?.symbol}
            </Text>
            {!amp || amp.lessThan('1') ? (
              <InvalidAMPPriceRange />
            ) : show && !!pair ? (
              <>
                <TYPE.black color={theme.text}>
                  Max:{' '}
                  {priceRangeCalcByPair(pair)[
                    currencies[Field.CURRENCY_A]?.symbol === pair.token0.symbol ? 1 : 0
                  ][1]?.toSignificant(6) ?? '-'}
                </TYPE.black>
                <TYPE.black color={theme.text}>
                  Min:{' '}
                  {priceRangeCalcByPair(pair)[
                    currencies[Field.CURRENCY_A]?.symbol === pair.token0.symbol ? 1 : 0
                  ][0]?.toSignificant(6) ?? '-'}
                </TYPE.black>
              </>
            ) : (
              <DefaultPriceRange />
            )}
          </AutoColumn>
        </AutoRow>
      </AutoColumn>
    )
  }

  const newPriceRange = () => {
    const amp = amplification?.divide(JSBI.BigInt(10000))
    const show = !!priceRangeCalc(price, amp)[0]
    return (
      <AutoColumn gap="md">
        <AutoRow justify="space-between" gap="4px">
          <AutoColumn gap="sm">
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              {nativeA?.symbol}/{nativeB?.symbol}
            </Text>
            {!amp || amp.lessThan('1') ? (
              <InvalidAMPPriceRange />
            ) : show ? (
              <>
                <TYPE.black color={theme.text}>
                  Max: {priceRangeCalc(price, amp)[0]?.toSignificant(6) ?? '-'}
                </TYPE.black>
                <TYPE.black color={theme.text}>
                  Min: {priceRangeCalc(price, amp)[1]?.toSignificant(6) ?? '-'}
                </TYPE.black>
              </>
            ) : (
              <DefaultPriceRange />
            )}
          </AutoColumn>
          <AutoColumn gap="sm" justify="end">
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              {nativeB?.symbol}/{nativeA?.symbol}
            </Text>
            {!amp || amp.lessThan('1') ? (
              <InvalidAMPPriceRange />
            ) : show ? (
              <>
                <TYPE.black color={theme.text}>
                  Max: {priceRangeCalc(price?.invert(), amp)[0]?.toSignificant(6) ?? '-'}
                </TYPE.black>
                <TYPE.black color={theme.text}>
                  Min: {priceRangeCalc(price?.invert(), amp)[1]?.toSignificant(6) ?? '-'}
                </TYPE.black>
              </>
            ) : (
              <DefaultPriceRange />
            )}
          </AutoColumn>
        </AutoRow>
      </AutoColumn>
    )
  }

  return <>{!!pair ? existedPriceRange() : newPriceRange()}</>
}

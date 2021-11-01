import React, { useCallback, useContext, useMemo, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { parseUnits } from 'ethers/lib/utils'
import { AlertTriangle } from 'react-feather'
import { Text, Flex } from 'rebass'
import { ThemeContext } from 'styled-components'
import { t, Trans } from '@lingui/macro'

import {
  computePriceImpact,
  Currency,
  CurrencyAmount,
  currencyEquals,
  ETHER,
  Fraction,
  JSBI,
  TokenAmount,
  WETH
} from '@dynamic-amm/sdk'
import { ZAP_ADDRESSES } from 'constants/index'
import { ButtonError, ButtonLight, ButtonPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import Row, { AutoRow, RowBetween, RowFlat } from 'components/Row'
import { PoolPriceBar, PoolPriceRangeBarToggle } from 'components/PoolPriceBar'
import QuestionHelper from 'components/QuestionHelper'
import Loader from 'components/Loader'
import CurrentPrice from 'components/CurrentPrice'
import CurrencyLogo from 'components/CurrencyLogo'
import FormattedPriceImpact from 'components/swap/FormattedPriceImpact'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { ConfirmAddModalBottom } from 'components/ConfirmAddModalBottom'
import { PairState } from '../../data/Reserves'
import { useActiveWeb3React } from 'hooks'
import { useCurrency } from 'hooks/Tokens'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import useTokensMarketPrice from 'hooks/useTokensMarketPrice'
import useZap from 'hooks/useZap'
import { useTokensPrice, useWalletModalToggle } from 'state/application/hooks'
import { Field } from 'state/mint/actions'
import { useDerivedZapInfo, useMintState, useZapInActionHandlers } from 'state/mint/hooks'
import { useIsExpertMode, useUserSlippageTolerance } from 'state/user/hooks'
import { tryParseAmount } from 'state/swap/hooks'
import { useTransactionAdder } from 'state/transactions/hooks'
import { StyledInternalLink, TYPE } from 'theme'
import { formattedNum } from 'utils'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { wrappedCurrency } from 'utils/wrappedCurrency'
import { currencyId } from 'utils/currencyId'
import isZero from 'utils/isZero'
import { useCurrencyConvertedToNative, feeRangeCalc } from 'utils/dmm'
import { Dots, Wrapper } from '../Pool/styleds'
import { ActiveText, Section, USDPrice, Warning, TokenWrapper, TokenColumn, AMPColumn } from './styled'
import { GridColumn } from 'pages/CreatePool/styled'

const ZapIn = ({
  currencyIdA,
  currencyIdB,
  pairAddress
}: {
  currencyIdA: string
  currencyIdB: string
  pairAddress: string
}) => {
  const { account, chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)
  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const expertMode = useIsExpertMode()

  const { zapIn, zapInEth } = useZap()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error,
    unAmplifiedPairAddress
  } = useDerivedZapInfo(currencyA ?? undefined, currencyB ?? undefined, pairAddress)

  const nativeA = useCurrencyConvertedToNative(currencies[Field.CURRENCY_A])
  const nativeB = useCurrencyConvertedToNative(currencies[Field.CURRENCY_B])

  const selectedCurrencyIsETHER = !!(
    chainId &&
    currencies[independentField] &&
    currencyEquals(currencies[independentField] as Currency, ETHER)
  )

  const selectedCurrencyIsWETH = !!(
    chainId &&
    currencies[independentField] &&
    currencyEquals(currencies[independentField] as Currency, WETH[chainId])
  )

  const amp = pair?.amp || JSBI.BigInt(0)

  const ampConvertedInBps = !!amp.toString()
    ? new Fraction(JSBI.BigInt(parseUnits(amp.toString() || '1', 20)), JSBI.BigInt(parseUnits('1', 16)))
    : undefined

  const linkToUnamplifiedPool =
    !!ampConvertedInBps &&
    ampConvertedInBps.equalTo(JSBI.BigInt(10000)) &&
    !!unAmplifiedPairAddress &&
    !isZero(unAmplifiedPairAddress)
  const { onFieldInput, onSwitchField } = useZapInActionHandlers()

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  // txn values
  const deadline = useTransactionDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState<string>('')
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field])
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0')
      }
    },
    {}
  )
  // check whether the user has approved the router on the tokens
  const amountToApprove = tryParseAmount(typedValue, currencies[independentField])

  const [approval, approveCallback] = useApproveCallback(
    amountToApprove,
    !!chainId ? ZAP_ADDRESSES[chainId] : undefined
  )

  const userInCurrencyAmount = useMemo(() => {
    return tryParseAmount(typedValue, currencies[independentField], true)
  }, [currencies, independentField, typedValue])

  const userIn = useMemo(() => {
    return userInCurrencyAmount ? BigNumber.from(userInCurrencyAmount.raw.toString()) : undefined
  }, [userInCurrencyAmount])

  const minLPQty = !liquidityMinted
    ? JSBI.BigInt(0)
    : JSBI.divide(JSBI.multiply(liquidityMinted?.raw, JSBI.BigInt(10000 - allowedSlippage)), JSBI.BigInt(10000))

  const addTransaction = useTransactionAdder()
  const handleZapIn = async () => {
    if (!chainId || !account) {
      return
    }

    const tokenIn = wrappedCurrency(currencies[independentField], chainId)
    const tokenOut = wrappedCurrency(currencies[dependentField], chainId)

    if (!pair || !pair.address || !deadline || !tokenIn || !tokenOut || !userIn) {
      return
    }

    setAttemptingTxn(true)
    setTxHash('')

    try {
      if (currencies[independentField] === ETHER) {
        const tx = await zapInEth(userIn, tokenOut.address, pair.address, minLPQty.toString(), deadline)

        addTransaction(tx, {
          summary: t`Add liquidity for single token ${
            independentField === Field.CURRENCY_A ? nativeA?.symbol : nativeB?.symbol
          } with amount of ${userInCurrencyAmount?.toSignificant(4)}`
        })

        setTxHash(tx.hash)
      } else {
        const tx = await zapIn(tokenIn.address, tokenOut.address, userIn, pair.address, minLPQty.toString(), deadline)

        addTransaction(tx, {
          summary: t`Add liquidity for single token ${
            independentField === Field.CURRENCY_A ? nativeA?.symbol : nativeB?.symbol
          } with amount of ${userInCurrencyAmount?.toSignificant(4)}`
        })

        setTxHash(tx.hash)
      }
    } catch (err) {
      console.error(err)
    }

    setAttemptingTxn(false)
  }

  const modalHeader = () => {
    return (
      <AutoColumn gap="5px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="24px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {liquidityMinted?.toSignificant(6)}
          </Text>
        </RowFlat>
        <Row>
          <Text fontSize="24px">{'DMM ' + nativeA?.symbol + '/' + nativeB?.symbol + ' LP Tokens'}</Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${allowedSlippage /
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmAddModalBottom
        pair={pair}
        price={price}
        currencies={currencies}
        parsedAmounts={parsedAmounts}
        noLiquidity={false}
        onAdd={handleZapIn}
        poolTokenPercentage={poolTokenPercentage}
        amplification={ampConvertedInBps}
        showInverted={showInverted}
        setShowInverted={setShowInverted}
      />
    )
  }

  const pendingText = `Supplying ${parsedAmounts[independentField]?.toSignificant(6)} ${
    currencies[independentField]?.symbol
  } and ${parsedAmounts[independentField]?.toSignificant(6)} ${currencies[independentField]?.symbol}`

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldInput('')
    }
    setTxHash('')
  }, [onFieldInput, txHash])

  const realPercentToken0 = pair
    ? pair.reserve0
        .divide(pair.virtualReserve0)
        .multiply('100')
        .divide(pair.reserve0.divide(pair.virtualReserve0).add(pair.reserve1.divide(pair.virtualReserve1)))
    : new Fraction(JSBI.BigInt(50))

  const realPercentToken1 = new Fraction(JSBI.BigInt(100), JSBI.BigInt(1)).subtract(realPercentToken0 as Fraction)

  const percentToken0 = realPercentToken0.toSignificant(4)
  const percentToken1 = realPercentToken1.toSignificant(4)

  const tokens = useMemo(
    () =>
      [currencies[independentField], currencies[dependentField]].map(currency => wrappedCurrency(currency, chainId)),
    [chainId, currencies, dependentField, independentField]
  )

  const usdPrices = useTokensPrice(tokens)
  const marketPrices = useTokensMarketPrice(tokens)

  const poolPrice = Number(price?.toSignificant(6))
  const marketPrice = marketPrices[1] && marketPrices[0] / marketPrices[1]

  const showSanityPriceWarning = !!(poolPrice && marketPrice && Math.abs(poolPrice - marketPrice) / marketPrice > 0.05)

  const handleSwitchCurrency = useCallback(() => {
    onSwitchField()
  }, [onSwitchField])

  const estimatedUsd =
    userInCurrencyAmount && usdPrices[0] && usdPrices[1]
      ? parseFloat(userInCurrencyAmount.toSignificant(6)) * usdPrices[0]
      : 0

  const tokenAPoolAllocUsd =
    usdPrices[0] &&
    parsedAmounts &&
    parsedAmounts[independentField] &&
    usdPrices[0] * parseFloat((parsedAmounts[independentField] as CurrencyAmount).toSignificant(6))

  const tokenBPoolAllocUsd =
    usdPrices[1] &&
    parsedAmounts &&
    parsedAmounts[dependentField] &&
    usdPrices[1] * parseFloat((parsedAmounts[dependentField] as CurrencyAmount).toSignificant(6))

  const priceImpact =
    price &&
    parsedAmounts[independentField] &&
    parsedAmounts[dependentField] &&
    computePriceImpact(
      independentField === Field.CURRENCY_A ? price : price.invert(),
      parsedAmounts[independentField] as CurrencyAmount,
      parsedAmounts[dependentField] as CurrencyAmount
    )

  return (
    <Wrapper>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() =>
          !linkToUnamplifiedPool ? (
            <ConfirmationModalContent
              title={t`You will receive`}
              onDismiss={handleDismissConfirmation}
              topContent={modalHeader}
              bottomContent={modalBottom}
            />
          ) : (
            <ConfirmationModalContent
              title={'Unamplified Pool existed'}
              onDismiss={handleDismissConfirmation}
              topContent={() => {
                return null
              }}
              bottomContent={() => {
                return (
                  <>
                    Please use the link below if you want to add liquidity to Unamplified Pool
                    <StyledInternalLink
                      onClick={handleDismissConfirmation}
                      id="unamplified-pool-link"
                      to={`/add/${currencyIdA}/${currencyIdB}/${unAmplifiedPairAddress}`}
                    >
                      Go to unamplified pool
                    </StyledInternalLink>
                  </>
                )
              }}
            />
          )
        }
        pendingText={pendingText}
      />

      <AutoColumn gap="20px">
        <GridColumn>
          <TokenColumn gap="20px">
            <div>
              <CurrencyInputPanel
                value={formattedAmounts[independentField]}
                onUserInput={onFieldInput}
                onMax={() => {
                  onFieldInput(maxAmounts[independentField]?.toExact() ?? '')
                }}
                onSwitchCurrency={handleSwitchCurrency}
                showMaxButton={!atMaxAmounts[independentField]}
                currency={currencies[independentField]}
                id="zap-input"
                disableCurrencySelect={false}
                showCommonBases
                positionMax="top"
                isSwitchMode
                estimatedUsd={formattedNum(estimatedUsd.toString(), true) || undefined}
              />
              <Flex justifyContent="space-between" alignItems="center" marginTop="0.5rem">
                <USDPrice>
                  {usdPrices[0] ? (
                    `1 ${currencies[independentField]?.symbol} = ${formattedNum(usdPrices[0].toString(), true)}`
                  ) : (
                    <Loader />
                  )}
                </USDPrice>

                {pairAddress &&
                  chainId &&
                  (selectedCurrencyIsETHER || selectedCurrencyIsWETH) &&
                  currencies[dependentField] && (
                    <StyledInternalLink
                      replace
                      to={`/add/${
                        selectedCurrencyIsETHER ? currencyId(WETH[chainId], chainId) : currencyId(ETHER, chainId)
                      }/${currencyId(currencies[dependentField] as Currency, chainId)}/${pairAddress}`}
                    >
                      {selectedCurrencyIsETHER ? <Trans>Use Wrapped Token</Trans> : <Trans>Use Native Token</Trans>}
                    </StyledInternalLink>
                  )}
              </Flex>
            </div>

            <Section padding="0px" borderRadius={'20px'}>
              <Row padding="0 0 1rem 0">
                <TYPE.subHeader fontWeight={500} fontSize={14} color={theme.subText}>
                  <Trans>Pool Allocation</Trans>
                </TYPE.subHeader>
              </Row>

              <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                <TokenWrapper>
                  <CurrencyLogo currency={currencies[independentField] || undefined} size={'16px'} />
                  <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                    {currencies[independentField]?.symbol}:
                  </TYPE.subHeader>
                </TokenWrapper>
                <TYPE.black fontWeight={400} fontSize={14}>
                  {parsedAmounts[independentField]?.toSignificant(6)} (~
                  {formattedNum((tokenAPoolAllocUsd || 0).toString(), true)})
                </TYPE.black>
              </AutoRow>

              <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                <TokenWrapper>
                  <CurrencyLogo currency={currencies[dependentField] || undefined} size={'16px'} />
                  <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                    {currencies[dependentField]?.symbol}:
                  </TYPE.subHeader>
                </TokenWrapper>
                <TYPE.black fontWeight={400} fontSize={14}>
                  {parsedAmounts[dependentField]?.toSignificant(6)} (~
                  {formattedNum((tokenBPoolAllocUsd || 0).toString(), true)})
                </TYPE.black>
              </AutoRow>

              <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                  <Trans>Price Impact</Trans>:
                </TYPE.subHeader>
                <TYPE.black fontWeight={400} fontSize={14}>
                  <FormattedPriceImpact priceImpact={priceImpact} />
                </TYPE.black>
              </AutoRow>

              <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                  <Trans>Est. received</Trans>:
                </TYPE.subHeader>
                <TYPE.black fontWeight={400} fontSize={14}>
                  {liquidityMinted?.toSignificant(6)} LP (~
                  {tokenAPoolAllocUsd &&
                    tokenBPoolAllocUsd &&
                    formattedNum((tokenAPoolAllocUsd + tokenBPoolAllocUsd).toString(), true)}
                  )
                </TYPE.black>
              </AutoRow>
            </Section>

            {currencies[independentField] && currencies[dependentField] && pairState !== PairState.INVALID && (
              <Section padding="0px" borderRadius={'20px'}>
                <Row padding="0 0 1rem 0">
                  <TYPE.subHeader fontWeight={500} fontSize={14} color={theme.subText}>
                    <Trans>Prices and Pool share</Trans>
                  </TYPE.subHeader>
                </Row>

                {!noLiquidity && (
                  <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                    <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                      <Trans>Current Price:</Trans>
                    </TYPE.subHeader>
                    <TYPE.black fontWeight={400} fontSize={14}>
                      <CurrentPrice price={price} showInverted={showInverted} setShowInverted={setShowInverted} />
                    </TYPE.black>
                  </AutoRow>
                )}

                <AutoRow justify="space-between" gap="4px" style={{ paddingBottom: '12px' }}>
                  <TYPE.subHeader fontWeight={400} fontSize={14} color={theme.subText}>
                    <Trans>Inventory ratio:</Trans>
                  </TYPE.subHeader>
                  <TYPE.black fontWeight={400} fontSize={14}>
                    {percentToken0}% {pair?.token0.symbol} - {percentToken1}% {pair?.token1.symbol}
                  </TYPE.black>
                </AutoRow>

                <PoolPriceBar
                  currencies={currencies}
                  poolTokenPercentage={poolTokenPercentage}
                  noLiquidity={noLiquidity}
                  price={price}
                  pair={pair}
                />
              </Section>
            )}
          </TokenColumn>

          <AMPColumn gap="20px" style={{ height: 'fit-content' }}>
            <AutoRow>
              <ActiveText>
                AMP
                {!!pair ? <>&nbsp;=&nbsp;{new Fraction(pair.amp).divide(JSBI.BigInt(10000)).toSignificant(5)}</> : ''}
              </ActiveText>
              <QuestionHelper
                text={t({
                  id:
                    'Amplification Factor. Higher AMP, higher capital efficiency within a price range. Higher AMP recommended for more stable pairs, lower AMP for more volatile pairs.',
                  message:
                    'Amplification Factor. Higher AMP, higher capital efficiency within a price range. Higher AMP recommended for more stable pairs, lower AMP for more volatile pairs.'
                })}
              />
            </AutoRow>

            {currencies[independentField] &&
              currencies[dependentField] &&
              pairState !== PairState.INVALID &&
              (!!pairAddress || +amp >= 1) && (
                <PoolPriceRangeBarToggle
                  pair={pair}
                  currencies={currencies}
                  price={price}
                  amplification={ampConvertedInBps}
                />
              )}

            {(!!pairAddress || +amp >= 1) && (
              <Section>
                <AutoRow>
                  <Text fontWeight={500} fontSize={14} color={theme.text2}>
                    <Trans>Dynamic Fee Range</Trans>:{' '}
                    {feeRangeCalc(
                      !!pair?.amp ? +new Fraction(pair.amp).divide(JSBI.BigInt(10000)).toSignificant(5) : +amp
                    )}
                  </Text>
                  <QuestionHelper
                    text={t`Fees are adjusted dynamically according to market conditions to maximise returns for liquidity providers.`}
                  />
                </AutoRow>
              </Section>
            )}

            {showSanityPriceWarning && (
              <Warning>
                <AlertTriangle color={theme.yellow2} />
                <Text fontSize="0.75rem" marginLeft="0.75rem">
                  <Trans>The price is deviating quite a lot from that market price, please be careful!</Trans>
                </Text>
              </Warning>
            )}

            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>
                <Trans>Connect Wallet</Trans>
              </ButtonLight>
            ) : (
              <AutoColumn gap={'md'}>
                {(approval === ApprovalState.NOT_APPROVED || approval === ApprovalState.PENDING) && isValid && (
                  <RowBetween>
                    <ButtonPrimary
                      onClick={approveCallback}
                      disabled={approval === ApprovalState.PENDING}
                      width={'100%'}
                    >
                      {approval === ApprovalState.PENDING ? (
                        <Dots>Approving {currencies[independentField]?.symbol}</Dots>
                      ) : (
                        'Approve ' + currencies[independentField]?.symbol
                      )}
                    </ButtonPrimary>
                  </RowBetween>
                )}

                <ButtonError
                  onClick={() => {
                    expertMode ? handleZapIn() : setShowConfirm(true)
                  }}
                  disabled={!isValid || approval !== ApprovalState.APPROVED}
                  error={
                    !isValid &&
                    !!parsedAmounts[independentField] &&
                    !!parsedAmounts[dependentField] &&
                    !!(pairAddress && +amp < 1)
                  }
                >
                  <Text fontSize={20} fontWeight={500}>
                    {error ?? (!pairAddress && +amp < 1 ? 'Enter amp (>=1)' : 'Supply')}
                  </Text>
                </ButtonError>
              </AutoColumn>
            )}
          </AMPColumn>
        </GridColumn>
      </AutoColumn>
    </Wrapper>
  )
}

export default ZapIn

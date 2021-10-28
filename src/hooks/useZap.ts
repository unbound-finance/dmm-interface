import { useCallback, useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { CONTRACT_NOT_FOUND_MSG } from 'constants/messages'
import { useZapContract } from 'hooks/useContract'
import { calculateGasMargin } from 'utils'

const useZap = () => {
  const zapContract = useZapContract()

  const calculateZapInAmounts = useCallback(
    async (tokenIn: string, tokenOut: string, pool: string, userIn: BigNumber) => {
      try {
        const result = await zapContract?.calculateZapInAmounts(tokenIn, tokenOut, pool, userIn)

        return result
      } catch (err) {
        console.error(err)
        return err
      }
    },
    [zapContract]
  )

  const zapIn = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      userIn: BigNumber,
      pool: string,
      minLqQty: string,
      deadline: BigNumber
    ): Promise<TransactionResponse> => {
      if (!zapContract) {
        throw new Error(CONTRACT_NOT_FOUND_MSG)
      }

      const estimateGas = await zapContract.estimateGas.zapIn(tokenIn, tokenOut, userIn, pool, minLqQty, deadline)
      const tx = await zapContract.zapIn(tokenIn, tokenOut, userIn, pool, minLqQty, deadline, {
        gasLimit: calculateGasMargin(estimateGas)
      })

      return tx
    },
    [zapContract]
  )

  const zapInEth = useCallback(
    async (
      zapInEth: BigNumber,
      tokenOut: string,
      pool: string,
      minLqQty: string,
      deadline: BigNumber
    ): Promise<TransactionResponse> => {
      if (!zapContract) {
        throw new Error(CONTRACT_NOT_FOUND_MSG)
      }

      const estimateGas = await zapContract.estimateGas.zapInEth(tokenOut, pool, minLqQty, deadline, {
        value: zapInEth.toString()
      })
      const tx = await zapContract.zapInEth(tokenOut, pool, minLqQty, deadline, {
        value: zapInEth.toString(),
        gasLimit: calculateGasMargin(estimateGas)
      })

      return tx
    },
    [zapContract]
  )

  return {
    zapContract,
    calculateZapInAmounts,
    zapIn,
    zapInEth
  }
}

export const useZapInAmounts = (tokenIn?: string, tokenOut?: string, pool?: string, userIn?: BigNumber) => {
  const { calculateZapInAmounts } = useZap()
  const [result, setResult] = useState<{
    tokenInAmount: BigNumber
    tokenOutAmount: BigNumber
  }>({
    tokenInAmount: BigNumber.from(0),
    tokenOutAmount: BigNumber.from(0)
  })

  useEffect(() => {
    async function handleCalculateZapInAmounts() {
      if (!userIn) {
        setResult({
          tokenInAmount: BigNumber.from(0),
          tokenOutAmount: BigNumber.from(0)
        })

        return
      }

      if (tokenIn && tokenOut && pool && userIn?.gt(0)) {
        const result = await calculateZapInAmounts(tokenIn, tokenOut, pool, userIn)
        setResult(result)
      }
    }

    handleCalculateZapInAmounts()
  }, [calculateZapInAmounts, pool, tokenIn, tokenOut, userIn])

  return result
}

export default useZap

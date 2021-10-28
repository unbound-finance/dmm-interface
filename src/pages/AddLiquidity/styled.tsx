import Card from 'components/Card'
import { RowFlat } from 'components/Row'
import React from 'react'
import styled from 'styled-components'

export const TokenWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

export const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

export const Section = styled(Card)`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.border4};
  border-radius: 4px;
`

export const USDPrice = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  padding-left: 8px;
  color: ${({ theme }) => theme.primaryText2};
`

export const Warning = styled.div`
  display: flex;
  background: ${({ theme }) => `${theme.warning}20`};
  border-radius: 0.625rem;
  padding: 0.75rem 1rem;
`

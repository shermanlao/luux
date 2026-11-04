'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatHkd } from '@shared/slugify';

export type StoreCurrency = {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  decimals: number;
};

const HKD: StoreCurrency = { code: 'HKD', name: 'Hong Kong dollar', symbol: 'HK$', rate: 1, decimals: 2 };
const STORAGE_KEY = 'luux_currency';

type CurrencyContextValue = {
  currencies: StoreCurrency[];
  code: string;
  setCode: (code: string) => void;
  format: (amount: number | string) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function formatStoreMoney(amount: number | string, currency: StoreCurrency): string {
  if (currency.code === 'HKD' || !Number.isFinite(currency.rate)) return formatHkd(amount);
  const digits = currency.decimals > 0 ? currency.decimals : 0;
  const converted = Number(amount) * currency.rate;
  const text = converted.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${currency.symbol}${text}`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<StoreCurrency[]>([HKD]);
  const [code, setCodeState] = useState('HKD');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setCodeState(saved);
    fetch('/api/currencies')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.currencies) && data.currencies.length) setCurrencies(data.currencies);
      })
      .catch(() => {});
  }, []);

  const setCode = useCallback((next: string) => {
    setCodeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const currency = currencies.find((row) => row.code === code) || HKD;

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencies,
      code: currency.code,
      setCode,
      format: (amount) => formatStoreMoney(amount, currency),
    }),
    [currencies, currency, setCode]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error('useCurrency must be used within CurrencyProvider');
  return value;
}

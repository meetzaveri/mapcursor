import { createContext, useContext } from 'react'
import type { BaseContextValue } from '../../types/base'

export const BaseContext = createContext<BaseContextValue | undefined>(
    undefined
)

export const useBaseContext = (): BaseContextValue => {
    const ctx = useContext(BaseContext)
    if (!ctx) {
        throw new Error('useBaseContext must be called inside <Board />')
    }
    return ctx
}

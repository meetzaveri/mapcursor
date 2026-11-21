import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_BASE_COMPONENT_COUNT_QUERY } from '../schema/queries'
import {
    PERFORMANCE_WARNING_THRESHOLD,
    countBaseElements,
} from '../utils/countBaseElements'
import type { ComponentStore } from '../types/base'

interface UseElementCountWarningArgs {
    componentStore: ComponentStore
    isPersisted: boolean
    baseId: string
}

interface UseElementCountWarningResult {
    showPerfWarning: boolean
    dismissPerfWarning: () => void
}

export const useElementCountWarning = ({
    componentStore,
    isPersisted,
    baseId,
}: UseElementCountWarningArgs): UseElementCountWarningResult => {
    const [showPerfWarning, setShowPerfWarning] = useState(false)
    const hasWarnedRef = useRef(false)

    const warnOnce = useCallback((): void => {
        if (hasWarnedRef.current) return
        hasWarnedRef.current = true
        setShowPerfWarning(true)
    }, [])

    const dismissPerfWarning = useCallback((): void => {
        setShowPerfWarning(false)
    }, [])

    const { data: countData } = useQuery(GET_BASE_COMPONENT_COUNT_QUERY, {
        variables: { baseId },
        fetchPolicy: 'network-only',
        skip: !isPersisted || !baseId,
    })

    useEffect(() => {
        const count = countData?.components?.aggregate?.count
        if (count != null && count > PERFORMANCE_WARNING_THRESHOLD) warnOnce()
    }, [countData, warnOnce])

    useEffect(() => {
        const count = countBaseElements(componentStore)
        if (count > PERFORMANCE_WARNING_THRESHOLD) {
            warnOnce()
        } else if (count > 0) {
            hasWarnedRef.current = false
        }
    }, [componentStore, warnOnce])

    return { showPerfWarning, dismissPerfWarning }
}

import React, { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import ErrorBoundary from './errorBoundary'
import CraftbaseLoader from '../../components/common/craftbaseLoader'
import { GET_COMPONENTS_FOR_BASE_QUERY } from '../../schema/queries'
import { normalizeServerBaseConfig } from '../../baseTypes/serverConfig'
import './index.css'
import type { BaseProps } from '../../types/base'

const BaseViewPage = React.lazy(() => import('./base'))

// Loading gate lives here, NOT inside BaseViewPage. BaseViewPage runs
// hundreds of hooks; an early `return <Spinner/>` mid-component (gated on the
// persisted-base query's `loading`) truncated its hook list on the first
// render and restored it on the next, throwing "Rendered more hooks than
// during the previous render". Deciding loading in this parent keeps
// BaseViewPage's hook order invariant. BaseViewPage's own copy of this
// query (same vars, cache-first) then resolves from cache instantly.
//
// The gate carries a second load: the query also returns the base ROW, whose
// `mapAnchor` must be settled before the canvas mounts. The canvas restores the
// camera and hands the anchor to the backdrop in its mount effect, and revisits
// neither. An anchor that arrived a beat later would mount the map on the wrong
// geography.
const BaseViewContainer: React.FC<BaseProps> = (props) => {
    const { id: baseIdFromUrl } = useParams()
    const isPersisted = !!baseIdFromUrl

    const { loading, data } = useQuery(GET_COMPONENTS_FOR_BASE_QUERY, {
        variables: { baseId: baseIdFromUrl ?? '' },
        fetchPolicy: 'cache-first',
        skip: !isPersisted,
    })

    const serverBaseConfig = normalizeServerBaseConfig(data?.base)

    if (isPersisted && loading) {
        return (
            <Suspense fallback={<CraftbaseLoader />}>
                <ErrorBoundary>
                    <CraftbaseLoader caption="loading your canvas" />
                </ErrorBoundary>
            </Suspense>
        )
    }

    return (
        <Suspense fallback={<CraftbaseLoader />}>
            <ErrorBoundary>
                <BaseViewPage {...props} serverBaseConfig={serverBaseConfig} />
            </ErrorBoundary>
        </Suspense>
    )
}

export default BaseViewContainer

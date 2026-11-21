import React, { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import ErrorBoundary from './errorBoundary'
import MapcursorLoader from '../../components/common/mapcursorLoader'
import { GET_COMPONENTS_FOR_BASE_QUERY } from '../../schema/queries'
import { normalizeServerBaseConfig } from '../../baseTypes/serverConfig'
import './index.css'
import type { BaseProps } from '../../types/base'

const BaseViewPage = React.lazy(() => import('./base'))

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
            <Suspense fallback={<MapcursorLoader />}>
                <ErrorBoundary>
                    <MapcursorLoader caption="loading your map" />
                </ErrorBoundary>
            </Suspense>
        )
    }

    return (
        <Suspense fallback={<MapcursorLoader />}>
            <ErrorBoundary>
                <BaseViewPage {...props} serverBaseConfig={serverBaseConfig} />
            </ErrorBoundary>
        </Suspense>
    )
}

export default BaseViewContainer

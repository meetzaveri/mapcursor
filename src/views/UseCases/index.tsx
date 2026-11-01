import React, { Suspense } from 'react'
import ErrorBoundary from './errorBoundary'
import Spinner from '../../components/common/spinner'

const UseCasesList = React.lazy(() => import('./useCasesList'))
const UseCaseDetail = React.lazy(() => import('./useCaseDetail'))

export const UseCasesViewContainer: React.FC = () => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <UseCasesList />
        </ErrorBoundary>
    </Suspense>
)

export const UseCaseDetailViewContainer: React.FC = () => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <UseCaseDetail />
        </ErrorBoundary>
    </Suspense>
)

import { Suspense } from 'react'
import type { ReactElement } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import routes from '../../routes'
import Spinner from '../../components/common/spinner'
import PageNav from './pageNav'
import { findUseCase } from './useCases'
import type { UseCase } from './useCases'
import { useDocumentMeta } from './useDocumentMeta'

const UseCaseArticle = ({ useCase }: { useCase: UseCase }): ReactElement => {
    useDocumentMeta(useCase.metaTitle, useCase.metaDescription)
    const { Content } = useCase

    return (
        <div className="min-h-screen bg-canvas text-left">
            <PageNav
                backTo={routes.useCases}
                backLabel="All use cases"
                mobileBackLabel="Use cases"
            />

            <main className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-8 tablet-landscape:py-12">
                <article>
                    <header className="mb-6">
                        <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                            Use case
                        </div>
                        <h1 className="text-xl tablet-landscape:text-2xl font-bold text-ink tracking-tight font-display">
                            {useCase.title}
                        </h1>
                    </header>

                    <img
                        src={useCase.heroImage}
                        alt={useCase.heroAlt}
                        className="w-full h-auto rounded-card border border-border-card shadow-card mb-8"
                    />

                    <div className="text-sm tablet-landscape:text-base text-ink-mid leading-relaxed space-y-4">
                        <Suspense fallback={<Spinner />}>
                            <Content />
                        </Suspense>
                    </div>

                    <div className="mt-10 pt-6 border-t border-border-panel">
                        <Link
                            to={routes.index}
                            className="text-sm text-accent-dark font-semibold no-underline border-b border-accent-dark"
                        >
                            Open Mapcursor and start your map
                        </Link>
                    </div>
                </article>
            </main>
        </div>
    )
}

const UseCaseDetail = (): ReactElement => {
    const { slug } = useParams()
    const useCase = findUseCase(slug)
    if (!useCase) return <Navigate to={routes.useCases} replace />
    return <UseCaseArticle useCase={useCase} />
}

export default UseCaseDetail

import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import routes, { useCasePath } from '../../routes'
import PageNav from './pageNav'
import { USE_CASES } from './useCases'
import { useDocumentMeta } from './useDocumentMeta'

const UseCasesList = (): ReactElement => {
    useDocumentMeta(
        'Use cases | Mapcursor',
        'Ways people use Mapcursor to draw and annotate on maps, from road trips with photos at every stop to shareable map sketches.'
    )

    return (
        <div className="min-h-screen bg-canvas text-left">
            <PageNav backTo={routes.index} backLabel="Back to canvas" />

            <main className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-8 tablet-landscape:py-12">
                <div className="mb-6 tablet-landscape:mb-10">
                    <h1 className="text-xl tablet-landscape:text-2xl font-bold text-ink tracking-tight mb-2 font-display">
                        Use cases
                    </h1>
                    <p className="text-xs tablet-landscape:text-sm text-ink-muted leading-relaxed">
                        A few things you can make with Mapcursor, step by step.
                    </p>
                </div>

                <ul className="grid grid-cols-1 tablet-landscape:grid-cols-2 gap-4">
                    {USE_CASES.map((useCase) => (
                        <li key={useCase.slug}>
                            <Link
                                to={useCasePath(useCase.slug)}
                                className="flex flex-col h-full bg-card-bg border border-border-card rounded-card shadow-card
                                    overflow-hidden no-underline hover:border-accent-dark transition-colors ease-in duration-150"
                            >
                                <img
                                    src={useCase.heroImage}
                                    alt={useCase.heroAlt}
                                    className="w-full aspect-[2/1] object-cover"
                                />
                                <div className="p-4">
                                    <h2 className="text-base font-bold text-ink tracking-tight mb-1 font-display">
                                        {useCase.title}
                                    </h2>
                                    <p className="text-xs tablet-landscape:text-sm text-ink-mid leading-relaxed">
                                        {useCase.summary}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    )
}

export default UseCasesList

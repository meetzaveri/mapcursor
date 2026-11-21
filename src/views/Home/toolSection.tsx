import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import routes from '../../routes'

export interface ToolSpec {
    label: string
    value: string
}

export interface ToolSectionProps {
    id: string
    index: string
    mark: ReactNode
    title: string
    body: string
    specs: readonly ToolSpec[]
    image: string
    imageAlt: string
    overlays: ReactNode
    reverse?: boolean
}

const ToolSection = ({
    id,
    index,
    mark,
    title,
    body,
    specs,
    image,
    imageAlt,
    overlays,
    reverse = false,
}: ToolSectionProps): ReactElement => (
    <section
        id={id}
        className="bg-sidebar border border-border-panel rounded-panel overflow-hidden scroll-mt-6"
    >
        <div
            className={`grid grid-cols-1 laptop:grid-cols-[2fr_3fr] gap-8 laptop:gap-12 p-6 tablet-landscape:p-10 desktop:p-14 items-center ${
                reverse ? 'laptop:[&>*:first-child]:order-2' : ''
            }`}
        >
            <div className="text-left">
                {mark}
                <div className="mt-4 font-mono text-xs text-ink-muted tracking-wide">
                    {index}
                </div>
                <h3 className="mt-1 text-2xl desktop:text-4xl font-bold text-ink tracking-tight font-display">
                    {title}
                </h3>
                <p className="mt-4 text-sm desktop:text-lg text-ink-mid leading-relaxed max-w-md">
                    {body}
                </p>

                <dl className="mt-6 max-w-md border-t border-border-panel">
                    {specs.map((spec) => (
                        <div
                            key={spec.label}
                            className="grid grid-cols-[112px_1fr] gap-3 py-2 border-b border-border-panel text-xs"
                        >
                            <dt className="font-mono uppercase tracking-wide text-ink-muted">
                                {spec.label}
                            </dt>
                            <dd className="text-ink">{spec.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="relative laptop:py-10">
                <img
                    src={image}
                    alt={imageAlt}
                    loading="lazy"
                    className="w-full h-auto rounded-card border border-border-panel shadow-card bg-card-bg"
                />
                <div className="hidden laptop:block">{overlays}</div>
            </div>
        </div>
    </section>
)

export default ToolSection

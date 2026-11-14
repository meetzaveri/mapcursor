import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LogoSVG from '../../assets/favicon-indigo-bg.svg'
import RightArrowWhiteSVG from '../../assets/right_arrow_white.svg'
import heroImage from '../../assets/home-page-hero.png'
import Button from '../../components/common/button'
import routes from '../../routes'
import ToolSection from './toolSection'
import { TOOLS } from './tools'

const HomePage: React.FC = () => {
    const navigate = useNavigate()

    const onCreateCanvas = (): void => {
        navigate(routes.index)
    }

    return (
        <div className="home-page-container relative bg-canvas text-left">
            <nav className="flex items-center w-full px-5 py-1 lg:py-2 2xl:py-4 bg-sidebar border-b border-border-panel">
                <div className="w-1/2 flex items-center">
                    <img
                        src={LogoSVG}
                        alt="Mapcursor"
                        className="w-7 h-7 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10"
                    />
                    <div className="pl-2 text-ink text-base lg:text-xl 2xl:text-2xl font-bold font-display">
                        mapcursor
                    </div>
                    <div className="hidden tablet:block text-ink-muted pl-2 text-sm whitespace-nowrap">
                        (Beta version)
                    </div>
                </div>

                <div className="pl-5 w-1/2 flex items-center justify-end gap-4">
                    <Link
                        to={routes.useCases}
                        className="hidden tablet:inline text-sm font-medium text-ink-mid hover:text-ink no-underline"
                    >
                        Use cases
                    </Link>
                    <Button
                        intent="primary"
                        size="medium"
                        name="create_canvas"
                        label="New Map"
                        onClick={onCreateCanvas}
                        extendClass="font-semibold whitespace-nowrap shadow-card hover:shadow-card-accent"
                    />
                </div>
            </nav>

            <main className="px-5 tablet-landscape:px-10 desktop:px-20 big-desktop:px-32 ultra-desktop:px-40">
                {/* Hero */}
                <header className="mt-16 desktop:mt-24 max-w-3xl">
                    <div className="font-mono text-xs text-ink-muted uppercase tracking-wider">
                        Local · No sign-up/login
                    </div>
                    <h1 className="mt-3 text-3xl desktop:text-5xl font-bold text-ink tracking-tight font-display">
                        Draw and annotate on maps.
                    </h1>
                    <p className="mt-5 text-sm lg:text-lg 2xl:text-xl text-ink-mid leading-relaxed">
                        Pick and draw route, area (polygon), radius map or
                        points to describe objects on map. Everything stays on
                        your machine until you choose to share the map.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                        <Button
                            intent="primary"
                            name="start_now"
                            size="large"
                            onClick={onCreateCanvas}
                            extendClass="font-semibold primary-btn-home shadow-card hover:shadow-card-accent"
                        >
                            <div className="flex items-center">
                                <span>Start on a map</span>
                                <img
                                    className="ml-2 home-arrow-icon w-6 h-6"
                                    src={RightArrowWhiteSVG}
                                    alt=""
                                />
                            </div>
                        </Button>
                    </div>

                    {/* Tool index */}
                    <ul className="mt-10 flex flex-wrap gap-2">
                        {TOOLS.map((tool) => (
                            <li key={tool.id}>
                                <a
                                    href={`#${tool.id}`}
                                    className="inline-flex items-center gap-2 bg-card-bg border border-border-panel rounded-pill
                                        px-3 py-1.5 text-xs text-ink no-underline shadow-card hover:border-accent transition-colors"
                                >
                                    <span className="font-mono text-ink-muted">
                                        {tool.index.split(' / ')[0]}
                                    </span>
                                    {tool.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </header>

                {/* Hero image: the editor itself, mid-edit. Same frame as the
                    tool demos below. Not lazy: it is the first thing on the
                    page past the intro. width/height reserve its box so the
                    page does not jump when it arrives. */}
                <figure className="mt-12 desktop:mt-16">
                    <img
                        src={heroImage}
                        alt="Mapcursor editing a map of Andheri and Powai, Mumbai: metro lines drawn as routes, residential and industrial clusters marked as areas, with the area styling panel, legend and properties panels open"
                        width={2862}
                        height={1428}
                        className="w-full h-auto rounded-card border border-border-panel shadow-card bg-card-bg"
                    />
                </figure>

                {/* Tools */}
                <div className="mt-20 desktop:mt-28">
                    <div className="mb-8">
                        <div className="font-mono text-xs text-ink-muted uppercase tracking-wider">
                            Tools
                        </div>
                        <h2 className="mt-2 text-2xl desktop:text-3xl font-bold text-ink tracking-tight font-display">
                            Sketch the map you need
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm desktop:text-base text-ink-mid leading-relaxed">
                            Pick a tool, set up a legend and draw a small map
                            for one job. A road trip you want to remember. A
                            cluster map of a neighborhood. A marathon route you
                            are planning.
                        </p>
                    </div>
                    <div className="flex flex-col gap-6 desktop:gap-8">
                        {TOOLS.map((tool) => (
                            <ToolSection key={tool.id} {...tool} />
                        ))}
                    </div>
                </div>

                {/* Closing CTA */}
                <section className="my-20 desktop:my-28 bg-card-bg border border-border-panel rounded-panel shadow-card p-8 desktop:p-12 flex flex-col laptop:flex-row laptop:items-center laptop:justify-between gap-6">
                    <div>
                        <h2 className="text-xl desktop:text-2xl font-bold text-ink tracking-tight font-display">
                            Open a map and start drawing
                        </h2>
                        <p className="mt-2 text-sm desktop:text-base text-ink-mid">
                            No account. See how people use it in{' '}
                            <Link
                                to={routes.useCases}
                                className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                            >
                                use cases
                            </Link>
                            .
                        </p>
                    </div>
                    <Button
                        intent="primary"
                        name="start_bottom"
                        size="large"
                        label="Start on a map"
                        onClick={onCreateCanvas}
                        extendClass="font-semibold shadow-card hover:shadow-card-accent"
                    />
                </section>
            </main>

            <footer className="w-full px-10 2xl:px-20 bg-sidebar border-t border-border-panel h-20 flex items-center justify-between">
                <div className="text-sm big-desktop:text-base text-ink-mid">
                    © 2026 Mapcursor. All rights reserved.
                </div>
            </footer>
        </div>
    )
}

export default HomePage

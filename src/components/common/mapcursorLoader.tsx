import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import './mapcursorLoader.css'

interface MapcursorLoaderProps {
    caption?: string
}

const ROUTE_D = 'M70,75 L105,75 Q115,75 115,85 L115,115 L140,115'
const ROUTE_LENGTH = 106.231

const CYCLE_MS = 2800

const HANDOFF_GRACE_MS = 250

let cycleOrigin: number | null = null
let lastUnmountedAt = 0

const bootElapsed = (): number => {
    try {
        const boot = document.querySelector('#mc-boot .mc-cursor')
        const running = boot?.getAnimations?.()[0]
        const elapsed = running?.currentTime
        if (typeof elapsed === 'number' && elapsed > 0) return elapsed
    } catch {
    }
    return 0
}

const routePhase = (): string => {
    const now = performance.now()
    const handingOver =
        cycleOrigin !== null &&
        (document.querySelector('#mc-boot, .mc-loader') !== null ||
            now - lastUnmountedAt <= HANDOFF_GRACE_MS)
    if (!handingOver) cycleOrigin = now - bootElapsed()
    const elapsed = (now - (cycleOrigin ?? now)) % CYCLE_MS
    return `-${(elapsed / 1000).toFixed(3)}s`
}

const MapcursorLoader = ({
    caption = 'setting up your map',
}: MapcursorLoaderProps): ReactElement => {
    const [phase] = useState(routePhase)

    useEffect(
        () => () => {
            lastUnmountedAt = performance.now()
        },
        []
    )

    const timing = {
        '--mc-phase': phase,
        '--mc-route-path': `path('${ROUTE_D}')`,
    } as CSSProperties

    return (
        <div
            className="mc-loader"
            role="status"
            aria-label="Loading Mapcursor"
            style={timing}
        >
            <svg className="mc-mark" viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                    <mask
                        id="mc-loader-route-mask"
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="200"
                        height="200"
                    >
                        <path
                            className="mc-route-wipe"
                            d={ROUTE_D}
                            stroke="#FFFFFF"
                            strokeWidth={6}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${ROUTE_LENGTH} ${ROUTE_LENGTH}`}
                        />
                    </mask>
                </defs>

                <g
                    className="mc-map"
                    transform="translate(-4213.726,-7162.326) scale(2.0)"
                >
                        <g transform="matrix(1 0 0 1 2135 3634)">
                            <g transform="matrix(1 0 0 1 1 -21)">
                                <path d="M 0.178307 0.696819 L 0.178307 38.575825 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 42 -21)">
                                <path d="M 0.251929 0.240445 L 0.251929 2.40822 L 0.251929 6.743769 L 0.251929 13.247092 L 0.251929 21.91819 L 0.223405 28.621177 L 0.166359 33.356053 L 0.080789 36.122817 L -0.033305 36.921471 L -0.118875 37.520461 L -0.175922 37.919788 L -0.204445 38.119452 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 13 -20)">
                                <path d="M 0.956767 0.609566 L 0.956767 36.663078 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 29 -20)">
                                <path d="M 0.473469 0.153192 L 0.473469 35.750331 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 1 -21)">
                                <path d="M 0.656862 0.064973 L 12.561257 -5.674646 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 14 -27)">
                                <path d="M 0.161571 0.112776 L 0.661571 0.112776 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 15 -27)">
                                <path d="M 0.687042 0.112776 L 0.873048 0.152634 L 1.245061 0.232351 L 1.803079 0.351926 L 2.547104 0.51136 L 3.649855 0.923231 L 5.111332 1.587539 L 6.931535 2.504284 L 9.110465 3.673465 L 10.943954 4.616782 L 12.432004 5.334235 L 13.574613 5.825823 L 14.371782 6.091546 L 14.969659 6.290838 L 15.368244 6.4237 L 15.567536 6.49013 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 30 -21)">
                                <path d="M 0.354958 0.702709 L 12.471932 -3.761439 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 42 -25)">
                                <path d="M 0.471932 0.451139 L 0.471932 3.639816 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 2 21)">
                                <path d="M 0.719754 0.155514 L 11.773836 -3.883477 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 14 16)">
                                <path d="M 0.62415 0.691366 L 1.089165 0.771083 L 2.019196 0.930517 L 3.414242 1.169668 L 5.274304 1.488536 L 7.041363 1.847262 L 8.715418 2.245846 L 10.296471 2.68429 L 11.78452 3.162591 L 12.900557 3.521317 L 13.644582 3.760468 L 14.016594 3.880044 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 29 20)">
                                <path d="M 0.929801 0.517779 L 13.046775 -2.883477 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 29 16)">
                                <path d="M 0.292065 0.053631 L 0.292065 4.092622 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 1 17)">
                                <path d="M 0.231705 0.329102 L 0.231705 3.517779 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                            <g transform="matrix(1 0 0 1 14 -26)">
                                <path d="M 0.009414 0.586915 L 0.009414 7.178233 " fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                            </g>
                        </g>
                </g>

                <g className="mc-route">
                    <path
                        className="mc-route-line"
                        d={ROUTE_D}
                        stroke="#6965db"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeDasharray="1,5.5"
                        fill="none"
                        mask="url(#mc-loader-route-mask)"
                    />
                    <g className="mc-cursor">
                        <g transform="scale(0.34) translate(21.4375,-3.1875)">
                                <g transform="matrix(1 0 0 1 -30 -5)">
                                    <path d="M 0.963939 3.526349 L 0.963939 4.486442 L 0.963939 6.406629 L 0.963939 9.28691 L 0.963939 13.127284 L 0.872501 16.55619 L 0.689626 19.573627 L 0.415314 22.179595 L 0.049564 24.374095 L -0.453342 23.962626 L -1.093405 20.945189 L -1.870623 15.321784 L -2.784998 7.092411 L -3.287904 0.646068 L -3.379342 -4.017244 L -3.059311 -6.897524 L -2.327811 -7.994774 L -0.087592 -7.126118 L 3.661344 -4.291556 L 8.919 0.508912 L 15.685373 7.275286 L 19.525748 11.572847 L 20.440123 13.401597 L 18.428498 12.761535 L 13.490874 9.65266 L 9.787656 7.321004 L 7.318844 5.766567 L 6.084438 4.989348 " fill="none" strokeWidth="13.890796957060644" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4"/>
                                </g>
                        </g>
                    </g>
                </g>
            </svg>
            <div className="mc-wordmark">Mapcursor</div>
            {caption ? <div className="mc-caption">{caption}</div> : null}
        </div>
    )
}

export default MapcursorLoader

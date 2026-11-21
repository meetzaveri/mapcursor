import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import './chromeReveal.css'

const BASE_DELAY_MS = 200
const STAGGER_MS = 110
const DURATION_MS = 600
const SLIDE_PX = 10

type Phase = 'pending' | 'active' | 'done'

interface ChromeRevealProps {
    shown: boolean
    /** Position in the entrance sequence; each step waits STAGGER_MS longer. */
    order: number
    from?: 'top' | 'bottom'
    /** Animate grandchildren, for roots that only wrap fixed elements. */
    deep?: boolean
    children: ReactNode
}

const ChromeReveal = ({
    shown,
    order,
    from = 'top',
    deep = false,
    children,
}: ChromeRevealProps): ReactElement => {
    const [phase, setPhase] = useState<Phase>('pending')
    const delay = BASE_DELAY_MS + order * STAGGER_MS

    useEffect(() => {
        if (!shown) return
        setPhase('active')
        const timer = window.setTimeout(
            () => setPhase('done'),
            delay + DURATION_MS
        )
        return (): void => window.clearTimeout(timer)
    }, [shown, delay])

    const className = [
        phase === 'pending' && 'mc-reveal-pending',
        phase === 'active' && 'mc-reveal-active',
        deep && 'mc-reveal--deep',
    ]
        .filter(Boolean)
        .join(' ')

    const style = {
        '--mc-reveal-delay': `${delay}ms`,
        '--mc-reveal-dy': `${from === 'top' ? -SLIDE_PX : SLIDE_PX}px`,
    } as CSSProperties

    return (
        <div className={className} style={style}>
            {children}
        </div>
    )
}

export default ChromeReveal

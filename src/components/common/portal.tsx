import React from 'react'
import ReactDOM from 'react-dom'
import type { ReactNode, ReactPortal } from 'react'

interface PortalProps {
    children: ReactNode
    parent?: HTMLElement | null
    className?: string
}

export default function Portal({
    children,
    parent,
    className,
}: PortalProps): ReactPortal {
    const el = React.useMemo(() => document.createElement('div'), [])
    // Layout effect, not a plain effect: the container must be in the document
    // before any PARENT layout effect runs. Tooltip measures its bubble in a
    // useLayoutEffect, and a child's layout effects run before its parent's,
    // so this attaches first. With useEffect the bubble was measured while
    // detached (0×0), which left every tooltip off-centre and overlapping its
    // trigger.
    React.useLayoutEffect(() => {
        const target = parent ?? document.body
        const classList = ['portal-container']
        if (className)
            className.split(' ').forEach((item) => classList.push(item))
        classList.forEach((item) => el.classList.add(item))
        target.appendChild(el)
        return (): void => {
            target.removeChild(el)
        }
    }, [el, parent, className])
    return ReactDOM.createPortal(children, el)
}

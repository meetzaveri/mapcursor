import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ComponentType, ReactElement, SVGProps } from 'react'

export type DropdownIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface DropdownOption<T extends string> {
    value: T
    label: string
    icon?: DropdownIcon
    description?: string
    disabled?: boolean
    badge?: string
}

interface DropdownProps<T extends string> {
    value: T
    options: readonly DropdownOption<T>[]
    onChange: (value: T) => void
    triggerIcon?: DropdownIcon
    triggerLabel?: string
    hideTriggerLabel?: boolean
    align?: 'left' | 'right'
    placement?: 'bottom' | 'top'
    disabled?: boolean
    ariaLabel?: string
    className?: string
    triggerClassName?: string
    panelMinWidth?: number
}

const PANEL_GAP = 6

const Chevron = ({ open }: { open: boolean }): ReactElement => (
    <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 transition-transform duration-200 ease-in-out ${
            open ? 'rotate-180' : ''
        }`}
    >
        <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const Check = (): ReactElement => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M2.5 6.5L4.8 8.8L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

function Dropdown<T extends string>({
    value,
    options,
    onChange,
    triggerIcon: TriggerIcon,
    triggerLabel,
    hideTriggerLabel = false,
    align = 'left',
    placement = 'bottom',
    disabled = false,
    ariaLabel,
    className = '',
    triggerClassName = 'h-9 px-2',
    panelMinWidth = 200,
}: DropdownProps<T>): ReactElement {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const listboxId = useId()

    const selected = options.find((o) => o.value === value)
    const label = triggerLabel ?? selected?.label ?? ''
    const SelectedIcon = selected?.icon
    const HeadIcon = TriggerIcon ?? SelectedIcon

    const close = useCallback((): void => {
        setOpen(false)
        setActiveIndex(-1)
    }, [])

    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: MouseEvent): void => {
            if (rootRef.current?.contains(e.target as Node)) return
            close()
        }
        document.addEventListener('mousedown', onPointerDown)
        return (): void =>
            document.removeEventListener('mousedown', onPointerDown)
    }, [open, close])

    const commit = (option: DropdownOption<T>): void => {
        if (option.disabled) return
        close()
        if (option.value !== value) onChange(option.value)
    }

    const step = (from: number, delta: number): number => {
        const n = options.length
        for (let i = 1; i <= n; i++) {
            const next = (from + delta * i + n * n) % n
            if (!options[next]?.disabled) return next
        }
        return from
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (disabled) return
        switch (e.key) {
            case 'Escape':
                if (!open) return
                e.stopPropagation()
                close()
                break
            case 'ArrowDown':
            case 'ArrowUp': {
                e.preventDefault()
                if (!open) {
                    setOpen(true)
                    setActiveIndex(
                        Math.max(
                            0,
                            options.findIndex((o) => o.value === value)
                        )
                    )
                    return
                }
                setActiveIndex((i) =>
                    step(i < 0 ? 0 : i, e.key === 'ArrowDown' ? 1 : -1)
                )
                break
            }
            case 'Enter':
            case ' ': {
                e.preventDefault()
                if (!open) {
                    setOpen(true)
                    setActiveIndex(
                        Math.max(
                            0,
                            options.findIndex((o) => o.value === value)
                        )
                    )
                    return
                }
                const option = options[activeIndex]
                if (option) commit(option)
                break
            }
            default:
                break
        }
    }

    return (
        <div
            ref={rootRef}
            className={`relative ${className}`}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-label={ariaLabel ?? label}
                onClick={(): void => {
                    if (disabled) return
                    setOpen((prev) => !prev)
                    setActiveIndex(-1)
                }}
                className={`
                    flex items-center gap-1.5 rounded text-xs font-medium text-left
                    cursor-pointer transition-all ease-in-out duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${triggerClassName}
                    ${open ? 'bg-accent/10 text-accent-dark ring-1 ring-accent/30' : 'text-ink-mid hover:bg-sidebar hover:text-ink'}
                `}
            >
                {HeadIcon && (
                    <HeadIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                {!hideTriggerLabel && (
                    <span className="whitespace-nowrap">{label}</span>
                )}
                <Chevron open={open} />
            </button>

            {open && (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-activedescendant={
                        activeIndex >= 0
                            ? `${listboxId}-${activeIndex}`
                            : undefined
                    }
                    className="absolute bg-card-bg border border-border-panel rounded-lg
                        shadow-lg py-1 w-max max-w-[calc(100vw-20px)] z-20 text-left"
                    style={{
                        minWidth: panelMinWidth,
                        ...(align === 'left' ? { left: 0 } : { right: 0 }),
                        ...(placement === 'bottom'
                            ? { top: `calc(100% + ${PANEL_GAP}px)` }
                            : { bottom: `calc(100% + ${PANEL_GAP}px)` }),
                    }}
                >
                    {options.map((option, index) => {
                        const OptionIcon = option.icon
                        const isSelected = option.value === value
                        const isActive = index === activeIndex
                        return (
                            <div
                                key={option.value}
                                id={`${listboxId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={option.disabled || undefined}
                                onClick={(): void => commit(option)}
                                onMouseEnter={(): void =>
                                    setActiveIndex(option.disabled ? -1 : index)
                                }
                                className={`
                                    flex items-center gap-2.5 px-3 py-2 mx-1 rounded text-sm
                                    transition-colors ease-in-out duration-150
                                    ${
                                        option.disabled
                                            ? 'opacity-40 cursor-not-allowed text-ink-mid'
                                            : `cursor-pointer ${
                                                  isSelected
                                                      ? 'text-ink'
                                                      : 'text-ink-mid'
                                              } ${isActive ? 'bg-accent/10' : ''}`
                                    }
                                `}
                            >
                                {OptionIcon && (
                                    <OptionIcon
                                        className="w-4 h-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="whitespace-nowrap">
                                        {option.label}
                                    </span>
                                    {option.description && (
                                        <span className="text-xs text-ink-muted whitespace-nowrap">
                                            {option.description}
                                        </span>
                                    )}
                                </div>
                                {option.badge && (
                                    <span
                                        className="shrink-0 text-[10px] leading-none uppercase tracking-wide
                                            px-1.5 py-1 rounded border border-border-panel text-ink-muted"
                                    >
                                        {option.badge}
                                    </span>
                                )}
                                <span
                                    className={`shrink-0 w-3 text-ink ${
                                        isSelected ? '' : 'invisible'
                                    }`}
                                >
                                    <Check />
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Dropdown

import type { ReactElement } from 'react'

interface ApplyPresetButtonProps {
    presetName: string
    isApplied: boolean
    onApply: () => void
}

export default function ApplyPresetButton({
    presetName,
    isApplied,
    onApply,
}: ApplyPresetButtonProps): ReactElement {
    return (
        <button
            type="button"
            aria-label={
                isApplied
                    ? `${presetName} is applied to the selection`
                    : `Apply ${presetName} to the selection`
            }
            disabled={isApplied}
            onClick={onApply}
            className={`h-6 px-2 rounded text-[11px] shrink-0 transition-colors duration-150 ${
                isApplied
                    ? 'text-ink-muted cursor-default'
                    : 'text-white bg-accent hover:bg-accent-dark cursor-pointer'
            }`}
        >
            {isApplied ? 'Applied' : 'Apply'}
        </button>
    )
}

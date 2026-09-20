// The legend on a phone.
//
// Same list, same wizard, different container — exactly the split place search
// already uses (`placeSearch.tsx` / `placeSearchModal.tsx`), and for the same
// reason: a phone's top-right corner is the share button and nothing else, so
// the pinned panel has nowhere to live. Reached from the hamburger menu.

import type { ReactElement } from 'react'

import Modal from '../common/modal'
import { useBaseContext } from '../../views/Base/baseContext'
import { LegendList, useLegendWizard } from './legendPanel'
import LegendPresetWizard from './legendPresetWizard'

interface LegendPanelModalProps {
    open: boolean
    onClose: () => void
}

export default function LegendPanelModal({
    open,
    onClose,
}: LegendPanelModalProps): ReactElement {
    const { legendPresets, legendPresetCounts, deleteLegendPreset } =
        useBaseContext()
    const wizard = useLegendWizard()

    return (
        <>
            {/* Closed while the wizard is up: two stacked modals would put the
                list's backdrop over the wizard's own controls. */}
            <Modal open={open && !wizard.wizardOpen} onClose={onClose}>
                <div
                    style={{
                        minWidth: 'min(320px, calc(100vw - 96px))',
                        maxWidth: '420px',
                    }}
                >
                    <h2 className="text-base font-semibold text-ink mb-1">
                        Legend
                    </h2>
                    <p className="text-xs text-ink-muted mb-3">
                        What the colours on this map mean.
                    </p>
                    <div className="border border-border-panel rounded-card overflow-hidden">
                        <LegendList
                            presets={legendPresets}
                            counts={legendPresetCounts}
                            onCreate={wizard.openCreate}
                            onEdit={wizard.openEdit}
                            onDelete={deleteLegendPreset}
                        />
                    </div>
                </div>
            </Modal>

            <LegendPresetWizard
                open={wizard.wizardOpen}
                editing={wizard.editing}
                onClose={wizard.close}
                onSave={wizard.save}
            />
        </>
    )
}

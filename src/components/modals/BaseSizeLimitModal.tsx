import type { ReactElement } from 'react'
import Modal from '../common/modal'
import Button from '../common/button'
import {
    MAX_DRAFT_BYTES,
    MAX_DRAFT_UTF8_BYTES,
} from '../../utils/baseSizeGuard'

const loadBudgetMb = Math.round(MAX_DRAFT_BYTES / (1024 * 1024))
const writeBudgetMb = Math.round(MAX_DRAFT_UTF8_BYTES / (1024 * 1024))

interface BaseFullModalProps {
    open: boolean
    onClose: () => void
    onExport: () => void
}

export function BaseFullModal({
    open,
    onClose,
    onExport,
}: BaseFullModalProps): ReactElement {
    return (
        <Modal open={open} onClose={onClose} locked={false}>
            <div className="p-4" style={{ minWidth: 'min(400px, calc(100vw - 96px))' }}>
                <h2 className="text-lg font-semibold mb-2">Canvas is full</h2>
                <p className="text-sm text-neutrals-n700 mb-4">
                    This canvas reached the ~{writeBudgetMb} MB size limit, so your
                    last change was undone to keep it stable and loadable.
                    Export it to a file if you want to keep building on it
                    elsewhere.
                </p>
                <div className="flex gap-2">
                    <Button
                        intent="primary"
                        size="medium"
                        label="Export as JSON"
                        onClick={onExport}
                    />
                    <Button
                        intent="secondary"
                        size="medium"
                        label="Got it"
                        onClick={onClose}
                    />
                </div>
            </div>
        </Modal>
    )
}

interface BaseTooLargeModalProps {
    open: boolean
    onDownloadBackup: () => void
    onStartFresh: () => void
    onOpenAnyway: () => void
}

export function BaseTooLargeModal({
    open,
    onDownloadBackup,
    onStartFresh,
    onOpenAnyway,
}: BaseTooLargeModalProps): ReactElement {
    return (
        <Modal open={open} onClose={() => {}} locked>
            <div className="p-4" style={{ minWidth: 'min(400px, calc(100vw - 96px))' }}>
                <h2 className="text-lg font-semibold mb-2">
                    This canvas is too large to open
                </h2>
                <p className="text-sm text-neutrals-n700 mb-4">
                    It exceeds the ~{loadBudgetMb} MB limit and opening it may
                    freeze the page. Download a backup of your work first, then
                    start with a fresh canvas.
                </p>
                <div className="flex gap-2">
                    <Button
                        intent="primary"
                        size="medium"
                        label="Download backup"
                        onClick={onDownloadBackup}
                    />
                    <Button
                        intent="secondary"
                        size="medium"
                        label="Start fresh"
                        onClick={onStartFresh}
                    />
                </div>
                <button
                    className="mt-3 text-xs text-neutrals-n700 underline hover:text-ink"
                    onClick={onOpenAnyway}
                >
                    Open anyway (may freeze)
                </button>
            </div>
        </Modal>
    )
}

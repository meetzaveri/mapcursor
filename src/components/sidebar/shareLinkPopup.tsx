import { useRef, useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import Button from '../common/button'
import Modal from '../common/modal'
import ShareIcon from '../../assets/share-android.svg?react'
import CopyIcon from '../../assets/copy.svg'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { baseUrl } from '../../utils/baseRoutes'
import { trackEvent } from '../../utils/analytics'
import { SHARE_BUTTON_ID } from './shapesToolbarId'
import ShareImagesNote from './shareImagesNote'
import { IMAGE_COMPONENT } from '../../constants/misc'
import { RIGHT_MARGIN } from '../../hooks/useTopRightOffset'

const SHARE_ROW_INSET_PX = 24

const ShareLinkPopup = (): ReactElement => {
    const refNode = useRef<HTMLDivElement | null>(null)
    const [showLink, setShowLink] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isPersisting, setIsPersisting] = useState(false)
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const {
        isPersisted,
        shareBase,
        baseId,
        backdropReady,
        stateRefForComponentStore,
        meta,
    } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    const storeValues = Object.values(stateRefForComponentStore.current)
    const hasComponents = storeValues.some(
        (c) => c?.componentType && c.componentType !== IMAGE_COMPONENT
    )
    const hasImages = storeValues.some(
        (c) => c?.componentType === IMAGE_COMPONENT
    )
    const imagePropertyNames = isPersisted
        ? []
        : meta.metaProperties
              .filter((p) => p.type === 'image')
              .map((p) => p.name)

    useEffect(() => {
        const handleClick = (e: MouseEvent): void => {
            if (refNode.current?.contains(e.target as Node)) return
            setShowLink(false)
        }
        document.addEventListener('mousedown', handleClick, false)
        return (): void => {
            document.removeEventListener('mousedown', handleClick, false)
        }
    }, [])

    const handleShareClick = (e: React.MouseEvent): void => {
        e.preventDefault()
        if (showLink) {
            setShowLink(false)
            return
        }
        trackEvent('share_clicked', { persisted: isPersisted })
        setShowConfirmModal(true)
    }

    const handleConfirmShare = async (): Promise<void> => {
        setIsPersisting(true)
        try {
            const wasPersisted = isPersisted
            const serverBaseId = await shareBase()
            trackEvent('share_succeeded', {
                persisted: wasPersisted,
                elements: Object.values(
                    stateRefForComponentStore.current
                ).filter((c) => c?.componentType).length,
            })
            const url = baseUrl(serverBaseId)
            setShareUrl(url)
            setShowConfirmModal(false)
            setShowLink(true)

            if (wasPersisted) return

            const openUrl = url

            if (isMobile) {
                void navigator?.share?.({ url }).catch(() => {})
                return
            }
            window.open(openUrl, '_blank', 'noopener,noreferrer')
        } catch (e) {
            trackEvent('share_failed', {
                reason: e instanceof Error ? e.name : 'unknown',
            })
            throw e
        } finally {
            setIsPersisting(false)
        }
    }

    const previewUrl = isPersisted ? baseUrl(baseId) : `${baseUrl('')}...`

    return (
        <>
            <div
                className="relative "
                ref={refNode}
                style={{
                    right: `${isMobile ? -SHARE_ROW_INSET_PX + RIGHT_MARGIN : -9}px`,
                }}
            >
                <div
                    id={SHARE_BUTTON_ID}
                    className={`border-border-panel border flex items-center justify-center bg-card-bg text-ink font-semibold ${
                        isMobile
                            ? 'w-10 h-10 rounded-lg shadow-panel'
                            : 'px-1 py-1 rounded-md'
                    }`}
                    style={{
                        cursor: backdropReady ? 'pointer' : 'progress',
                        opacity: backdropReady ? 1 : 0.6,
                    }}
                    title={backdropReady ? 'Share' : 'Preparing the map\u2026'}
                    onClick={backdropReady ? handleShareClick : undefined}
                >
                    <div
                        className={`hover:bg-sidebar rounded-md ${isMobile ? 'p-0' : 'px-2 py-2'}`}
                    >
                        <ShareIcon
                            width={20}
                            height={20}
                            strokeWidth={1.5}
                            stroke="currentColor"
                        />
                    </div>
                </div>

                <div
                    className="absolute top-12 right-0 transition-all ease-in duration-200"
                    style={{
                        opacity: showLink ? 1 : 0,
                        zIndex: showLink ? 1 : -1,
                    }}
                >
                    <div
                        className="
                        bg-card-bg text-ink-mid border border-border-panel
                        rounded-md px-2 py-4
                        "
                        style={{ width: 'min(560px, calc(100vw - 24px))' }}
                    >
                        <div className="text-base text-left">
                            Canvas Link (Public)
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm rounded-md bg-sidebar border border-border-card text-ink px-2 py-2 select-text cursor-text break-all">
                                {shareUrl}
                            </div>
                            <div
                                className="ml-2 rounded-md
                                px-2 py-2 cursor-pointer bg-sidebar border border-border-card
                                hover:bg-border-panel
                                "
                                onClick={(e): void => {
                                    e.stopPropagation()
                                    if (shareUrl) {
                                        navigator?.clipboard?.writeText(
                                            shareUrl
                                        )
                                    }
                                    setShowLink(false)
                                }}
                            >
                                <img
                                    src={CopyIcon}
                                    className="w-5 h-5 "
                                    alt="Copy"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={showConfirmModal}
                onClose={(): void => {
                    if (!isPersisting) setShowConfirmModal(false)
                }}
                locked={isPersisting}
            >
                <div
                    style={{
                        minWidth: 'min(440px, calc(100vw - 96px))',
                        maxWidth: '520px',
                    }}
                >
                    {hasComponents ? (
                        <>
                            <h2 className="text-lg font-semibold mb-3 font-display">
                                Share this canvas
                            </h2>
                            <ShareImagesNote
                                hasImageElements={hasImages}
                                imagePropertyNames={imagePropertyNames}
                            />
                            <p className="text-sm text-ink-mid mb-2">
                                We'll generate a unique canvas link so you can
                                share your work with others.
                            </p>
                            <p className="text-sm text-ink-mid mb-4">
                                This canvas will be visible to anyone you share
                                the link with. Your shareable URL will be:
                            </p>
                            <div className="text-sm rounded-md bg-sidebar border border-border-card text-ink px-3 py-2 mb-4 break-all">
                                {previewUrl}
                            </div>
                            <p className="text-sm text-ink-mid mb-4">
                                Would you like to proceed?
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    intent="secondary"
                                    size="medium"
                                    label="Cancel"
                                    onClick={(): void =>
                                        setShowConfirmModal(false)
                                    }
                                    disabled={isPersisting}
                                />
                                <Button
                                    intent="primary"
                                    size="medium"
                                    label="Yes, share"
                                    onClick={handleConfirmShare}
                                    loading={isPersisting}
                                    disabled={isPersisting}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold mb-3 font-display">
                                Nothing to share yet
                            </h2>
                            <p className="text-sm text-ink-mid mb-4">
                                Before you share, please create something on the
                                canvas to make it shareable.
                            </p>
                            {hasImages && (
                                <p className="text-sm text-ink-mid mb-4">
                                    Images can't be shared yet, so a canvas with
                                    only images has nothing to share.
                                </p>
                            )}
                            <div className="flex justify-end">
                                <Button
                                    intent="primary"
                                    size="medium"
                                    label="Okay"
                                    onClick={(): void =>
                                        setShowConfirmModal(false)
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </>
    )
}

export default ShareLinkPopup

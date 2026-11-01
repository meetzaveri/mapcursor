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

// The share row in primary.tsx sits `right-1rem` with `px-2`, so the button's
// natural right edge is 24px in. On mobile it is pulled out to RIGHT_MARGIN so
// it lines up with the other right-edge buttons (styling, legend, meta
// properties) in one column.
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

    // Whether there's anything to share. Gate on the actual component store,
    // NOT backgroundBaseId: that id is only minted by ensureBackgroundBase()
    // on a user *mutation*, so a draft restored from localStorage renders
    // components on the base while backgroundBaseId is still null — which
    // wrongly showed "Nothing to share yet" until the user touched the canvas.
    // Mirror persistBase's filter (entries without componentType are skipped
    // there) so the two stay consistent. Images are dropped from the shared
    // copy too (local-only), so they don't count as shareable on their own.
    const storeValues = Object.values(stateRefForComponentStore.current)
    const hasComponents = storeValues.some(
        (c) => c?.componentType && c.componentType !== IMAGE_COMPONENT
    )
    const hasImages = storeValues.some(
        (c) => c?.componentType === IMAGE_COMPONENT
    )
    // `image` meta properties are left behind on share, with their photos.
    // Only a local canvas can have them (a shared one refuses to create them).
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

    // Always route through the confirm modal, including for an already-persisted
    // base. The old short-circuit just copied the URL and never published, so a
    // base that reached its URL by any path other than this button (the
    // storage-limit auto-persist, most reachably) had its link handed out while
    // it was still private.
    const handleShareClick = (e: React.MouseEvent): void => {
        e.preventDefault()
        if (showLink) {
            setShowLink(false)
            return
        }
        // Intent, not outcome. The gap between this and `share_succeeded` is
        // how many people open the dialog and back out of it, which is a
        // different problem from never reaching for share at all.
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

            // Already on this base — there is nothing to open.
            if (wasPersisted) return

            // The landing view rides in the base row, which is
            // device-independent and survives a copied link. The old vx/vy/vs
            // params were neither, and would only race the better mechanism.
            const openUrl = url

            // Mobile browsers block window.open after an await (the click's task
            // chain is long gone), so the user would get a link panel and no tab
            // — or nothing at all. Hand them the OS share sheet instead, which
            // is the affordance they expect on a phone anyway.
            if (isMobile) {
                void navigator
                    ?.share?.({ url })
                    // Dismissing the sheet rejects; the link panel is already
                    // open behind it, so there is nothing to recover from.
                    .catch(() => {})
                return
            }
            window.open(openUrl, '_blank', 'noopener,noreferrer')
        } catch (e) {
            // Re-thrown, not swallowed: this only observes the failure, it
            // does not change what happens on one.
            trackEvent('share_failed', {
                reason: e instanceof Error ? e.name : 'unknown',
            })
            throw e
        } finally {
            setIsPersisting(false)
        }
    }

    // What the user is about to get. For a persisted base that is exactly the
    // link; for a new one the id doesn't exist yet, so show the shape of it
    // rather than a different base's id — this used to preview
    // `backgroundBaseId`, which persistBase never uses, so the URL previewed
    // was never the URL produced.
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
                        // Mobile: 40px square, the size of every other button
                        // in the right-edge column (legend, meta properties).
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
                    {/* <div className="pr-2 text-white">Share</div>{' '} */}
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
                        // Never wider than the screen: 560px overflows every
                        // phone, and the panel is right-anchored so the overflow
                        // lands off-screen where the link can't be read or copied.
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

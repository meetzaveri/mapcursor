import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import Modal from '../common/modal'
import ToggleSwitch from '../common/toggleSwitch'
import {
    getRouteSnapEnabled,
    setRouteSnapEnabled,
    subscribeRouteSnapEnabled,
} from '../../utils/featureFlags'

interface SettingsModalProps {
    open: boolean
    onClose: () => void
}

const ROUTE_SNAP_TOGGLE_ID = 'settings-route-snap'

const SettingsModal = ({
    open,
    onClose,
}: SettingsModalProps): ReactElement => {
    const [routeSnap, setRouteSnap] = useState(getRouteSnapEnabled())

    useEffect(() => subscribeRouteSnapEnabled(setRouteSnap), [])

    return (
        <Modal open={open} onClose={onClose}>
            <div className="w-[440px] max-w-[calc(80vw_-_2.5rem)]">
                <h2 className="text-lg font-semibold mb-4 font-display">
                    Settings
                </h2>

                <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                        <label
                            htmlFor={ROUTE_SNAP_TOGGLE_ID}
                            className="block text-sm font-medium text-ink cursor-pointer"
                        >
                            Snap routes to roads
                        </label>
                        <p className="text-xs text-ink-muted mt-1">
                            When on, routes follow roads as you draw. When off,
                            they follow your clicks.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span
                            className="text-xs text-ink-mid w-6 text-right"
                            aria-hidden="true"
                        >
                            {routeSnap ? 'On' : 'Off'}
                        </span>
                        <ToggleSwitch
                            id={ROUTE_SNAP_TOGGLE_ID}
                            checked={routeSnap}
                            onChange={setRouteSnapEnabled}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default SettingsModal

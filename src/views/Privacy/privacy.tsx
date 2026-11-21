import React, { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import routes from '../../routes'
import { useMediaQueryUtils } from '../../constants/exportHooks'

const LAST_UPDATED = 'November 8, 2026'

const ChevronLeft = (): ReactNode => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const Section: React.FC<{ title: string; children: ReactNode }> = ({
    title,
    children,
}) => (
    <section className="mb-6 tablet-landscape:mb-8">
        <h2 className="text-base tablet-landscape:text-lg font-bold text-ink tracking-tight mb-2 font-display">
            {title}
        </h2>
        <div className="text-xs tablet-landscape:text-sm text-ink-mid leading-relaxed space-y-2">
            {children}
        </div>
    </section>
)

const PrivacyPage: React.FC = () => {
    const { isMobile } = useMediaQueryUtils()

    return (
        <div className="min-h-screen bg-canvas text-left">
            <nav className="sticky top-0 z-10 bg-sidebar border-b border-border-panel shadow-sm">
                <div className="w-full max-w-2xl laptop:max-w-full mx-auto px-4 tablet-landscape:px-6 py-3 flex items-center justify-between">
                    <span className="text-ink font-bold text-sm tablet-landscape:text-base tracking-tight font-display">
                        Mapcursor
                    </span>
                    <Link
                        to={routes.index}
                        className="flex items-center gap-1 text-sm text-ink-mid no-underline font-medium
                            px-2 py-1 rounded-md hover:bg-sidebar transition-all ease-in duration-150"
                    >
                        <ChevronLeft />
                        <span>{isMobile ? 'Back' : 'Back to canvas'}</span>
                    </Link>
                </div>
            </nav>

            <main className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-8 tablet-landscape:py-12">
                <div className="mb-6 tablet-landscape:mb-10">
                    <h1 className="text-xl tablet-landscape:text-2xl font-bold text-ink tracking-tight mb-2 font-display">
                        Privacy
                    </h1>
                    <p className="text-xs tablet-landscape:text-sm text-ink-muted leading-relaxed">
                        Last updated: {LAST_UPDATED}
                    </p>
                </div>

                <div
                    className="bg-card-bg border border-border-card rounded-card p-4 mb-6 tablet-landscape:mb-10
                    shadow-card"
                >
                    <div className="text-xs font-semibold text-ink-mid uppercase tracking-wider mb-2">
                        In short
                    </div>
                    <p className="text-xs tablet-landscape:text-sm text-ink-mid leading-relaxed">
                        Mapcursor doesn't ask for your name, email or any
                        sign-up. You get an anonymous identity with a random
                        name, and it is stored in your own browser. Whatever you
                        draw stays in your browser until you choose to share a
                        canvas. Once you share it, anyone with the link can view
                        it.
                    </p>
                    <p className="text-xs tablet-landscape:text-sm text-ink-mid leading-relaxed mt-2">
                        One thing to note about maps. Every canvas is drawn on a
                        map, so a canvas always has to open somewhere on Earth.
                        We ask your browser for your location only when you tap
                        &ldquo;Use my current location&rdquo; or &ldquo;Locate
                        me&rdquo;, never automatically. And when you share a
                        canvas, the coordinate it is pinned to and the view you
                        were looking at become public along with it.
                    </p>
                </div>

                <Section title="Who you are to us">
                    <p>
                        When you first open Mapcursor, we create an anonymous
                        identity for you. It is a random ID plus a randomly
                        picked nickname, for example
                        &ldquo;tropical&nbsp;owl&rdquo;. We store this ID in
                        your browser's local storage. We don't collect your
                        name, email address, phone number or anything else that
                        identifies you personally. There is no account and no
                        sign-up.
                    </p>
                    <p>
                        We keep this anonymous ID in our database along with a
                        counter of how many times Mapcursor has been opened from
                        your browser and the time of your most recent visit. The
                        app needs these to function. None of it is linked to
                        your real identity, and we don't share or sell it.
                    </p>
                    <p>
                        Since this identity lives in your browser's storage, you
                        will get a new and separate one if you switch browsers,
                        switch devices, use a private window, or clear your
                        browser data.
                    </p>
                </Section>

                <Section title="Your canvases and what you draw">
                    <p>
                        <strong>Local mode (the default).</strong> While you are
                        sketching, everything you create stays in your own
                        browser's storage. Shapes, text and drawings are kept in
                        local storage. Images are kept in your browser's
                        IndexedDB storage. That covers images you place on the
                        map and images you attach to a point or other object as
                        a property. We don't upload any of it and we can't see
                        it.
                    </p>
                    <p>
                        <strong>Shared canvases.</strong> When you share a
                        canvas, we ask you to confirm first. After you confirm,
                        we upload that canvas and its contents to the cloud.
                        Anyone with the link can then view it. So avoid putting
                        confidential or sensitive information on a canvas you
                        plan to share. Nothing leaves your browser until you opt
                        in. Images are not included in shared canvases. They
                        stay on your device.
                    </p>
                    <p>
                        <strong>Photo details.</strong> Photos often carry
                        hidden details. Mapcursor removes these when you add an
                        image, before it is saved:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Location where the photo was taken (GPS)</li>
                        <li>Date and time it was taken</li>
                        <li>
                            Camera or phone make and model, and its settings
                        </li>
                        <li>Editing software and edit history</li>
                        <li>Captions, keywords, author and copyright fields</li>
                        <li>Comments and text notes stored in the file</li>
                        <li>
                            Extra images some phones attach, such as thumbnails
                            and depth maps
                        </li>
                    </ul>
                    <p>
                        We keep only what's needed to show the image correctly:
                        its color profile, its rotation (applied to the image
                        itself), and animation looping for GIFs. We never read a
                        photo's location to place it on the map. Where an image
                        sits is only ever where you put it.
                    </p>
                    <p>
                        <strong>Exports.</strong> When you export a canvas as
                        JSON, SVG or PNG, the file includes copies of your
                        images. Share exported files with the same care as the
                        photos themselves.
                    </p>
                </Section>

                <Section title="Maps and location">
                    <p>
                        Every canvas in Mapcursor is drawn on a map &mdash; that
                        is the whole point of it. A map has to open somewhere,
                        so a canvas is always pinned to a place on Earth. That
                        makes location part of how Mapcursor works rather than
                        an optional extra, so below is everything it does with
                        one.
                    </p>
                    <p>
                        <strong>Your timezone, to pick an opening view.</strong>{' '}
                        When you open a new canvas, we read your browser's
                        timezone (for example <em>Asia/Kolkata</em>) and open
                        the map near a city in that zone. This needs no
                        permission, and the value stays inside your browser. We
                        never receive it. A timezone covers a country-sized
                        region, so treat it as a rough guess and not as your
                        location.
                    </p>
                    <p>
                        <strong>
                            Your device location, only when you ask for it.
                        </strong>{' '}
                        Two buttons use it: &ldquo;Use my current
                        location&rdquo; when a new map opens, and &ldquo;Locate
                        me&rdquo; next to the zoom controls. We ask your browser
                        for your position only when you tap one of them, and
                        your browser asks you to approve that separately. Each
                        tap reads your position once, at that moment, to move
                        the map there. On an empty map that also pins the map
                        to that spot. We don't read your location between taps.
                        You can decline and nothing breaks. You stay where you
                        are and can search for any place instead. If you have
                        blocked location for Mapcursor, &ldquo;Locate me&rdquo;
                        doesn't ask again; it tells you where to turn location
                        back on in your browser's site settings. There is no
                        background tracking and no location history.
                    </p>
                    <p>
                        <strong>Where that pin is stored.</strong> The pin is a
                        longitude, latitude and zoom level. We save it in your
                        own browser's local storage next to the canvas. Like the
                        rest of local mode, it doesn't reach our servers until
                        you share.
                    </p>
                    <p>
                        <strong>Sharing a canvas publishes its pin.</strong>{' '}
                        When you share a canvas, two coordinates go up with it
                        and become publicly viewable. One is the pin the map is
                        anchored to. The other is the view you were looking at
                        when you shared. Both are needed so that someone opening
                        your link sees your drawing at the right place on Earth.
                        Now consider the case where you used &ldquo;Use my
                        current location&rdquo; or &ldquo;Locate me&rdquo;.
                        The pin, or the view you were looking at, may then be
                        where you were, and sharing publishes it. If you don't
                        want that, search for a nearby place or move the map
                        away first, and share from there.
                    </p>
                    <p>
                        <strong>Services we don't run.</strong> A few outside
                        services make the app work. Your browser contacts them
                        directly, so they can see your IP address and we never
                        see the request:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>
                            <a
                                href="https://carto.com/privacy/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                            >
                                CARTO
                            </a>{' '}
                            serves the map imagery, built on OpenStreetMap data.
                            It receives requests for the map area you are
                            currently viewing. Because every canvas is a map,
                            this happens whenever you open one.
                        </li>
                        <li>
                            <a
                                href="https://osmfoundation.org/wiki/Privacy_Policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                            >
                                Nominatim
                            </a>
                            , run by the OpenStreetMap Foundation, answers place
                            searches. Whatever you type in the place-search box
                            is sent to them to look up. This happens only while
                            you are actually typing in that box. We don't log or
                            store your searches.
                        </li>
                        <li>
                            <a
                                href="https://policies.google.com/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                            >
                                Google&nbsp;Fonts
                            </a>{' '}
                            serves the typefaces the interface is set in. Your
                            browser fetches them when the page loads.
                        </li>
                    </ul>
                </Section>

                <Section title="Analytics">
                    <p>
                        We use{' '}
                        <a
                            href="https://umami.is/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                        >
                            Umami
                        </a>{' '}
                        (Umami Cloud) for aggregate usage analytics. That covers
                        which pages are viewed, the referring site, approximate
                        location at country or region level, and broad device or
                        browser type.
                    </p>
                    <p>
                        Umami doesn't use cookies and doesn't store your IP
                        address. It uses your IP momentarily on the server to
                        estimate approximate location, then discards it. There
                        is no cross-site tracking and no advertising profiles.
                        This data is aggregate, and we don't join it to the
                        anonymous in-app identity described above.
                    </p>
                    <p>
                        We also record a few named events so we can see where
                        people get stuck: that the start-location prompt was
                        shown and how it was answered, which drawing tool was
                        picked, that a first element was drawn, and that a
                        canvas was shared or opened. These carry the name of a
                        tool and a count of elements — never what you drew,
                        typed, or searched for, and never where your map is.
                    </p>
                </Section>

                <Section title="What we never collect">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Your name, email or phone number</li>
                        <li>
                            Background or continuous location tracking. We ask
                            for your location only when you tap &ldquo;Use my
                            current location&rdquo; or &ldquo;Locate me&rdquo;,
                            and only at that moment. We don't follow you after
                            that. See{' '}
                            <em>Maps and location</em> above.
                        </li>
                        <li>Device fingerprints or cross-site trackers</li>
                        <li>
                            Advertising profiles, or analytics tied to you. The
                            only analytics are the aggregate, cookie-free Umami
                            stats described under <em>Analytics</em> above, and
                            we never join them to your in-app identity. If that
                            ever changes, this page will say so before it does.
                        </li>
                        <li>
                            The contents of canvases you keep in local mode and
                            never share
                        </li>
                        <li>Images you add to a canvas</li>
                    </ul>
                    <p>We don't sell or rent any data to anyone.</p>
                </Section>

                <Section title="Your controls">
                    <p>
                        You can reset your anonymous identity and wipe every
                        locally stored canvas and image at any time. Clear this
                        site's data in your browser settings and all of it is
                        gone.
                    </p>
                    <p>
                        Keep in mind that a canvas stays public once you have
                        shared it. Copies that other people opened can also
                        persist on their own. If you want a shared canvas taken
                        down, email us at the address below.
                    </p>
                </Section>

                <Section title="Contact">
                    <p>
                        Questions about this policy or a data request? Email{' '}
                        <a
                            href="mailto:support@mapcursor.com"
                            className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                        >
                            support@mapcursor.com
                        </a>
                        .
                    </p>
                </Section>

                <p className="text-xs text-ink-muted leading-relaxed mt-8 pt-6 border-t border-border-panel">
                    We may update this policy as Mapcursor evolves. Any material
                    change will show up in the &ldquo;last updated&rdquo; date
                    above.
                </p>
            </main>
        </div>
    )
}

export default PrivacyPage

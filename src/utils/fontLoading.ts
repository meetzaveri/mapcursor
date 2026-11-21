import { buildCssFont, type FontSpec } from './textLayout'

function fontSet(): FontFaceSet | undefined {
    if (typeof document === 'undefined') return undefined
    return document.fonts
}

export function isFontReady(font: FontSpec): boolean {
    const fonts = fontSet()
    if (!fonts?.check) return true
    try {
        return fonts.check(buildCssFont(font))
    } catch (_) {
        return true
    }
}

export function runWhenFontReady(font: FontSpec, run: () => void): void {
    if (isFontReady(font)) {
        run()
        return
    }
    const fonts = fontSet()
    if (!fonts?.load) {
        run()
        return
    }
    const spec = buildCssFont(font)
    let request: Promise<unknown>
    try {
        request = fonts.load(spec)
    } catch (_) {
        run()
        return
    }
    request.then(run, run)
}

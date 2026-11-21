import { chromium } from '@playwright/test'

const D =
    'M 0.963939 3.526349 L 0.963939 4.486442 L 0.963939 6.406629 L 0.963939 9.28691 L 0.963939 13.127284 L 0.872501 16.55619 L 0.689626 19.573627 L 0.415314 22.179595 L 0.049564 24.374095 L -0.453342 23.962626 L -1.093405 20.945189 L -1.870623 15.321784 L -2.784998 7.092411 L -3.287904 0.646068 L -3.379342 -4.017244 L -3.059311 -6.897524 L -2.327811 -7.994774 L -0.087592 -7.126118 L 3.661344 -4.291556 L 8.919 0.508912 L 15.685373 7.275286 L 19.525748 11.572847 L 20.440123 13.401597 L 18.428498 12.761535 L 13.490874 9.65266 L 9.787656 7.321004 L 7.318844 5.766567 L 6.084438 4.989348'

const INK = 13.890796957060644
const HALO = INK + 7

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 700, height: 400 } })
await p.setContent(`<body style="margin:0;background:#f5f0e8">
<svg id="probe" xmlns="http://www.w3.org/2000/svg" viewBox="-15 -20 47 56" width="470" height="560"
     style="position:absolute;top:0;left:0">
  <path d="${D}" fill="none" stroke="#F3ECE0" stroke-width="${HALO}" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="ink" d="${D}" fill="none" stroke="#1A1612" stroke-width="${INK}" stroke-linecap="round" stroke-linejoin="round"/>
</svg></body>`)

const info = await p.evaluate(() => {
    const svg = document.getElementById('probe')
    const ink = document.getElementById('ink')
    const strokeBox = ink.getBBox({ stroke: true })
    return {
        pathBox: ink.getBBox(),
        strokeBox: {
            x: strokeBox.x,
            y: strokeBox.y,
            w: strokeBox.width,
            h: strokeBox.height,
        },
        vb: svg.getAttribute('viewBox'),
    }
})
console.log(JSON.stringify(info, null, 1))
await p.screenshot({ path: process.argv[2] + '/cursor-big.png' })
await b.close()

import type { ReactElement } from 'react'
import legendPresetImage from '../../../assets/route-corridor-legend-preset-use-case.png'
import Figure from './figure'

const CityCorridorsContent = (): ReactElement => (
    <>
        <p>
            In a metro city like Mumbai, the way people move is shaped by a
            handful of corridors. The Sealink carries traffic along the coast,
            the metro lines cut across the suburbs, and a few arterial roads
            take most of the load at rush hour. Seeing those corridors together
            on one map makes the city easier to read. A commuter can pick a
            better way to work, a planner can spot where lines meet and where
            they leave gaps, and a team can agree on which stretches matter
            before they argue about the details. In the map above we drew the
            Sealink corridor, Aqua Line 3 and Metro Lines 1 and 2, each as its
            own route with stops marked at the ends.
        </p>
        <p>
            The trick that keeps a map like this readable is a legend preset.
            Before you draw, open the Legend panel at the bottom left and click
            New Legend Preset. Give it a name, say "Sealink Corridor", choose
            Route under Applies to, and pick the colour and line style it should
            have. Then draw the corridor with the Route tool, select it, and
            click Apply next to the preset in the legend. The route takes on the
            preset's style, and the legend now tells anyone looking at the map
            what that blue line means. Make one preset per corridor and every
            line you draw stays consistent with its entry in the legend.
        </p>
        <Figure
            src={legendPresetImage}
            alt="Creating a Sealink Corridor legend preset for routes in Mapcursor, then applying it to a selected route from the Legend panel"
            caption="Create a preset for the corridor, then select a route and click Apply in the legend."
        />
        <p>
            Corridors are only the start. The same two pieces, routes and legend
            presets, cover most of what you'd want to show about getting around
            a city: high traffic corridors at peak hours, no vehicle lanes and
            pedestrian streets, bus lanes, cycle tracks, or roads closed for
            construction. Give each kind its own preset, draw the stretches
            once, and you have a map of the city's movement that anyone can read
            at a glance, with the legend right beside it.
        </p>
    </>
)

export default CityCorridorsContent

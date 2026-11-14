import type { ReactElement } from 'react'
import roadTripEditImage from '../../../assets/road-trip-edit-image-usecase.png'
import Figure from './figure'

const RoadTripContent = (): ReactElement => (
    <>
        <p>
            A road trip leaves you with a few hundred photos and a rough memory
            of the order things happened in. A month later the camera roll is a
            blur of beaches, diners and gas stations. Put those same photos on a
            map, next to the places they were taken, and the trip makes sense
            again. That is what this page walks through: drawing your route in
            Mapcursor and pinning your photos to each stop.
        </p>
        <p>
            Start by typing your first city into the search box at the top
            right. The map jumps there. Pick the Point tool and drop a pin on
            each place you stopped. Then switch to the Route tool and click from
            stop to stop to draw the road between them. Use the Text tool for
            city names and a big title. In our example we drew a dashed line
            with the pencil and added flags to mark where the trip started and
            ended.
        </p>
        <p>
            Next come the photos. You can add them in two ways. The quickest is
            drag and drop. Open the folder with your trip photos, pick one and
            drop it on the map right where it belongs. The other way is the
            Image icon in the toolbar at the top. Click it, choose a photo from
            your device and it lands on the canvas. Either way, the photo stays
            in your browser. Nothing gets uploaded and you don't need an
            account.
        </p>
        <Figure
            src={roadTripEditImage}
            alt="A selected trip photo in Mapcursor with resize handles on its corners and the image styling panel open"
            caption="Select a photo to resize it from the corners. The styling panel handles opacity and layer order."
        />
        <p>
            A dropped photo rarely comes in at the right size. Click it and
            you'll see handles on each corner. Drag one to make the photo bigger
            or smaller. The styling panel on the left lets you fade it with the
            opacity slider. It also has reorder buttons, so a photo can sit
            above or below the route line. We made the San Jose photo larger
            because that was the best lunch of the trip.
        </p>
        <p>
            When it looks right, open the menu and choose Download as image. You
            get a PNG of what's on screen, with the route, labels and every
            photo in place. Send it to the friends who were in the car, post it,
            or print it for the fridge. One thing to know: a share link doesn't
            carry images yet, so for now the downloaded picture is the way to
            show off the full trip.
        </p>
    </>
)

export default RoadTripContent

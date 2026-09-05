// Anchor ids for chrome that other chrome positions itself against, shared in
// their own module so the follower can measure the leader without importing the
// leader's component (which would drag its whole icon graph into the follower's
// chunk).
export const SHAPES_TOOLBAR_ID = 'mc-shapes-toolbar'

// The hamburger button's outer box, top-left.
export const MENU_BUTTON_ID = 'mc-menu-button'

// The share button's outer box, top-right. The place search shrinks to stop
// just short of it, so the two don't overlap in that corner.
export const SHARE_BUTTON_ID = 'mc-share-button'

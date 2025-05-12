// --- DOM Elements ---
const draggableButton = document.getElementById('draggable-button');
const menuContainer = document.getElementById('menu-container');
const menuItems = menuContainer.querySelectorAll('.menu-item');
const app = document.getElementById('app'); // Or use document.body

// --- State Variables ---
let isDragging = false;
let isMenuOpen = false;
let startX, startY;
let initialButtonX, initialButtonY;
let currentButtonX = 50; // Initial X position (matches CSS)
let currentButtonY = 50; // Initial Y position (matches CSS)
let ignoreMouseEventsAfterTouch = false; // Flag to ignore ghost mouse events

// --- Constants ---
const CLICK_THRESHOLD = 5; // Max pixels moved to be considered a click
const GHOST_EVENT_DELAY = 50; // ms to ignore mouse events after touch tap
const EDGE_MARGIN = 10; // Minimum space from viewport edge in pixels
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// --- Mouse Drag and Drop Logic ---
function handleMouseDown(e) {
  if (ignoreMouseEventsAfterTouch) {
    // console.log("Ignoring ghost mousedown");
    return;
  }
  // console.log("Mouse Down");
  if (e.button !== 0) return; // Prevent drag on right-click
  startDrag(e.clientX, e.clientY);
  // Add listeners only if drag actually started
  if (isDragging) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}

function handleMouseMove(e) {
  // console.log("Mouse Move");
  moveDrag(e.clientX, e.clientY);
}

function handleMouseUp(e) {
  if (ignoreMouseEventsAfterTouch) {
    // console.log("Ignoring ghost mouseup");
    return;
  }
  // console.log("Mouse Up");
  endDrag(e.clientX, e.clientY);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

// --- Touch Drag and Drop Logic ---
function handleTouchStart(e) {
  // console.log("Touch Start");
  if (e.touches.length !== 1) return; // Only handle single touch
  const touch = e.touches[0];
  startDrag(touch.clientX, touch.clientY);
   // Add listeners only if drag actually started
  if (isDragging) {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }
}

function handleTouchMove(e) {
  // console.log("Touch Move");
  if (e.touches.length !== 1 || !isDragging) return;
  e.preventDefault();
  moveDrag(e.touches[0].clientX, e.touches[0].clientY);
}

function handleTouchEnd(e) {
  // console.log('handleTouchEnd triggered');
  const touch = e.changedTouches[0];

  if (touch) {
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy);

    if (distanceMoved < CLICK_THRESHOLD) {
      // console.log("handleTouchEnd: Detected as TAP, setting ignoreMouseEventsAfterTouch flag.");
      ignoreMouseEventsAfterTouch = true;
      setTimeout(() => {
        // console.log("Resetting ignoreMouseEventsAfterTouch flag.");
        ignoreMouseEventsAfterTouch = false;
      }, GHOST_EVENT_DELAY);
    }
    // console.log('Calling endDrag for touch');
    endDrag(touch.clientX, touch.clientY);

  } else {
    // console.log('TouchEnd fallback triggered (no changedTouches)');
    if (isDragging) {
        isDragging = false;
        draggableButton.style.cursor = 'grab';
        draggableButton.style.transition = '';
        // If drag ends unexpectedly while menu is open, ensure items are positioned correctly
        if (isMenuOpen) {
            positionMenuContainer();
            updateOpenMenuPositions(); // Use the latest button position
        }
    }
  }

  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  document.removeEventListener('touchcancel', handleTouchEnd);
}


// --- Common Drag Logic ---
function startDrag(clientX, clientY) {
  // console.log("startDrag called");
  isDragging = true; // Set isDragging to true
  draggableButton.style.cursor = 'grabbing';
  draggableButton.style.transition = 'none'; // Disable transition during drag for immediate feedback

  startX = clientX;
  startY = clientY;

  const rect = draggableButton.getBoundingClientRect();
  initialButtonX = rect.left;
  initialButtonY = rect.top;

  // If menu is open, ensure items don't animate during drag start
  if (isMenuOpen) {
      menuItems.forEach(item => {
          item.style.transition = 'none'; // Disable transitions temporarily
      });
  }
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;

  const dx = clientX - startX;
  const dy = clientY - startY;

  let newX = initialButtonX + dx;
  let newY = initialButtonY + dy;

  // Constrain button movement within the viewport
  const buttonSize = draggableButton.offsetWidth;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  newX = Math.max(0, Math.min(newX, viewportWidth - buttonSize));
  newY = Math.max(0, Math.min(newY, viewportHeight - buttonSize));

  // Update button position visually
  draggableButton.style.left = `${newX}px`;
  draggableButton.style.top = `${newY}px`;

  // Update state variables for current position
  currentButtonX = newX;
  currentButtonY = newY;

  // --- If menu is open, update its position and the items' positions dynamically ---
  if (isMenuOpen) {
    positionMenuContainer(); // Keep the container centered on the button
    updateOpenMenuPositions(); // Recalculate and apply item positions based on new button location
  }
  // --- End dynamic update ---
}

// Flag to help differentiate drag-release from simple click
let dragJustFinished = false;

function endDrag(clientX, clientY) {
  if (!isDragging) {
      // console.log("endDrag: exiting because isDragging is false");
      return;
  }
  // console.log("endDrag called");

  const dx = clientX - startX;
  const dy = clientY - startY;
  const distanceMoved = Math.sqrt(dx * dx + dy * dy);

  isDragging = false; // Reset dragging state *before* checks
  draggableButton.style.cursor = 'grab';
  draggableButton.style.transition = ''; // Re-enable button transitions if any

  if (isMenuOpen) {
      menuItems.forEach(item => {
          item.style.transition = ''; // Restore transitions
      });
      positionMenuContainer();
      updateOpenMenuPositions(); // Final update
  }

  if (distanceMoved < CLICK_THRESHOLD) {
    // console.log('endDrag: Detected as CLICK/TAP. Letting click handler toggle.');
    // Do NOT call toggleMenu() here. Let the subsequent 'click' event handle it.
    dragJustFinished = false;
  } else {
    // console.log('endDrag: Detected as DRAG.');
    dragJustFinished = true;
    setTimeout(() => { dragJustFinished = false; }, 50); // Small delay
  }
}

// --- Menu Logic ---
function positionMenuContainer() {
    const buttonRect = draggableButton.getBoundingClientRect();
    menuContainer.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    menuContainer.style.top = `${buttonRect.top + buttonRect.height / 2}px`;
}

function toggleMenu() {
  if (isDragging) {
      // console.log("toggleMenu: Cancelling drag because menu is toggling.");
      isDragging = false;
      draggableButton.style.cursor = 'grab';
      draggableButton.style.transition = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
       menuItems.forEach(item => {
          item.style.transition = '';
      });
  }

  // console.log("toggleMenu called. isMenuOpen:", isMenuOpen);
  if (isMenuOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

/**
 * Calculates the available continuous arc for the menu items based on viewport constraints.
 * Returns { startAngle, arcSpan } in degrees (0-360).
 */
function calculateContinuousMenuArc(buttonRect, viewportWidth, viewportHeight, radius, itemSize) {
    const center = {
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top + buttonRect.height / 2
    };
    // Calculate the actual radius needed, including half item size and margin
    const reqRadius = radius + itemSize / 2 + EDGE_MARGIN;

    // Distances from button center to viewport edges
    const distTop = center.y;
    const distBottom = viewportHeight - center.y;
    const distLeft = center.x;
    const distRight = viewportWidth - center.x;

    let constraints = []; // Stores blocked intervals [start, end] in degrees (0-360)

    // Helper to add constraints, handling 0/360 wrap-around
    const addConstraint = (start, end) => {
        start = (start + 360) % 360;
        end = (end + 360) % 360;
        if (start > end) { // Wraps around 0/360 (e.g., 350 to 10)
            constraints.push([start, 360]);
            constraints.push([0, end]);
        } else if (start < end) { // Normal interval
            constraints.push([start, end]);
        }
        // Ignore if start === end (shouldn't happen with acos)
    };

    // Top constraint (Blocks angles near 270 deg)
    if (distTop < reqRadius) {
        // alpha is the half-angle of the blocked segment, relative to the -Y axis (270 deg)
        const alphaRad = Math.acos(distTop / reqRadius);
        const alphaDeg = alphaRad * RAD_TO_DEG;
        addConstraint(270 - alphaDeg, 270 + alphaDeg);
        // console.log(`Top constraint: dist=${distTop.toFixed(1)}, req=${reqRadius.toFixed(1)}, alpha=${alphaDeg.toFixed(1)}, blocked=[${((270 - alphaDeg + 360)%360).toFixed(1)}, ${((270 + alphaDeg)%360).toFixed(1)}]`);
    }

    // Bottom constraint (Blocks angles near 90 deg)
    if (distBottom < reqRadius) {
        const alphaRad = Math.acos(distBottom / reqRadius);
        const alphaDeg = alphaRad * RAD_TO_DEG;
        addConstraint(90 - alphaDeg, 90 + alphaDeg);
        // console.log(`Bottom constraint: dist=${distBottom.toFixed(1)}, req=${reqRadius.toFixed(1)}, alpha=${alphaDeg.toFixed(1)}, blocked=[${((90 - alphaDeg + 360)%360).toFixed(1)}, ${((90 + alphaDeg)%360).toFixed(1)}]`);
    }

    // Left constraint (Blocks angles near 180 deg)
    if (distLeft < reqRadius) {
        const alphaRad = Math.acos(distLeft / reqRadius);
        const alphaDeg = alphaRad * RAD_TO_DEG;
        addConstraint(180 - alphaDeg, 180 + alphaDeg);
        // console.log(`Left constraint: dist=${distLeft.toFixed(1)}, req=${reqRadius.toFixed(1)}, alpha=${alphaDeg.toFixed(1)}, blocked=[${((180 - alphaDeg + 360)%360).toFixed(1)}, ${((180 + alphaDeg)%360).toFixed(1)}]`);
    }

    // Right constraint (Blocks angles near 0/360 deg)
    if (distRight < reqRadius) {
        const alphaRad = Math.acos(distRight / reqRadius);
        const alphaDeg = alphaRad * RAD_TO_DEG;
        addConstraint(360 - alphaDeg, alphaDeg); // This inherently handles the wrap around
        // console.log(`Right constraint: dist=${distRight.toFixed(1)}, req=${reqRadius.toFixed(1)}, alpha=${alphaDeg.toFixed(1)}, blocked=[${((360 - alphaDeg)%360).toFixed(1)}, ${((alphaDeg)%360).toFixed(1)}]`);
    }

    // --- Find the largest available gap ---
    if (constraints.length === 0) {
        return { startAngle: 270, arcSpan: 360 }; // Default full circle starting top
    }

    // 1. Sort constraints by start angle
    constraints.sort((a, b) => a[0] - b[0]);

    // 2. Merge overlapping/adjacent constraints
    let merged = [];
    if (constraints.length > 0) {
        merged.push([...constraints[0]]);
        for (let i = 1; i < constraints.length; i++) {
            let last = merged[merged.length - 1];
            let current = constraints[i];
            // Check for overlap or adjacency
            if (current[0] <= last[1] + 0.01) { // Add tolerance for float issues
                last[1] = Math.max(last[1], current[1]); // Merge
            } else {
                merged.push([...current]); // Add new interval
            }
        }
    }
     // Check if the last and first intervals wrap around and merge
     if (merged.length > 1) {
        let first = merged[0];
        let last = merged[merged.length - 1];
        // If the first block starts at 0 and the last block ends at 360, they might need merging
        if (first[0] < 0.01 && last[1] > 359.99 && merged.length > 1) {
             // Check if the end of the *second to last* block overlaps/touches the start of the *first* block (via wrap around)
             // This logic is complex, let's simplify: merge if first starts near 0 and last ends near 360
             last[1] = first[1]; // Extend the last interval to cover the first one's end
             merged.shift(); // Remove the first interval
             // The start of the 'last' interval remains correct
        }
     }


    // 3. Calculate gaps between merged constraints
    let gaps = [];
    if (merged.length === 0) { // Should not happen if constraints.length > 0
         gaps.push({ start: 270, span: 360 });
    } else if (merged.length === 1) {
        // Only one blocked interval [blockStart, blockEnd]
        let blocked = merged[0];
        if (blocked[0] < 0.01 && blocked[1] > 359.99) { // Fully blocked?
             gaps.push({ start: 0, span: 0 });
        } else {
             // The gap is from the end of the block to the start (wrapping around 360)
             let gapStart = blocked[1];
             let gapEnd = blocked[0];
             let gapSpan = (gapEnd - gapStart + 360) % 360;
             gaps.push({ start: gapStart, span: gapSpan });
        }
    } else {
        // Multiple blocked intervals, calculate gaps between them
        for (let i = 0; i < merged.length; i++) {
            let currentEnd = merged[i][1];
            let nextStart = merged[(i + 1) % merged.length][0]; // Wrap around for last gap
            let gapSpan = (nextStart - currentEnd + 360) % 360;
            if (gapSpan > 0.1) { // Avoid tiny gaps due to float precision
                 gaps.push({ start: currentEnd % 360, span: gapSpan });
            }
        }
    }

    // 4. Find the largest gap
    let largestGap = { start: 270, span: 0 }; // Default if no gaps found
    if (gaps.length > 0) {
        largestGap = gaps.reduce((max, gap) => gap.span > max.span ? gap : max, gaps[0]);
    } else if (merged.length > 0) {
        // If gaps calculation failed but there were constraints, assume 0 span
        largestGap = { start: merged[0][0], span: 0 };
    }

    // console.log("Constraints:", constraints.map(c => `[${c[0].toFixed(1)}, ${c[1].toFixed(1)}]`));
    // console.log("Merged Constraints:", merged.map(c => `[${c[0].toFixed(1)}, ${c[1].toFixed(1)}]`));
    // console.log("Gaps:", gaps.map(g => `{start: ${g.start.toFixed(1)}, span: ${g.span.toFixed(1)}}`));
    // console.log(`Largest Gap: start=${largestGap.start.toFixed(1)}, span=${largestGap.span.toFixed(1)}`);

    // Ensure span is not negative or excessively large due to modulo/float issues
    largestGap.span = Math.max(0, Math.min(largestGap.span, 360));
    // Ensure start angle is positive
    largestGap.start = (largestGap.start + 360) % 360;

    return { startAngle: largestGap.start, arcSpan: largestGap.span };
}


// --- Update positions of open menu items dynamically ---
function updateOpenMenuPositions() {
    if (!isMenuOpen) return; // Only run if menu is open

    const buttonRect = draggableButton.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const radius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-radius')) || 100;
    const itemSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-item-size')) || 45;

    // Recalculate the arc based on the current button position using the new function
    const { startAngle, arcSpan } = calculateContinuousMenuArc(buttonRect, viewportWidth, viewportHeight, radius, itemSize);

    const itemCount = menuItems.length;
    // Adjust angle increment based on available span
    let angleIncrement = 0;
    if (itemCount > 1 && arcSpan > 0) {
        // Distribute items evenly across the available arc span
        // If arcSpan is 360, divide by itemCount. Otherwise, divide by (itemCount - 1) to include start/end points.
        angleIncrement = arcSpan === 360 ? arcSpan / itemCount : arcSpan / (itemCount - 1);
    } else if (itemCount === 1 && arcSpan > 0) {
        // Place single item at the middle of the arc if span > 0
        // Or just at the start angle if span is very small? Let's stick to start.
        angleIncrement = 0; // Only one position needed
    }


    menuItems.forEach((item, index) => {
        // Calculate the angle for this item within the potentially adjusted arc
        let angle = startAngle;
        if (itemCount > 1) {
            angle = startAngle + angleIncrement * index;
        } else if (itemCount === 1 && arcSpan > 0) {
             // Position single item in the middle of the available arc
             angle = startAngle + arcSpan / 2;
        }
        angle = (angle + 360) % 360; // Ensure positive angle

        const radians = angle * DEG_TO_RAD;
        const translateX = `${Math.cos(radians) * radius}px`;
        const translateY = `${Math.sin(radians) * radius}px`;

        // Directly update the transform style for immediate repositioning
        item.style.transform = `scale(1) rotate(0deg) translate(${translateX}, ${translateY})`;
        item.style.opacity = arcSpan > 0 ? 1 : 0; // Hide items if arc span becomes zero
        item.style.animation = 'none'; // Crucial: Prevent animations from interfering
        item.style.transition = 'none'; // Also disable CSS transitions during drag update
    });
}


function openMenu() {
  // console.log("openMenu called");
  if (isMenuOpen && menuContainer.classList.contains('open')) {
    //  console.log("Menu already open, returning");
    return;
  }
  isMenuOpen = true; // Set state *before* positioning/animation

  positionMenuContainer(); // Position the container first
  menuContainer.classList.remove('closed');
  menuContainer.classList.add('open');

  const buttonRect = draggableButton.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const radius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-radius')) || 100;
  const itemSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-item-size')) || 45;
  // Use the new continuous calculation
  const { startAngle, arcSpan } = calculateContinuousMenuArc(buttonRect, viewportWidth, viewportHeight, radius, itemSize);

  const itemCount = menuItems.length;
  // Adjust angle increment based on available span (same logic as updateOpenMenuPositions)
  let angleIncrement = 0;
  if (itemCount > 1 && arcSpan > 0) {
      angleIncrement = arcSpan === 360 ? arcSpan / itemCount : arcSpan / (itemCount - 1);
  } else if (itemCount === 1 && arcSpan > 0) {
      angleIncrement = 0;
  }

  const staggerDelay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--item-stagger-delay')) || 0.05;

  menuItems.forEach((item, index) => {
    let angle = startAngle;
    if (itemCount > 1) {
        angle = startAngle + angleIncrement * index;
    } else if (itemCount === 1 && arcSpan > 0) {
        angle = startAngle + arcSpan / 2; // Center single item
    }
    angle = (angle + 360) % 360;

    const radians = angle * DEG_TO_RAD;
    const translateX = `${Math.cos(radians) * radius}px`;
    const translateY = `${Math.sin(radians) * radius}px`;

    // Set CSS variables used by the animation
    item.style.setProperty('--translate-x', translateX);
    item.style.setProperty('--translate-y', translateY);
    item.style.setProperty('--animation-delay', `${index * staggerDelay}s`);

    // Reset styles and trigger animation
    item.classList.remove('closing');
    item.style.animation = ''; // Clear previous animation
    item.style.transform = ''; // Reset transform to allow animation to take over
    item.style.opacity = '';   // Reset opacity
    item.style.transition = ''; // Ensure CSS transitions are active for hover etc.
    void item.offsetWidth; // Force reflow to restart animation

    // Hide item immediately if arcSpan is 0, otherwise let animation handle opacity
    if (arcSpan <= 0) {
        item.style.opacity = 0;
    }

    // Apply the open animation class (handled by CSS via #menu-container.open .menu-item)
  });

  setTimeout(() => {
    // console.log("Adding handleClickOutside listener");
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchend', handleClickOutside);
  }, 0);
}

function closeMenu() {
  // console.log("closeMenu called");
  if (!isMenuOpen && !menuContainer.classList.contains('open')) {
    // console.log("Menu already closed, returning");
    return;
  }
  isMenuOpen = false; // Set state *before* animation

  menuContainer.classList.remove('open');
  menuContainer.classList.add('closed'); // Add 'closed' class for styling/state

  const itemCount = menuItems.length;
  const totalDuration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-duration')) || 0.3;
  const staggerDelay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--item-stagger-delay')) || 0.05;

  menuItems.forEach((item, index) => {
    const closeDelay = (itemCount - 1 - index) * staggerDelay;
    item.style.setProperty('--animation-delay-close', `${closeDelay}s`);
    item.classList.add('closing'); // Add class to trigger closing animation

    // Cleanup: Remove the 'closing' class after animation + delay
    const cleanupTime = (totalDuration * 1000) + (closeDelay * 1000) + 50; // Add buffer
    setTimeout(() => {
        item.classList.remove('closing');
        // Reset transform/opacity in case animation didn't fully finish or was interrupted
        item.style.transform = '';
        item.style.opacity = '';
        item.style.animation = ''; // Clear animation property
        item.style.transition = ''; // Restore transitions
    }, cleanupTime);
  });

  // console.log("Removing handleClickOutside listener");
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('touchend', handleClickOutside);
}

function handleClickOutside(e) {
  if (draggableButton.contains(e.target)) {
    // console.log("handleClickOutside: Click was on the button, ignoring.");
    return;
  }
  const isMenuItem = Array.from(menuItems).some(item => item.contains(e.target));
  if (isMenuItem) {
    //   console.log("handleClickOutside: Click was on a menu item, ignoring.");
      return;
  }
  if (isMenuOpen) {
    if (e.type === 'touchend' && ignoreMouseEventsAfterTouch) {
        // console.log("handleClickOutside: Ignoring touchend potentially related to ghost click sequence.");
        return;
    }
    // console.log("Click outside detected, closing menu.");
    closeMenu();
  }
}

// --- Initialization ---
draggableButton.style.left = `${currentButtonX}px`;
draggableButton.style.top = `${currentButtonY}px`;

draggableButton.addEventListener('click', (e) => {
    if (dragJustFinished) {
        // console.log("Button Click: Ignoring click immediately after drag.");
        dragJustFinished = false; // Reset flag
        return;
    }
    // console.log("Button Clicked - Toggling Menu");
    toggleMenu();
});

draggableButton.addEventListener('mousedown', handleMouseDown);
draggableButton.addEventListener('touchstart', handleTouchStart, { passive: true }); // Keep passive true

menuItems.forEach((item, index) => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log(`Menu Item ${index + 1} clicked!`);
    closeMenu();
  });
  item.addEventListener('touchend', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`Menu Item ${index + 1} touched!`);
    closeMenu();
  });
});

// --- Robust Cleanup ---
const counterElement = document.querySelector('#counter');
if (counterElement) counterElement.remove();
const viteLinks = document.querySelectorAll('a[href*="vitejs.dev"], a[href*="mozilla.org"]');
viteLinks.forEach(link => link.parentElement?.remove());
const viteHeader = document.querySelector('h1');
if(viteHeader && viteHeader.textContent?.includes('Vite')) viteHeader.remove();
const viteParagraph = document.querySelector('p.read-the-docs');
if(viteParagraph) viteParagraph.remove();
// --- End Robust Cleanup ---

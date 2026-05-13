export const VIEWPORT_PADDING = 200;
export const MIN_CANVAS_ZOOM = 0.2;
export const MAX_CANVAS_ZOOM = 3;

export const screenToWorldPoint = ({ screenX, screenY, canvasElement, view }) => {
    const rect = canvasElement?.getBoundingClientRect();
    const localX = rect ? screenX - rect.left : screenX;
    const localY = rect ? screenY - rect.top : screenY;
    return {
        x: (localX - view.x) / view.zoom,
        y: (localY - view.y) / view.zoom,
    };
};

export const getVisibleNodes = ({ nodes, canvasElement, view, padding = VIEWPORT_PADDING }) => {
    if (!canvasElement) return nodes;

    const rect = canvasElement.getBoundingClientRect();
    const viewportLeft = (-view.x - padding) / view.zoom;
    const viewportRight = (rect.width - view.x + padding) / view.zoom;
    const viewportTop = (-view.y - padding) / view.zoom;
    const viewportBottom = (rect.height - view.y + padding) / view.zoom;

    return nodes.filter((node) => {
        const nodeRight = node.x + (node.width || 0);
        const nodeBottom = node.y + (node.height || 0);
        return node.x < viewportRight &&
            nodeRight > viewportLeft &&
            node.y < viewportBottom &&
            nodeBottom > viewportTop;
    });
};

export const getCanvasDetailLevel = (zoom) => {
    if (zoom >= 0.8) return 'high';
    if (zoom >= 0.4) return 'medium';
    return 'low';
};

export const zoomViewAtPoint = ({ previousView, mouseX, mouseY, deltaY }) => {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    let newZoom = Math.min(Math.max(previousView.zoom * zoomFactor, MIN_CANVAS_ZOOM), MAX_CANVAS_ZOOM);
    newZoom = Math.round(newZoom * 10000) / 10000;

    const scale = newZoom / previousView.zoom;
    const newX = mouseX - (mouseX - previousView.x) * scale;
    const newY = mouseY - (mouseY - previousView.y) * scale;
    const precision = newZoom < 0.5 || newZoom > 2.5 ? 1000 : 100;

    return {
        zoom: newZoom,
        x: Math.round(newX * precision) / precision,
        y: Math.round(newY * precision) / precision,
    };
};

const getScrollableElement = (container) => {
    if (!container) return null;
    const storyboardScroller = container.querySelector?.('.flex-1.overflow-y-auto.custom-scrollbar') ||
        container.querySelector?.('.flex-1.overflow-y-auto');
    if (storyboardScroller) return storyboardScroller;

    const descendantScroller = container.querySelector?.('.overflow-y-auto, .custom-scrollbar, [class*="overflow-y"]');
    if (descendantScroller) return descendantScroller;

    const style = window.getComputedStyle(container);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || container.classList?.contains('custom-scrollbar')) {
        return container;
    }
    return null;
};

const isStoryboardContainer = (element) => {
    const classes = element?.classList;
    return !!classes &&
        classes.contains('flex') &&
        classes.contains('flex-col') &&
        classes.contains('h-full') &&
        classes.contains('rounded-xl') &&
        classes.contains('overflow-hidden');
};

export const findScrollableNodeArea = ({ target, boundaryElement }) => {
    let current = target;
    while (current && current !== boundaryElement) {
        if (current.classList) {
            if (
                current.classList.contains('video-input-container') ||
                current.classList.contains('video-analyze-container') ||
                isStoryboardContainer(current)
            ) {
                return getScrollableElement(current);
            }

            const container = current.closest?.('.video-input-container, .video-analyze-container');
            if (container) return getScrollableElement(container);

            const storyboardContainer = current.closest?.('.flex.flex-col.h-full.rounded-xl.overflow-hidden');
            if (storyboardContainer) return getScrollableElement(storyboardContainer);
        }
        current = current.parentElement;
    }
    return null;
};

export const scrollElementByWheel = (element, deltaY) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    const currentScroll = element.scrollTop;
    element.scrollTop = Math.max(0, Math.min(maxScroll, currentScroll + deltaY));
};

export const preventCancelableEvent = (event, { stopPropagation = false } = {}) => {
    try {
        if (event.cancelable) {
            event.preventDefault();
            if (stopPropagation) event.stopPropagation();
        }
    } catch (error) {
        // Some browser event paths still report passive-listener preventDefault noise.
    }
};

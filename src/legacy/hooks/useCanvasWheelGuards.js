import { useEffect } from 'react';
import {
    findScrollableNodeArea,
    preventCancelableEvent,
    scrollElementByWheel,
    zoomViewAtPoint,
} from '../canvas/viewport.js';

const shouldFilterPassiveWheelWarning = (args) => {
    const message = args.map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg && arg.toString) return arg.toString();
        return '';
    }).join(' ');

    return message.includes('Unable to preventDefault') ||
        message.includes('passive event listener') ||
        (message.includes('preventDefault') && message.includes('passive'));
};

export const useCanvasWheelGuards = ({ canvasRef, setView }) => {
    useEffect(() => {
        const originalError = console.error;
        const originalWarn = console.warn;

        console.error = function(...args) {
            if (shouldFilterPassiveWheelWarning(args)) return;
            originalError.apply(console, args);
        };

        console.warn = function(...args) {
            if (shouldFilterPassiveWheelWarning(args)) return;
            originalWarn.apply(console, args);
        };

        return () => {
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    useEffect(() => {
        const preventCtrlZoom = (event) => {
            if (!event.ctrlKey) return;
            try {
                if (event.cancelable) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } catch {
                // Ignore passive listener errors from browser-level wheel handling.
            }
        };

        const options = { passive: false, capture: true };
        window.addEventListener('wheel', preventCtrlZoom, options);
        document.addEventListener('wheel', preventCtrlZoom, options);
        window.addEventListener('mousewheel', preventCtrlZoom, options);
        document.addEventListener('mousewheel', preventCtrlZoom, options);

        return () => {
            window.removeEventListener('wheel', preventCtrlZoom, options);
            document.removeEventListener('wheel', preventCtrlZoom, options);
            window.removeEventListener('mousewheel', preventCtrlZoom, options);
            document.removeEventListener('mousewheel', preventCtrlZoom, options);
        };
    }, []);

    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return undefined;

        const wheelHandler = (event) => {
            if (event.ctrlKey) {
                preventCancelableEvent(event, { stopPropagation: true });
                return;
            }

            const scrollableElement = findScrollableNodeArea({
                target: event.target,
                boundaryElement: canvasElement,
            });

            if (scrollableElement) {
                preventCancelableEvent(event, { stopPropagation: true });
                scrollElementByWheel(scrollableElement, event.deltaY);
                return;
            }

            preventCancelableEvent(event);
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            setView((prev) => zoomViewAtPoint({
                previousView: prev,
                mouseX,
                mouseY,
                deltaY: event.deltaY,
            }));
        };

        canvasElement.addEventListener('wheel', wheelHandler, { passive: false });

        return () => {
            canvasElement.removeEventListener('wheel', wheelHandler);
        };
    }, [canvasRef, setView]);
};

import React from 'react';
import { Plus } from '../../shared/icons.jsx';
import { LazyBase64Image } from '../support.jsx';
import { getNodeLabel } from './nodeCatalog.js';

export const LowDetailNode = ({
    node,
    theme,
    isSelected,
    isConnected,
    isDragging,
    dragNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    setSelectedNodeId,
    setDragNodeId,
    connectingSource,
    connectingTarget,
    hoverTargetId,
    setHoverTargetId,
    handleNodeMouseUp,
    isVideoUrl,
    screenToWorld,
    setMousePos,
    setConnectingTarget,
    setConnectingInputType,
    setConnectingSource,
}) => {
    const selectNodeForDrag = (event) => {
        if (event.button !== 0) return;

        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) {
            setSelectedNodeIds((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);

                if (next.size === 1) {
                    setSelectedNodeId(Array.from(next)[0]);
                } else {
                    setSelectedNodeId(null);
                }
                return next;
            });
        } else {
            const isAlreadySelected = selectedNodeIds.has(node.id);
            if (isAlreadySelected && selectedNodeIds.size > 1) {
                setSelectedNodeId(node.id);
            } else {
                setSelectedNodeId(node.id);
                setSelectedNodeIds(new Set([node.id]));
            }
        }
        setDragNodeId(node.id);
    };

    const startInputConnection = (event, inputType = 'default') => {
        event.stopPropagation();
        event.preventDefault();
        const world = screenToWorld(event.clientX, event.clientY);
        setMousePos(world);
        setConnectingTarget(node.id);
        setConnectingInputType(inputType);
    };

    const startOutputConnection = (event) => {
        event.stopPropagation();
        event.preventDefault();
        const world = screenToWorld(event.clientX, event.clientY);
        setMousePos(world);
        setConnectingSource(node.id);
    };

    const inputPointStyle = (top) => ({
        top,
        left: '-0.25rem',
        width: '0.5rem',
        height: '0.5rem',
        backgroundColor: isConnected ? '#60a5fa' : '#52525b',
        borderRadius: '50%',
        position: 'absolute',
        zIndex: 20,
        pointerEvents: 'auto',
    });

    return (
        <div
            key={node.id}
            data-node-id={node.id}
            className={`absolute node-wrapper flex flex-col ${
                isSelected
                    ? 'ring-1 ring-blue-500'
                    : theme === 'dark'
                        ? 'border border-zinc-800'
                        : 'border border-zinc-200'
            } ${theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'}`}
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                cursor: (dragNodeId === node.id || (dragNodeId && selectedNodeIds.has(node.id))) ? 'grabbing' : 'default',
                zIndex: isDragging ? 50 : 10,
                border: `1px solid ${theme === 'dark' ? '#3f3f46' : '#e4e4e7'}`,
                background: theme === 'dark' ? '#18181b' : '#fff',
                boxShadow: 'none',
                borderRadius: '0',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
            }}
            onMouseDown={selectNodeForDrag}
            onMouseEnter={() => {
                if (connectingSource || connectingTarget) setHoverTargetId(node.id);
            }}
            onMouseLeave={() => {
                if ((connectingSource || connectingTarget) && hoverTargetId === node.id) setHoverTargetId(null);
            }}
            onMouseUp={(event) => handleNodeMouseUp(node.id, event)}
        >
            {node.type === 'input-image' && node.content && (
                <div className="w-full h-full relative">
                    {isVideoUrl(node.content) ? (
                        <video src={node.content} className="w-full h-full object-cover opacity-80" muted playsInline />
                    ) : (
                        <LazyBase64Image src={node.content} className="w-full h-full object-cover opacity-80" alt="" />
                    )}
                </div>
            )}
            {node.type === 'video-input' && node.content && (
                <video src={node.content} className="w-full h-full object-cover opacity-80" muted playsInline />
            )}
            {!node.content && (
                <div className={`p-2 font-bold text-sm truncate ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {getNodeLabel(node.type)}
                </div>
            )}

            {node.type !== 'input-image' && node.type !== 'video-input' && node.type !== 'video-analyze' && (
                node.type === 'image-compare' ? (
                    <>
                        <div
                            className="input-point"
                            style={inputPointStyle('33%')}
                            onMouseDown={(event) => startInputConnection(event)}
                            onMouseUp={(event) => handleNodeMouseUp(node.id, event, 'default')}
                        />
                        <div
                            className="input-point"
                            style={inputPointStyle('66%')}
                            onMouseDown={(event) => startInputConnection(event)}
                            onMouseUp={(event) => handleNodeMouseUp(node.id, event, 'default')}
                        />
                    </>
                ) : (
                    <div
                        className="input-point"
                        style={inputPointStyle('50%')}
                        onMouseDown={(event) => startInputConnection(event)}
                        onMouseUp={(event) => handleNodeMouseUp(node.id, event, 'default')}
                    />
                )
            )}

            {node.type !== 'local-save' && (
                <div
                    className="connector connector-right"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: '-0.45rem',
                        width: '0.9rem',
                        height: '0.9rem',
                        backgroundColor: connectingSource === node.id ? '#d4d4d8' : '#27272a',
                        border: '1px solid #71717a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'crosshair',
                        zIndex: 30,
                        opacity: connectingSource === node.id ? 1 : 0.5,
                        pointerEvents: 'auto',
                    }}
                    onMouseDown={startOutputConnection}
                >
                    <Plus size={10} />
                </div>
            )}
        </div>
    );
};

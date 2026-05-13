import React from 'react';
import { FolderOpen, Save, Video } from '../../shared/icons.jsx';
import {
    buildLocalSaveFiles,
    pingLocalSaveServer,
    saveFilesToLocalServer,
} from '../services/localSaveService.js';

export const LocalSaveNode = ({
    node,
    theme,
    connectedImages,
    savedFolderHistory,
    updateNodeSettings,
    addFolderToHistory,
    isVideoUrl,
}) => {
    const isDark = theme === 'dark';
    const settings = node.settings || {};
    const serverStatus = settings.serverStatus;
    const isConnected = serverStatus === 'connected';

    const testServer = async () => {
        const serverUrl = settings.serverUrl || 'http://127.0.0.1:9527';
        try {
            const result = await pingLocalSaveServer(serverUrl);
            updateNodeSettings(node.id, result.connected
                ? { serverStatus: 'connected', savePath: result.savePath }
                : { serverStatus: 'error' });
        } catch (error) {
            updateNodeSettings(node.id, { serverStatus: 'error' });
        }
    };

    const saveConnectedFiles = async () => {
        if (!isConnected) {
            alert('请先连接本地服务器！\n\n运行 "启动本地接收器.bat" 启动服务。');
            return;
        }
        if (connectedImages.length === 0) {
            alert('没有可保存的图片。请将图片节点连接到此节点。');
            return;
        }

        const serverUrl = settings.serverUrl || 'http://127.0.0.1:9527';
        const subfolder = settings.subfolder || '';
        const files = await buildLocalSaveFiles(connectedImages, { isVideoUrl });

        if (files.length === 0) {
            alert('没有可保存的文件');
            return;
        }

        try {
            const result = await saveFilesToLocalServer({ serverUrl, files, subfolder });
            if (result.success) {
                updateNodeSettings(node.id, {
                    lastSaved: new Date().toISOString(),
                    savedFiles: result.results || [],
                    lastSavedUrls: [...connectedImages],
                });
                if (subfolder && subfolder.trim() !== '') {
                    addFolderToHistory(subfolder.trim());
                }
                alert(`保存成功！\n${result.message}`);
            } else {
                alert(`保存失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('保存请求失败:', error);
            alert('保存失败: 无法连接到本地服务器');
            updateNodeSettings(node.id, { serverStatus: 'error' });
        }
    };

    return (
        <div className="flex flex-col h-full pointer-events-auto">
            <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-semibold ${
                isDark ? 'border-zinc-800 text-zinc-200' : 'border-zinc-200 text-zinc-700'
            }`}>
                <div className="flex items-center gap-1.5">
                    <FolderOpen size={13} className="text-green-500" />
                    <span>保存到本地</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                    isConnected
                        ? 'bg-green-500/20 text-green-400'
                        : serverStatus === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-green-400' : serverStatus === 'error' ? 'bg-red-400' : 'bg-zinc-400'
                    }`} />
                    {isConnected ? '已连接' : serverStatus === 'error' ? '未连接' : '检测中'}
                </div>
            </div>

            <div className="flex-1 flex flex-col p-3 gap-2 overflow-auto">
                <div className="space-y-2">
                    <label className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        服务器地址
                    </label>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={settings.serverUrl || 'http://127.0.0.1:9527'}
                            onChange={(event) => updateNodeSettings(node.id, { serverUrl: event.target.value })}
                            placeholder="http://127.0.0.1:9527"
                            className={`flex-1 px-2 py-1.5 text-xs rounded border outline-none ${
                                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                            }`}
                            onMouseDown={(event) => event.stopPropagation()}
                        />
                        <button
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                                isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                            }`}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={testServer}
                        >
                            测试
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        子文件夹（可选）
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={settings.subfolder || ''}
                            onChange={(event) => updateNodeSettings(node.id, { subfolder: event.target.value })}
                            placeholder="例如: project1/images"
                            className={`w-full px-2 py-1.5 text-xs rounded border outline-none ${
                                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                            }`}
                            onMouseDown={(event) => event.stopPropagation()}
                            list={`folder-history-${node.id}`}
                        />
                        {savedFolderHistory.length > 0 && (
                            <datalist id={`folder-history-${node.id}`}>
                                {savedFolderHistory.map((folder, index) => (
                                    <option key={index} value={folder} />
                                ))}
                            </datalist>
                        )}
                    </div>
                    {savedFolderHistory.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {savedFolderHistory.slice(0, 5).map((folder, index) => (
                                <button
                                    key={index}
                                    className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                                        isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                                    } ${settings.subfolder === folder ? 'ring-1 ring-green-500' : ''}`}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={() => updateNodeSettings(node.id, { subfolder: folder })}
                                    title={folder}
                                >
                                    {folder.length > 12 ? `${folder.slice(0, 12)}...` : folder}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={`auto-save-${node.id}`}
                        checked={settings.autoSave || false}
                        onChange={(event) => updateNodeSettings(node.id, { autoSave: event.target.checked })}
                        className="w-3.5 h-3.5 rounded"
                        onMouseDown={(event) => event.stopPropagation()}
                    />
                    <label htmlFor={`auto-save-${node.id}`} className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        有新输入时自动保存
                    </label>
                </div>

                {settings.savePath && (
                    <div className={`text-[10px] p-2 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                        保存路径: {settings.savePath}
                    </div>
                )}

                {connectedImages.length > 0 && (
                    <div className={`p-2 rounded border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className={`text-[10px] font-medium mb-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            待保存文件 ({connectedImages.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {connectedImages.slice(0, 6).map((url, index) => (
                                isVideoUrl(url) ? (
                                    <div key={index} className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}>
                                        <Video size={14} className="text-blue-400" />
                                    </div>
                                ) : (
                                    <img key={index} src={url} className="w-8 h-8 rounded object-cover" />
                                )
                            ))}
                            {connectedImages.length > 6 && (
                                <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] ${
                                    isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                                }`}>
                                    +{connectedImages.length - 6}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {settings.lastSaved && (
                    <div className={`text-[10px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        ✓ 上次保存: {new Date(settings.lastSaved).toLocaleTimeString()}
                    </div>
                )}
            </div>

            <div className={`px-3 py-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <button
                    className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        isConnected
                            ? isDark ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                            : isDark ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                    }`}
                    disabled={!isConnected}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={saveConnectedFiles}
                >
                    <Save size={14} />
                    保存到本地
                </button>
            </div>
        </div>
    );
};

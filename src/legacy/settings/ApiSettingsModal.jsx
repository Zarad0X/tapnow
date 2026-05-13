import React from 'react';
import { CheckCircle2, LinkIcon, Loader2, Plus, Trash2 } from '../../shared/icons.jsx';
import { Button, Modal } from '../support.jsx';

const MODEL_FIELDS = [
    { key: 'modelName', label: 'Model ID', type: 'text', placeholder: 'model-id' },
    { key: 'key', type: 'password' },
    { key: 'url', label: 'Base URL', type: 'text', placeholder: 'https://...' },
];

const getCredentialField = (api) => {
    const isJimeng = api.id.includes('jimeng') || api.provider?.includes('Jimeng');
    return {
        key: 'key',
        label: isJimeng ? 'Session ID' : 'API Key',
        type: 'password',
        placeholder: isJimeng ? '粘贴Session ID...' : 'sk-...',
    };
};

export const ApiSettingsModal = ({
    isOpen,
    theme,
    globalApiKey,
    setGlobalApiKey,
    jimengUseLocalFile,
    setJimengUseLocalFile,
    apiConfigs,
    setApiConfigs,
    updateApiConfig,
    deleteApiConfig,
    addNewModel,
    testApiConnection,
    apiTesting,
    apiStatus,
    getStatusColor,
    deletedModelIds,
    onClose,
}) => {
    const isDark = theme === 'dark';

    const updateField = (api, fieldKey, newValue) => {
        updateApiConfig(api.id, { [fieldKey]: newValue });

        if (fieldKey !== 'key' || !(api.id.includes('jimeng') || api.provider?.includes('Jimeng')) || !newValue.trim()) {
            return;
        }

        const trimmed = newValue.trim();
        const savedSessionId = localStorage.getItem('tapnow_jimeng_session_id');
        if (!savedSessionId || savedSessionId !== trimmed) {
            localStorage.setItem('tapnow_jimeng_session_id', trimmed);
            setApiConfigs((prev) => prev.map((config) => (
                (config.id.includes('jimeng') || config.provider?.includes('Jimeng')) && config.key !== trimmed
                    ? { ...config, key: trimmed }
                    : config
            )));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="模型接口配置" theme={theme}>
            <div className="p-4 space-y-3">
                <div className="mb-2">
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Global API Key（可选，全局默认 Key）
                    </label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="password"
                            value={globalApiKey}
                            onChange={(event) => setGlobalApiKey(event.target.value)}
                            className={`flex-1 rounded px-2 py-1 text-xs outline-none focus:border-blue-600/50 border ${
                                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-900'
                            }`}
                            placeholder="如果不想每个模型单独填 Key，可以在这里填一个全局 Key"
                        />
                    </div>
                </div>

                <div className="mb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <label className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                即梦图生图使用本地文件
                            </label>
                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                启用后，即梦模型的图生图功能将强制使用本地文件（FormData），URL图片会自动下载转换为本地文件
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-3">
                            <input
                                type="checkbox"
                                checked={jimengUseLocalFile}
                                onChange={(event) => {
                                    const newValue = event.target.checked;
                                    setJimengUseLocalFile(newValue);
                                    localStorage.setItem('tapnow_jimeng_use_local_file', String(newValue));
                                }}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 ${
                                jimengUseLocalFile ? 'bg-blue-600' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                            } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        管理您的第三方模型接口。
                    </span>
                    <Button className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-500" onClick={addNewModel}>
                        <Plus size={14} className="mr-1" /> 添加模型
                    </Button>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {apiConfigs.filter((api) => !deletedModelIds.includes(api.id)).map((api) => (
                        <div
                            key={api.id}
                            className={`p-3 rounded-lg border relative group ${
                                isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                            }`}
                        >
                            {api.isCustom && (
                                <button
                                    onClick={() => deleteApiConfig(api.id)}
                                    className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                                        isDark ? 'text-zinc-600 hover:text-red-500' : 'text-zinc-400 hover:text-red-500'
                                    }`}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(api.id)}`}></div>
                                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{api.provider}</span>
                                <span
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ml-auto border ${
                                        isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200'
                                    }`}
                                >
                                    {api.type}
                                </span>
                            </div>
                            <div className="space-y-2 pl-1">
                                {MODEL_FIELDS.map((field) => (field.key === 'key' ? getCredentialField(api) : field)).map((field) => (
                                    <div key={field.key} className="grid grid-cols-4 items-center gap-2">
                                        <label className={`text-[10px] font-medium uppercase tracking-wider text-right ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type}
                                            value={api[field.key]}
                                            onChange={(event) => updateField(api, field.key, event.target.value)}
                                            className={`col-span-3 w-full rounded px-2 py-1 text-xs outline-none focus:border-blue-600/50 border ${
                                                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-900'
                                            }`}
                                            placeholder={field.placeholder}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className={`mt-3 pt-2 border-t flex justify-end ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                                <button
                                    onClick={() => testApiConnection(api.id)}
                                    disabled={apiTesting === api.id}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                                        apiStatus[api.id] === 'success'
                                            ? 'bg-green-500/10 text-green-500'
                                            : isDark
                                                ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                                                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                                    }`}
                                >
                                    {apiTesting === api.id ? (
                                        <>
                                            <Loader2 size={10} className="animate-spin" /> 测试中...
                                        </>
                                    ) : apiStatus[api.id] === 'success' ? (
                                        <>
                                            <CheckCircle2 size={10} /> 正常
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon size={10} /> 测试连接
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`pt-2 flex justify-end gap-2 border-t mt-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <Button variant="secondary" onClick={onClose}>关闭</Button>
                </div>
            </div>
        </Modal>
    );
};

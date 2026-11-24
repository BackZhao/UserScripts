import { FunctionComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import Modal from './modal';
import { Aria2Instance } from './types';
import {
    getSetting,
    saveSetting,
    addInstance,
    updateInstance,
    removeInstance,
    uuid,
    testConnection,
} from './utils';

type Props = {
    visible: boolean;
    onClose: any;
};

type ConnStatus = Record<string, { ok: boolean; msg: string }>;

export const Setting: FunctionComponent<Props> = (props: Props) => {
    const [data, setData] = useState(() => getSetting());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newFormOpen, setNewFormOpen] = useState(false);
    const [connStatus, setConnStatus] = useState<ConnStatus>({});

    // --- 全局设置 ---
    const changeGlobal = (e: any) => {
        const { name, value, checked, type } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setData(o => ({ ...o, [name]: newValue }));
    };

    // --- 实例操作 ---
    const setEdit = (id: string | null) => {
        setEditingId(id);
        setNewFormOpen(false);
    };

    const onInstanceFieldChange = (
        id: string,
        field: keyof Aria2Instance,
        value: string | boolean
    ) => {
        setData(o => ({
            ...o,
            instances: o.instances.map(i =>
                i.id === id ? { ...i, [field]: value } : i
            ),
        }));
    };

    const saveInstances = () => {
        data.instances.forEach(inst => {
            const exists = getSetting().instances.some(i => i.id === inst.id);
            if (exists) {
                updateInstance(inst);
            }
        });
        // 切换默认实例
        const def = data.instances.find(i => i.isDefault);
        if (def) {
            updateInstance(def);
            // 当前实例同步默认
            const s = getSetting();
            if (s.currentInstanceId !== def.id) {
                saveSetting({ ...s, currentInstanceId: def.id });
            }
        }
        setData(getSetting());
    };

    const handleAdd = () => {
        const newInst: Aria2Instance = {
            id: uuid(),
            name: '新实例',
            url: 'http://127.0.0.1:6800/jsonrpc',
            token: '',
            dir: '',
            check: false,
            checkMin: '0',
            isDefault: false,
        };
        setData(o => ({ ...o, instances: [...o.instances, newInst] }));
        setEditingId(newInst.id);
        setNewFormOpen(false);
    };

    const handleDelete = (id: string) => {
        const s = getSetting();
        if (s.instances.length <= 1) return;
        setData(o => ({ ...o, instances: o.instances.filter(i => i.id !== id) }));
    };

    const handleSetDefault = (id: string) => {
        setData(o => ({
            ...o,
            instances: o.instances.map(i => ({ ...i, isDefault: i.id === id })),
        }));
    };

    // --- 保存整个设置 ---
    const saveAll = () => {
        const newData = { ...data };
        newData.interval = newData.interval || '300';
        // 保存实例
        newData.instances.forEach(inst => {
            const exists = getSetting().instances.some(i => i.id === inst.id);
            if (exists) {
                updateInstance(inst);
            } else {
                addInstance(inst);
            }
        });
        // 如果指定了默认实例且不同于当前, 切换
        const def = newData.instances.find(i => i.isDefault);
        if (def) {
            const s = getSetting();
            if (s.currentInstanceId !== def.id) {
                saveSetting({ ...s, currentInstanceId: def.id });
            }
        }
        // 最后保存全局设置 (包含 currentInstanceId)
        saveSetting({ ...getSetting(), interval: newData.interval });
        props.onClose();
    };

    // --- 测试连接 ---
    const handleTest = useCallback(
        async (inst: Aria2Instance) => {
            setConnStatus(s => ({
                ...s,
                [inst.id]: { ok: false, msg: '测试中...' },
            }));
            const result = await testConnection(inst.url, inst.token);
            setConnStatus(s => ({
                ...s,
                [inst.id]: {
                    ok: result.ok,
                    msg: result.ok
                        ? `✅ 已连接 (aria2 ${result.version || 'unknown'})`
                        : `❌ ${result.error || '连接失败'}`,
                },
            }));
        },
        []
    );

    return (
        <Modal isOpen={props.visible} onCloseClick={props.onClose} width={720}>
            <div className="aria2-setting">
                {/* ===== 实例列表 ===== */}
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>aria2 实例</h3>
                <table className="aria2-instance-table">
                    <thead>
                        <tr>
                            <th style={{ width: 120 }}>名称</th>
                            <th>地址</th>
                            <th style={{ width: 160 }}>状态</th>
                            <th style={{ width: 160 }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.instances.map(inst => {
                            const editing = editingId === inst.id;
                            const cs = connStatus[inst.id];
                            return (
                                <tr key={inst.id} className={editing ? 'aria2-editing' : ''}>
                                    {editing ? (
                                        <>
                                            <td colSpan={4} className="aria2-edit-row">
                                                <table className="aria2-edit-form">
                                                    <tbody>
                                                        <tr>
                                                            <td>名称</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={inst.name}
                                                                    onInput={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'name',
                                                                            (e.target as HTMLInputElement).value
                                                                        )
                                                                    }
                                                                    placeholder="如: 家里群晖"
                                                                />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>地址</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={inst.url}
                                                                    onInput={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'url',
                                                                            (e.target as HTMLInputElement).value
                                                                        )
                                                                    }
                                                                    placeholder="http://127.0.0.1:6800/jsonrpc"
                                                                />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>Token</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={inst.token}
                                                                    onInput={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'token',
                                                                            (e.target as HTMLInputElement).value
                                                                        )
                                                                    }
                                                                    placeholder="没有就留空"
                                                                />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>下载目录</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={inst.dir}
                                                                    onInput={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'dir',
                                                                            (e.target as HTMLInputElement).value
                                                                        )
                                                                    }
                                                                    placeholder="空 = 继承 aria2 全局"
                                                                />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>校验 SHA-1</td>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inst.check}
                                                                    onChange={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'check',
                                                                            (e.target as HTMLInputElement).checked
                                                                        )
                                                                    }
                                                                />
                                                                当文件 ≥
                                                                <input
                                                                    type="number"
                                                                    value={inst.checkMin}
                                                                    onInput={e =>
                                                                        onInstanceFieldChange(
                                                                            inst.id,
                                                                            'checkMin',
                                                                            (e.target as HTMLInputElement).value
                                                                        )
                                                                    }
                                                                    style={{ width: 60, margin: '0 4px' }}
                                                                />
                                                                MB
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>
                                                {inst.name}
                                                {inst.isDefault && (
                                                    <span className="aria2-default-tag">默认</span>
                                                )}
                                            </td>
                                            <td className="aria2-url-cell">{inst.url}</td>
                                            <td className="aria2-status-cell">
                                                {cs ? (
                                                    <span style={{ color: cs.ok ? 'green' : 'red' }}>
                                                        {cs.msg}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#999' }}>未测试</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="aria2-btn-sm"
                                                    onClick={() => handleTest(inst)}
                                                >
                                                    测试
                                                </button>
                                                <button
                                                    className="aria2-btn-sm"
                                                    onClick={() => setEdit(inst.id)}
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    className="aria2-btn-sm"
                                                    onClick={() => handleSetDefault(inst.id)}
                                                    disabled={inst.isDefault}
                                                >
                                                    默认
                                                </button>
                                                <button
                                                    className="aria2-btn-sm aria2-btn-danger"
                                                    onClick={() => handleDelete(inst.id)}
                                                    disabled={data.instances.length <= 1}
                                                >
                                                    删除
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* 添加 / 编辑完成按钮 */}
                {editingId && (
                    <div style={{ marginTop: 8 }}>
                        <button
                            onClick={() => {
                                setEdit(null);
                                saveInstances();
                            }}
                            style={{ marginRight: 8 }}
                        >
                            完成编辑
                        </button>
                        <button onClick={() => setEdit(null)}>取消</button>
                    </div>
                )}

                {!newFormOpen && (
                    <button onClick={handleAdd} style={{ marginTop: 8 }}>
                        ➕ 添加 aria2 实例
                    </button>
                )}

                {/* ===== 分隔线 ===== */}
                <hr style={{ margin: '16px 0' }} />

                {/* ===== 全局设置 ===== */}
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>全局设置</h3>
                <table className="bdp-setting">
                    <tbody>
                        <tr>
                            <td>请求间隔</td>
                            <td>
                                <input
                                    type="number"
                                    name="interval"
                                    value={data.interval as string}
                                    onChange={changeGlobal}
                                    placeholder="300"
                                />
                                ms
                            </td>
                        </tr>
                        <tr>
                            <td>自定义 UA</td>
                            <td>
                                <input
                                    type="checkbox"
                                    name="useSystemUserAgent"
                                    checked={data.useSystemUserAgent as boolean}
                                    onChange={changeGlobal}
                                />
                                使用浏览器 UA
                                <input
                                    type="text"
                                    name="customUserAgent"
                                    disabled={data.useSystemUserAgent as boolean}
                                    value={data.customUserAgent as string}
                                    onChange={changeGlobal}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ===== 底部按钮 ===== */}
                <div className="bdp-buttons" style={{ marginTop: 16 }}>
                    <button
                        className="bdp-buttons-close"
                        onClick={props.onClose}
                        style={{ border: 0 }}
                    >
                        取消
                    </button>
                    <button
                        className="bdp-buttons-redo"
                        onClick={saveAll}
                        style={{
                            color: '#fff',
                            border: 0,
                            background: '#09aaff',
                            width: '100%',
                        }}
                    >
                        保存全部
                    </button>
                </div>
            </div>
        </Modal>
    );
};

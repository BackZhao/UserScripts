import { useCallback, useState, useEffect } from 'preact/hooks';
import './app.css';
import { Pan115 } from './main';
import { Message } from './message';
import { Setting } from './setting';
import {
    getSetting,
    getCurrentInstance,
    setCurrentInstance,
} from './utils';
import { GM_addValueChangeListener, GM_removeValueChangeListener } from '$';

type Props = {
    pan115: Pan115;
};

export function App(props: Props) {
    const { pan115 } = props;
    const [settingOpen, setSettingOpen] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);

    const [instances, setInstances] = useState(() => getSetting().instances);
    const [currentInstanceId, setCurrentInstanceId] = useState(() => getSetting().currentInstanceId);

    // 监听配置变化, 刷新下拉
    useEffect(() => {
        const listenerId = GM_addValueChangeListener('115aria2_config', () => {
            const s = getSetting();
            setInstances(s.instances);
            setCurrentInstanceId(s.currentInstanceId);
        });
        return () => {
            (GM_removeValueChangeListener as any)(listenerId);
        };
    }, []);

    const currentInst =
        instances.find(i => i.id === currentInstanceId) ||
        instances.find(i => i.isDefault) ||
        instances[0];

    const handleSelectInstance = (e: Event) => {
        const id = (e.target as HTMLSelectElement).value;
        setCurrentInstanceId(id);
        setCurrentInstance(id);
    };

    const click = useCallback(
        (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            const inst = getCurrentInstance();
            if (!inst?.url) return setSettingOpen(true);
            const { selectedFile, selectedFolder } = pan115.selectFileList();
            if (selectedFile.length == 0 && selectedFolder.length == 0) return;
            setMessageVisible(true);
        },
        [pan115]
    );

    return (
        <>
            <div className="bdp-toolbar">
                <select
                    className="bdp-instance-select"
                    value={currentInstanceId}
                    onChange={handleSelectInstance}
                    title="选择 aria2 实例"
                    style={{
                        background: '#ffffff',
                        color: '#606266',
                        border: '1px solid #dcdfe6',
                    }}
                >
                    {instances.map(i => (
                        <option key={i.id} value={i.id}>
                            {i.name}
                            {i.isDefault ? ' (默认)' : ''}
                        </option>
                    ))}
                </select>
                <button
                    onClick={click}
                    onContextMenu={useCallback(
                        (e: any) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSettingOpen(true);
                        },
                        []
                    )}
                    className="bdp-button button"
                    title="鼠标左键下载文件, 右键打开设置"
                    style={{
                        background: '#09aaff',
                        color: '#ffffff',
                        border: '1px solid #09aaff',
                    }}
                >
                    <span className="bdp-button-text">ARIA2</span>
                </button>
            </div>
            <Setting
                visible={settingOpen}
                onClose={() => setSettingOpen(false)}
            />
            {messageVisible && (
                <Message
                    visible={messageVisible}
                    pan115={pan115}
                    onClose={() => setMessageVisible(false)}
                />
            )}
        </>
    );
}

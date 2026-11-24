import { Aria2Instance } from './types';

export const defaultInstances: Aria2Instance[] = [
    {
        id: 'local',
        name: '本地 aria2',
        url: 'http://127.0.0.1:6800/jsonrpc',
        token: '',
        dir: '',
        check: false,
        checkMin: '0',
        isDefault: true,
    },
];

export const defaultSetting = {
    /** 请求间隔 (ms) */
    interval: '300',
    useSystemUserAgent: true,
    customUserAgent: navigator.userAgent,
    /** 当前选中的 aria2 实例 id */
    currentInstanceId: 'local',
    instances: defaultInstances,
};

/** 从旧版本单实例配置迁移到多实例 */
export const migrateLegacySetting = (legacy: any) => {
    if (!legacy || legacy.instances) return legacy;

    const old = legacy as any;
    const instances: Aria2Instance[] = [
        {
            id: 'migrated',
            name: '迁移自旧配置',
            url: old.url || 'http://127.0.0.1:6800/jsonrpc',
            token: old.token || '',
            dir: old.dir || '',
            check: old.check ?? false,
            checkMin: old.checkMin || '0',
            isDefault: true,
        },
    ];

    return {
        interval: old.interval || '300',
        useSystemUserAgent: old.useSystemUserAgent ?? true,
        customUserAgent: old.customUserAgent || navigator.userAgent,
        currentInstanceId: 'migrated',
        instances,
    };
};

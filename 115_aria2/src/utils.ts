import { GM_xmlhttpRequest, GM_setValue, GM_getValue } from '$';
import { defaultSetting, migrateLegacySetting } from './constant';
import { Aria2Instance, SettingKeyType, SettingType } from './types';

export const waitTime = (t?: number) => {
    t = t || parseInt(getSetting().interval) || 300;
    return new Promise(r => setTimeout(r, t));
};

export const updateInterval = (t: string) => {
    t = t.trim();
    let t2 = parseInt(t);
    if (t2 !== t2) return;
    if (t2 < 300) {
        t2 = 100;
    }
    const t3 = t2.toString();
    saveSetting({
        ...getSetting(),
        interval: t3,
    });
};

export const xhrGet = (url: string, headers?: any) => {
    return new Promise((resolve, reject) => {
        let requestObj = GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers,
            responseType: 'json',
            onload: (res: any) => {
                if (res.status === 204) {
                    requestObj.abort();
                }
                resolve(res.response || res.responseText);
            },
            onerror: (err: any) => {
                reject(err);
            },
        });
    });
};

function getCookieFromHeader(params: string) {
    var setCookieStrings =
        params
            .match(/^.*$/gm)
            ?.filter(
                c =>
                    /^set-cookie:/gi.test(c) ||
                    /^tm-setcookiedhdg-\d:/gi.test(c)
            ) || [];

    const ret = [];
    for (let index = 0; index < setCookieStrings.length; index++) {
        const setCookieStr = setCookieStrings[index]
            .replace(/^set-cookie:\s+/gi, '')
            .replace(/^tm-setcookiedhdg-\d:\s+/gi, '');
        const cookies = setCookieStr
            .replace(/expires=(.*?)GMT/g, '')
            .split(', ');

        for (let j = 0; j < cookies.length; j++) {
            const cookieStr = cookies[j];
            ret.push(cookieStr.replace(/\s?;.*$/, ''));
        }
    }
    return ret.join('; ');
}

export const xhrPost = <T2 = unknown>(
    url: string,
    data: any,
    headers: any
): Promise<T2> => {
    if (Object.prototype.toString.call(data) === '[object Object]') {
        data = JSON.stringify(data);
    }
    return new Promise<T2>((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url,
            headers,
            data,
            responseType: 'json',
            onload: res => {
                console.log('res: ', res);
                var cookie = getCookieFromHeader(res?.responseHeaders || '');
                var response: any = res.response || res.responseText;

                if (cookie) {
                    GM_setValue('115cookie', cookie);
                    try {
                        response.cookie = cookie;
                    } catch (error) {}
                } else {
                    try {
                        response.cookie = GM_getValue('115cookie', '');
                    } catch (error) {}
                }

                if (res.status === 200) {
                    resolve(response as T2);
                } else {
                    reject(res);
                }
            },
            onerror: err => {
                reject(err);
            },
        });
    });
};

export const xhr115 = () => {};

export const saveSetting = (data: SettingType) => {
    const n: any = {};
    let key: SettingKeyType;
    for (key in defaultSetting) {
        if (Object.prototype.hasOwnProperty.call(defaultSetting, key)) {
            const element = defaultSetting[key];
            if (data[key] !== element || key === 'customUserAgent') {
                n[key] = data[key];
            }
        }
    }
    GM_setValue('115aria2_config', JSON.stringify(n));
};

export const getSetting = (): Required<SettingType> => {
    try {
        let data: any = JSON.parse(GM_getValue('115aria2_config', ''));
        data = migrateLegacySetting(data);
        (Object.keys(defaultSetting) as SettingKeyType[]).forEach(
            (o: SettingKeyType) => {
                if (data[o] == null) {
                    data[o] = defaultSetting[o];
                }
            }
        );
        // 确保 currentInstanceId 有效
        if (data.instances?.length > 0) {
            const exists = data.instances.some(
                (i: Aria2Instance) => i.id === data.currentInstanceId
            );
            if (!exists) {
                const def =
                    data.instances.find((i: Aria2Instance) => i.isDefault) ||
                    data.instances[0];
                data.currentInstanceId = def.id;
            }
        }
        return data;
    } catch (error) {
        return { ...defaultSetting } as Required<SettingType>;
    }
};

export const getUA = () => {
    const { useSystemUserAgent, customUserAgent } = getSetting();
    if (useSystemUserAgent) return navigator.userAgent;
    return customUserAgent || '';
};

/** 获取当前选中的 aria2 实例 */
export const getCurrentInstance = (): Aria2Instance => {
    const setting = getSetting();
    const inst =
        setting.instances.find(i => i.id === setting.currentInstanceId) ||
        setting.instances.find(i => i.isDefault) ||
        setting.instances[0];
    return inst;
};

/** 根据 id 获取实例 */
export const getInstanceById = (id: string): Aria2Instance | undefined => {
    return getSetting().instances.find(i => i.id === id);
};

/** 切换当前实例 */
export const setCurrentInstance = (id: string) => {
    const s = getSetting();
    if (s.instances.some(i => i.id === id)) {
        saveSetting({ ...s, currentInstanceId: id });
    }
};

/** 新增实例 */
export const addInstance = (inst: Aria2Instance) => {
    const s = getSetting();
    const instances = [...s.instances, inst];
    saveSetting({ ...s, instances, currentInstanceId: inst.id });
};

/** 更新实例 */
export const updateInstance = (inst: Aria2Instance) => {
    const s = getSetting();
    const instances = s.instances.map(i =>
        i.id === inst.id ? { ...inst } : i
    );
    saveSetting({ ...s, instances });
};

/** 删除实例 (至少保留一个) */
export const removeInstance = (id: string) => {
    const s = getSetting();
    if (s.instances.length <= 1) return;
    const instances = s.instances.filter(i => i.id !== id);
    const newCurrentId =
        s.currentInstanceId === id
            ? (instances.find(i => i.isDefault) || instances[0]).id
            : s.currentInstanceId;
    saveSetting({ ...s, instances, currentInstanceId: newCurrentId });
};

/** 测试 aria2 连接 (调用 aria2.getVersion) */
export const testConnection = async (
    url: string,
    token: string
): Promise<{ ok: boolean; version?: string; error?: string }> => {
    if (!url) return { ok: false, error: 'aria2 地址不能为空' };

    const params: any[] = token ? [`token:${token}`] : [];
    const rpcData = {
        jsonrpc: '2.0',
        id: 'test',
        method: 'aria2.getVersion',
        params,
    };

    try {
        const result: any = await xhrPost(url, rpcData, {});
        if (result?.error) {
            return { ok: false, error: result.error.message || JSON.stringify(result.error) };
        }
        if (result?.result?.version) {
            return { ok: true, version: result.result.version };
        }
        return { ok: true };
    } catch (err: any) {
        const msg =
            err?.status === 0
                ? '连接失败: 无法访问 (请检查 @connect 权限)'
                : `HTTP ${err?.status || err?.code || ''}: ${err?.statusText || err?.message || JSON.stringify(err)}`;
        return { ok: false, error: msg };
    }
};

export function uuid() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x7) | 0x8).toString(16);
        }
    );
    return uuid;
}

export class defer<T = void> {
    resolve: ((value: T) => void) | null = null;
    reject: ((value: T) => void) | null = null;
    id: string;
    promise: Promise<T>;

    constructor() {
        this.id = uuid();
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        Object.freeze(this);
    }
}

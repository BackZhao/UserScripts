import { defaultSetting } from "./constant";

export interface FileObjType {
    isdir: false;
    sha1: string;
    pick_code: string;
    fileName: string;
    fileSize: number;
    parent: string;
    tryTimes: number;
}
export interface FolderObjType {
    isdir: true;
    cate_id: string;
    folderName: string
    parent: string;
}

export interface FileObjResolveType extends FileObjType {
    file_url: string;
    file_size: number
    cookie?: string
}

/** aria2 实例配置 */
export interface Aria2Instance {
    id: string;
    /** 显示名称, 如"家里的群晖" */
    name: string;
    /** aria2 JSON-RPC 地址, 如 http://127.0.0.1:6800/jsonrpc */
    url: string;
    token: string;
    /** 默认下载目录, 空字符串表示继承 aria2 全局配置 */
    dir: string;
    /** 是否开启 sha-1 校验 */
    check: boolean;
    /** 校验最小文件大小 (MB) */
    checkMin: string;
    /** 是否为默认实例 */
    isDefault?: boolean;
}

export type SettingType = Partial<typeof defaultSetting>
export type SettingKeyType = keyof SettingType;

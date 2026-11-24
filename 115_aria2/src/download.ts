import { FileObjResolveType, Aria2Instance } from './types';
import { xhrPost, getUA, getCurrentInstance, getInstanceById } from './utils';

export class DownloadTool {
    instance: Aria2Instance;

    /**
     * @param instanceId 可选, 指定 aria2 实例 id; 不传则使用当前选中的实例
     */
    constructor(instanceId?: string) {
        const inst = instanceId
            ? getInstanceById(instanceId) || getCurrentInstance()
            : getCurrentInstance();
        this.instance = inst;
    }

    async sendToAria2(item: FileObjResolveType) {
        const { instance } = this;
        var _filename = item.fileName;
        var filename = item.parent ? `${item.parent}/${_filename}` : _filename;
        const other: any = {
            dir: instance.dir || undefined,
            out: filename,
            header: [
                `User-Agent: ${getUA()}`,
                `Referer: https://115.com/`,
            ],
        };
        let rpcData: any = {
            id: item.sha1 || String(Date.now()),
            jsonrpc: '2.0',
            method: 'aria2.addUri',
            params: [[item.file_url], other],
        };
        if (instance.check && item.file_size >= parseInt(instance.checkMin || '0') * 1024 * 1024) {
            other.checksum = `sha-1=${item.sha1}`;
        }
        if (instance.token) {
            rpcData.params.unshift(`token:${instance.token}`);
        }
        if (item.cookie) {
            other.header.push(`Cookie: ${item.cookie}`);
        }
        return xhrPost(instance.url, rpcData, {});
    }
}

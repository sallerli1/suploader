import { post, isType } from './util'

export async function loadInfo (url, file, chuckSize) {
    try {
        if (!isType(File, file)) {
            throw new TypeError("file is not an File object");
        }

        return await post(url, {
            file_name: file.name,
            file_size: file.size,
            chuck_size: chuckSize
        });
    } catch (err) {
        throw err
    }
}
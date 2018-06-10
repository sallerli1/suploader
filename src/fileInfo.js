import { post, isType } from "./util";

export async function sendInfo(url, file, chuckSize) {
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
        throw err;
    }
}

export function sendFirst(uxhr) {
    let xhr = uxhr.xhr,
        file = uxhr.file,
        url = uxhr.uploader.options.uploadRoute,
        chuckSize = uxhr.uploader.options.chuckSize;

    let form = new FormData();

    form.append("number", -1);
    form.append("first", true);
    form.append("file_name", file.name);
    form.append("file_size", file.size);
    form.append("chuck_size", chuckSize);

    xhr.open("POST", url, true);
    xhr.send(form);
}
import { isType } from "./util";

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
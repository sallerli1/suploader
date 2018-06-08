export function sendBlob(xhr, url, file, start, chuckSize) {
    var form = new FormData(),
        blob = blobSlice(file,
            start * chuckSize,
            (start + 1) * chuckSize);

    form.append("number", start + 1);
    form.append("file", blob);

    xhr.open("POST", url, true);
    xhr.send(form);
}

// silce a Blob or File
export function blobSlice(blob, start, length) {
    if (blob.slice) {
        return blob.slice(start, length);
    } else if (blob.webkitSlice) {
        return blob.webkitSlice(start, length);
    } else if (blob.mozSlice) {
        return blob.mozSlice(start, length);
    } else {
        return null;
    }
}
import { sendBlob, blobSlice, isType } from './util';
import { sendFirst } from './fileInfo';
import {
    CREATED,
    READEY,
    PENDING,
    ERROR,
    STARTING,
    RUNNING,
    FINISHED
} from './util/constants';

export default class UploadXHR {
    constructor(uploader, file, lazy=true) {
        this.uploader = uploader;
        this.file = file;
        this.state = CREATED;

        if (window.XMLHttpRequest) {
            this.xhr = new XMLHttpRequest();
        } else {
            this.xhr = new ActiveXObject('Microsoft.XMLHTTP');
        }

        this.xhr.responseType = 'json';

        if (!lazy) {
            this.start();
        }
    }

    init() {
        if (this.state === READEY) {
            return;
        }

        this.state = READEY;
        return initUXHR(this);
    }

    start() {
        this.state = STARTING;
        this.init()();
    }
}

function initUXHR(uxhr) {
    const uploader = uxhr.uploader;
    const file = uxhr.file;
    const xhr = uxhr.xhr;
    const chuckSize = uploader.options.chuckSize;
    const chuckCount = Math.ceil(file.size / chuckSize);

    let windowSize = (uploader.options.windowSize &&
        uploader.options.windowSize <= Math.floor((file.size / chuckSize) / 2)) ?
        uploader.options.windowSize : Math.floor((file.size / chuckSize) / 2);

    windowSize = windowSize || 1;

    let p = -1,
        left = -1,
        right = windowSize - 1;

    let failed = [];

    let url = uploader.options.uploadRoute,
        infoUrl = uploader.options.infoRoute;

    let continueUpload = null;
    let upload = () => {
        if (uxhr.state !== RUNNING) {
            return;
        }

        //send the unsuccessfully sent chucks
        if (failed.length) {
            sendBlob(xhr, url, file, failed.shift(), chuckSize);
            return;
        }

        p++;

        //check if the file has been fully uploaded
        //if fully uploaded, free the stored info about this file
        if (p * chuckSize >= file.size && failed.length === 0) {
            uxhr.state = FINISHED;
            uploader.callbackArr.get(file)(file);
            uploader.xhrArr.delete(file);

            setTimeout(() => {
                uploader.callbackArr.delete(file);
            }, 1000 * 10);
            
            let idx = uploader.fileBuffer.findIndex(
                f => f === file
            );
            uploader.fileBuffer.splice(idx);
            if (!uploader.fileBuffer.length) {
                uploader.options.onsuccess();
            }

            return;
        }
        if (p <= right) {
            sendBlob(xhr, url, file, p, chuckSize);
            return;
        }

        uxhr.state = PENDING;
        p--;

        continueUpload = () => {
            uxhr.state = RUNNING;
            upload();
        }
    }

    //check whether a file has unsuccessfully sent chucks
    let checkIntegrity = async (res) => {

        //aquire info about progress of the upload process
        uploader.options.oninfo(res);

        let pre = left;
        left = res.ack;

        (pre === left &&
        pre !== -1 &&
        failed.indexOf(pre) < 0) &&
        failed.push(pre+1);

        right += (left - pre);
        right = right <= chuckCount -1 ? right : chuckCount -1;
        p = Math.max(left, p);

        //trigger upload
        if (isType(Function, continueUpload)) {
            console.log(continueUpload)
            continueUpload();
        }
    }

    xhr.upload.onload = async (event) => {
        if (uxhr.state === RUNNING) {
            uploader.resolveProgress(file, event, p);
        }

        if (p === -1) {
            return;
        }

        upload();
    };

    xhr.onload = async (event) => {
        checkIntegrity(xhr.response);
    }

    xhr.onerror = event => {
        uxhr.state = ERROR;
        uploader.options.onerror(event.error, file);
    }

    xhr.onprogress = (event) => {
        if (uxhr.state === RUNNING) {
            uploader.resolveProgress(file, event, p);
        }
    };

    return () => {
        sendFirst(uxhr, chuckSize);
        continueUpload = () => {
            uxhr.state = RUNNING;
            upload();
        }
    }
}
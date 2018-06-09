import eventemiter from 'eventemitter3';
import { sendBlob, blobSlice } from './util';
import { sendFirst } from './fileInfo';

const 
    CREATED = 1,
    READEY = 2,
    PENDING = 0,
    ERROR = -1,
    STARTING = 3,
    RUNNING = 4,
    FINISHED = 5;

export default class UploadXHR {
    constructor(uploader, file, lazy=true) {
        this.uploader = uploader;
        this.file = file;
        this.state = CREATED;

        if (window.XMLHttpRequest) {
            this.xhr = new XMLHttpRequest();
        } else {
            this.xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

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
        if (this.state !== READEY) {
            return;
        }

        this.state = STARTING;
        this.init()();
    }
}

function initUXHR(uxhr) {
    const uploader = uxhr.uploader;
    const file = uxhr.file;
    const xhr = uxhr.xhr;
    const chuckSize = uploader.chuckSize;

    let p = 0,
        left = -1,
        right = uploader.options.windowSize - 1;

    let failed = [];

    let url = uploader.options.uploadRoute,
        infoUrl = uploader.options.infoRoute;

    let em = new eventemiter();
    let upload = () => {

        //send the unsuccessfully sent chucks
        if (failed.length) {
            sendBlob(xhr, url, file, failed.shift(), chuckSize);
            return;
        }

        p++;

        //check if the file has been fully uploaded
        //if fully uploaded, free the stored info about this file
        if (p * chuckSize >= file.size) {
            uploader.callbackArr.get(file)();
            uploader.options.onsuccess();
            uploader.xhrArr.delete(file);
            uploader.fileBuffer[index];
            uploader.callbackArr.delete(file);

            uploader.fileBuffer.filter(v => v !== file)
            if (!uploader.fileBuffer.length) {
                uploader.options.onsuccess();
            }
        }
        if (p < right) {
            sendBlob(xhr, url, file, p, chuckSize);
            return;
        }
        p--;
    }

    //check whether a file has unsuccessfully sent chucks
    let checkIntegrity = async (res) => {

        //aquire info about progress of the upload process
        uploader.options.oninfo(res);

        let pre = left;
        left = info.ack;

        if (uxhr.state === STARTING) {
            uxhr.state = RUNNING;
        }

        (pre === left &&
        failed.indexOf(pre) < 0) &&
        failed.push(pre);

        right += (left - pre);
        //p = Math.max(left+1, p);

        //trigger upload
        em.emit('upload_start');
    }

    xhr.upload.onload = async (event) => {
        if (uxhr.state === RUNNING) {
            uploader.resolveProgress(file, event, p);
        }
        upload();
    };

    xhr.onload = async (event) => {
        checkIntegrity(xhr.response);
    }

    xhr.onerror = event => {
        uxhr.state = ERROR;
        uploader.options.onerror(event.error);
    }

    //hook function called after intergrity checking
    em.on('upload_start', () => {

        //return if the present chuck hasn't
        //reatched the right border of the sending window
        if (p < right) {
            return;
        }
        upload();
    })

    xhr.onprogress = (event) => {
        if (uxhr.state === RUNNING) {
            uploader.resolveProgress(file, event, p);
        }
    };

    return () => {
        sendFirst(uxhr, chuckSize);
    }
}
import { sendBlob, blobSlice, isType, createRTOCalculater } from './util';
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
    const chuckSize = uploader.options.chuckSize;
    const chuckCount = Math.ceil(file.size / chuckSize);

    let windowSize = (uploader.options.windowSize &&
        uploader.options.windowSize <= Math.floor((file.size / chuckSize) / 2)) ?
        uploader.options.windowSize : Math.floor((file.size / chuckSize) / 2);

    windowSize = windowSize || 1;

    let p = -1,
        left = -1,
        right = windowSize - 1;

    let RTT;
    let RTO;
    let sendTime;
    let RTOCalculater = createRTOCalculater();

    let failed = [];

    let url = uploader.options.uploadRoute;
    let filePath;

    let continueUpload = null;

    let initXhr = () => {
        let xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else {
            xhr = new ActiveXObject('Microsoft.XMLHTTP');
        }

        xhr.responseType = 'json';
        xhr.timeout = RTO ? RTO : RTT ? RTT : (60 * 1000);

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
            if (
                (xhr.status < 200 || xhr.status >= 300) &&
                xhr.status !== 304
            ){
                uxhr.state = ERROR;
                uploader.options.onerror({
                    code: xhr.status,
                    data: xhr.response
                }, file);
                uploader.remove(file);
                return;
            }

            if (!filePath) {
                filePath = xhr.response.path;
            }

            if (!RTT) {
                RTT = Date.now() - sendTime;
            } else if (!RTO) {
                RTT = Date.now() - sendTime;
                RTO = RTOCalculater.getFirstRTO(RTT);
            } else {
                RTT = Date.now() - sendTime;
                RTO = RTOCalculater.getRTO(RTT);
            }

            checkIntegrity(xhr.response);
        }
    
        xhr.onerror = event => {
            uxhr.state = ERROR;
            uploader.options.onerror(event.error, file);
            uploader.remove(file);
        }
    
        xhr.upload.onprogress = (event) => {
            if (uxhr.state === RUNNING) {
                uploader.resolveProgress(file, event, p);
            }
        };

        sendTime = Date.now();
        return xhr;
    };
    let upload = () => {
        if (uxhr.state !== RUNNING) {
            return;
        }

        //send the unsuccessfully sent chucks
        if (failed.length) {
            sendBlob(initXhr(), url, file, failed.shift(), chuckSize);
            return;
        }

        if (
            p < right &&
            (p + 1) * chuckSize < file.size
        ) {
            sendBlob(initXhr(), url, file, ++p, chuckSize);
            return;
        }

        uxhr.state = PENDING;
        p--;

        setContinueUpload();
    }

    let setContinueUpload = () => {
        continueUpload = () => {
            if (uxhr.state === RUNNING) {
                return;
            }
            uxhr.state = RUNNING;
            upload();
        }
    };

    //check whether a file has unsuccessfully sent chucks
    let checkIntegrity = async (res) => {

        //aquire info about progress of the upload process
        uploader.options.oninfo(res);

        let pre = left;
        left = res.ack;

        if (
            pre === left &&
            pre !== -1 &&
            failed.indexOf(pre + 1) < 0
        ) {
            failed.push(pre+1);
        }
        
        right += (left - pre);
        right = right <= chuckCount -1 ? right : chuckCount -1;
        p = Math.max(left, p);

        //check if the file has been fully uploaded
        //if fully uploaded, free the stored info about this file
        if (
            (p + 1) * chuckSize >= file.size && 
            failed.length === 0
        ) {
            uxhr.state = FINISHED;
            uploader.callbackArr.get(file)(file, filePath);
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

        //trigger upload
        if (isType(Function, continueUpload)) {
            continueUpload();
        }
    }

    return () => {
        sendFirst(uxhr, initXhr());
        setContinueUpload();
    }
}
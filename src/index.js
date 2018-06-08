import { sendBlob, blobSlice, isType } from './util';
import { loadInfo } from './fileInfo';

class fileUploader {

    constructor(options) {
        this.fileBuffer = [];
        this.totalSize = 0;
        this.loadedMap = new Map();
        this.loaded = 0;
        this.xhrArr = new Map();
        this.urlArr = new Map();
        this.callbackArr = new Map();
        this.progress = 0;
        this.allProgress = new Map();

        this.options = {
            uploadRoute = options.uploadRoute,
            infoRoute = options.infoRoute,
            chuckSize = options.chuckSize || 1024 * 1024 * 100, //100MB
            windowSize = options.windowSize || 5,
            onsuccess = isType(Function, options.onsuccess) ?
                options.onsuccess :
                function(){},
            onprogress = isType(Function, options.onsuccess) ?
                options.onprogress :
                function(){},
        };
    }

    //init an XMLHttpRequest object to bind eventlisteners
    //xhr: an XMLHttpRequest object
    //index: the index of the file in the buffer
    initXHR(xhr, file) {

        let start = 0,
            left = -1,
            right = this.options.windowSize - 1;

        let failed = [];
        let fixXhr  = new XMLHttpRequest();

        let url = this.options.uploadRoute,
            infoUrl = this.options.infoRoute;

        let checkIntegrity = async () => {
            let info = await loadInfo(infoUrl, file);
            let limit = Math.max(info.last, right);

            failed = [];
            for (const chuckIdx of info.unsent) {
                if (chuckIdx > limit) {
                    break;
                }
                failed.push(chuckIdx)
            }

            if (failed.length) {
                sendBlob(fixXhr, url, file, failed.shift(), this.options.chuckSize)
            } else if (start * this.options['chuckSize'] < file.size) {
                left = info.last;
                right = left + this.options.windowSize;
                sendBlob(xhr, url, file, start, this.options.chuckSize);
            }
        }

        fixXhr.upload.onload = async (event) => {
            if (!failed.length) {
                let info = await loadInfo(infoUrl, file);
                await checkIntegrity()
                return;
            }

            sendBlob(fixXhr, url, file, failed.shift(), this.options.chuckSize)
        }

        xhr.upload.onload = async (event) => {
            this.resolveProgress(file, event, start);

            start++;

            if (start < right) {
                sendBlob(xhr, url, file, start, this.options.chuckSize);
            } else if (start * this.options['chuckSize'] < file.size) {
                await checkIntegrity();
            } else {
                await checkIntegrity();
                if (!failed.length) {
                    this.callbackArr.get(file)();

                    this.xhrArr.delete(file);
                    this.fileBuffer[index];
                    this.callbackArr.delete(file);

                    this.fileBuffer.filter(v => v !== file)

                    if (!this.fileBuffer.length) {
                        this.options.onsuccess();
                    }
                }
            }
        };

        xhr.onprogress = (event) => {
            this.resolveProgress(file, event, start);
        };

        return () => {
            checkIntegrity()
        }
    }

    //calculate the progress of a file being sent then store it
    //file: the file to upload(a blob object)
    //step: the number of the chuck being sent
    resolveProgress(file, event, step) {
        var loaded = step * this.options['chuckSize'] + event.loaded;

        this.loadedMap.set(file, loaded);
        this.loaded = 0;
        this.loadedMap.forEach(function (loaded, file) {
            this.loaded += loaded;
        }, this);

        this.allProgress.set(file, ((loaded) * 100 / file.size).toFixed(2));
        this.progress = ((this.loaded * 100) / this.totalSize).toFixed(2);
        
        this.options.onprogress(this.allProgress.get(file), this.progress);
    }

    //add a file to the file buffer waiting to be uploaded
    //url: the url to upload the file
    //file: the file to upload(a blob object)
    //callback: a callback function which will be called after the file has been successfully uploaded
    add(file, callback) {
        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);
        this.callbackArr.set(file, callback);
    }

    //flush the file buffer to upload every file in it
    flush() {

        var fileBuffer = this.fileBuffer;

        for (var i = 0; i < fileBuffer.length; ++i) {

            if (window.XMLHttpRequest) {
                this.xhrArr.set(fileBuffer[i], new XMLHttpRequest())
            } else {
                this.xhrArr.set(fileBuffer[i], new ActiveXObject("Microsoft.XMLHTTP"));
            }

            this.initXHR(this.xhrArr.get(file), fileBuffer[i])();
        }
    }

    //upload a file instantly
    //url: the url to upload the file
    //callback: a callback function which will be called after the file has been successfully uploaded
    upload(url, file, callback) {

        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);

        if (window.XMLHttpRequest) {
            this.xhrArr.set(file, new XMLHttpRequest())
        } else {
            this.xhrArr.set(file, new ActiveXObject("Microsoft.XMLHTTP"));
        }

        this.callbackArr.set(file, callback);

        this.initXHR(this.xhrArr.get(file), this.fileBuffer[this.fileBuffer.length - 1])();
    }
}
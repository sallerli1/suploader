import eventemiter from 'eventemitter3';
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
            timing = isType(Number, options.timing) ? options.timing : 1000,
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
            onerror = isType(Function, options.onerror) ?
                options.onerror :
                function(){},
            oninfo = isType(Function, options.oninfo) ?
                options.onprogress :
                function(){},
        };
    }

    /**
     * @description readey an xhr object for uploading a file
     * @param {XMLHttpRequest} xhr 
     * @param {File} file 
     * @returns {Function} start trigger
     */
    initXHR(xhr, file) {

        let p = 0,
            left = -1,
            right = this.options.windowSize - 1;

        let failed = [];

        let url = this.options.uploadRoute,
            infoUrl = this.options.infoRoute;

        let em = new eventemiter();
        let upload = () => {

            //send the unsuccessfully sent chucks
            if (failed.length) {
                sendBlob(xhr, url, file, failed.shift(), this.options.chuckSize);
                return;
            }

            p++;

            //check if the file has been fully uploaded
            //if fully uploaded, free the stored info about this file
            if (p * this.options['chuckSize'] >= file.size) {
                this.callbackArr.get(file)();
                this.options.onsuccess();
                this.xhrArr.delete(file);
                this.fileBuffer[index];
                this.callbackArr.delete(file);

                this.fileBuffer.filter(v => v !== file)
                if (!this.fileBuffer.length) {
                    this.options.onsuccess();
                }
            }
            if (p < right) {
                sendBlob(xhr, url, file, p, this.options.chuckSize);
                return;
            }
            p--;
        }

        //check whether a file has unsuccessfully sent chucks
        let checkIntegrity = async () => {

            //aquire info about progress of the upload process
            let info = await loadInfo(infoUrl, file);
            this.options.oninfo(info);
            left = info.last
            right = left + this.options.windowSize;
            p = Math.max(left+1, p);

            failed = [];
            for (const chuckIdx of info.unsent) {
                if (chuckIdx > left) {
                    break;
                }
                failed.push(chuckIdx)
            }

            //trigger upload
            em.emit('upload_start');
        }

        xhr.upload.onload = async (event) => {
            this.resolveProgress(file, event, p);
            upload();
        };

        xhr.onerror = event => {
            this.options.onerror(event.error);
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
            this.resolveProgress(file, event, p);
        };

        return () => {
            checkIntegrity()
            setInterval(checkIntegrity, this.options.timing)
        }
    }

    /**
     * @description calculate the progress of a file being sent then store it
     * @param {File} file 
     * @param {Event} event 
     * @param {Number} step 
     */
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

    /**
     * @description add a file to the file buffer waiting to be uploaded
     * @param {File} file 
     * @param {Function} callback 
     */
    add(file, callback) {
        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);
        this.callbackArr.set(file, callback);
    }

    /**
     * flush the file buffer to upload every file in it
     */
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

    /**
     * @description upload a file instantly
     * @param {String} url 
     * @param {File} file 
     * @param {Function} callback 
     */
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
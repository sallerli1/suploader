import eventemiter from 'eventemitter3';
import { sendBlob, blobSlice, isType } from './util';
import UploadXHR from './uploadXHR';

class fileUploader {

    constructor(options) {
        this.fileBuffer = [];
        this.totalSize = 0;
        this.loadedMap = new Map();
        this.loaded = 0;
        this.xhrArr = new Map();
        this.callbackArr = new Map();
        this.progress = 0;
        this.allProgress = new Map();

        this.options = {
            timing = isType(Number, options.timing) ? options.timing : 1000,
            uploadRoute = options.uploadRoute,
            infoRoute = options.infoRoute,
            chuckSize = options.chuckSize || 1024 * 1024 * 1, //1MB
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
        this.xhrArr.set(file, new UploadXHR(this, file));
    }

    /**
     * flush the file buffer to upload every file in it
     */
    flush() {

        var fileBuffer = this.fileBuffer;

        for (var i = 0; i < fileBuffer.length; ++i) {
            this.xhrArr.get(fileBuffer[i]).start();
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

        let uxhr = new UploadXHR(this, file);

        this.xhrArr.set(file, uxhr);
        this.callbackArr.set(file, callback);

        uxhr.start();
    }
}
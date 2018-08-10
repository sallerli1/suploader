import { sendBlob, blobSlice, isType } from './util';
import UploadXHR from './uploadXHR';
import {
    PENDING,
    ERROR,
    RUNNING,
    FINISHED
} from './util/constants';

export default class FileUploader {

    /**
     * constructor of Suploader
     * @param {object} options 
     * @param {string} [options.uploadRoute] url of the upload target
     * @param {number} [options.chuckSize] size per chuck
     * @param {number} [options.windowSize] size of the sending window
     * @param {function} [options.onsuccess]
     * @param {function} [options.onprogress]
     * @param {function} [options.onerror]
     * @param {function} [options.oninfo]
     */
    constructor (options) {
        this.fileBuffer = [];
        this.totalSize = 0;
        this.loadedMap = new Map();
        this.loaded = 0;
        this.xhrArr = new Map();
        this.callbackArr = new Map();
        this.progress = 0;
        this.allProgress = new Map();

        this.options = {
            uploadRoute: options.uploadRoute,
            chuckSize: options.chuckSize || 1024 * 1024 * 1, //1MB
            windowSize: options.windowSize,
            onsuccess: isType(Function, options.onsuccess) ?
                options.onsuccess :
                function(){},
            onprogress: isType(Function, options.onprogress) ?
                options.onprogress :
                function(){},
            onerror: isType(Function, options.onerror) ?
                options.onerror :
                function(){},
            oninfo: isType(Function, options.oninfo) ?
                options.oninfo :
                function(){},
        };
    }

    /**
     * @description calculate the progress of a file being sent then store it
     * @param {File} file 
     * @param {Event} event 
     * @param {Number} step 
     */
    resolveProgress (file, event, step) {
        let loaded = step * this.options['chuckSize'] + event.loaded;

        this.loadedMap.set(file, loaded);
        this.loaded = 0;
        this.loadedMap.forEach(function (loaded, file) {
            this.loaded += loaded;
        }, this);

        this.allProgress.set(file, ((loaded) * 100 / file.size).toFixed(2));
        this.progress = ((this.loaded * 100) / this.totalSize).toFixed(2);
        this.progress =  
        
        this.options.onprogress(file, this.allProgress.get(file), this.progress);
    }

    /**
     * @description add a file to the file buffer waiting to be uploaded
     * @param {File} file 
     * @param {Function} callback 
     */
    add (file, callback) {
        callback = isType(Function, callback) ?
            callback :
            function () {};

        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);
        this.callbackArr.set(file, callback);
        this.xhrArr.set(file, new UploadXHR(this, file));
    }

    remove (file) {
        let state = this.xhrArr.get(file).state;
        if (
            state === RUNNING ||
            state === PENDING ||
            state === FINISHED ||
            state === ERROR 
        ) {
            return;
        }
        let idx = this.fileBuffer.findIndex(
            f => f === file
        );
        if (idx < 0) {
            return;
        }

        this.fileBuffer.splice(idx, 1);
        this.totalSize -=file.size;
        this.loadedMap.delete(file);
        this.callbackArr.delete(file);
        this.callbackArr.delete(file);
        this.xhrArr.delete(file);
    }

    /**
     * flush the file buffer to upload every file in it
     */
    flush () {

        let fileBuffer = this.fileBuffer;

        for (let i = 0; i < fileBuffer.length; ++i) {
            let xhr = this.xhrArr.get(fileBuffer[i]);
            if (
                xhr.state === RUNNING ||
                xhr.state === PENDING ||
                xhr.state === FINISHED
            ) {
                continue;
            }

            xhr.start();
        }
    }

    /**
     * @description upload a file instantly
     * @param {File} file 
     * @param {Function} callback 
     */
    upload (file, callback) {
        callback = isType(Function, callback) ?
            callback :
            function () {};

        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);

        let uxhr = new UploadXHR(this, file);

        this.xhrArr.set(file, uxhr);
        this.callbackArr.set(file, callback);

        uxhr.start();
    }
}
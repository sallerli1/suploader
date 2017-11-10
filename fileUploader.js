
/*
* Author: saller
* Date：2017-11-04
*
* this code is written under ECMS2017
*
* this is a fileUploader which could
*    1: add multiple files into a buffer waiting to upload
*    2: flush the buffer to upload every file in it
*    3: divide big files into chucks then upload each when uploading,
*       this method ensures that when most of the file is successfully uploaded,
*       the whole file wouldn't need to be uploaded again, you will only need to upload the unsent parts
*    4: store progresses of each file being uploaded and the whole progress
*    5: bind callback functions to every file to upload, which would be called after successfully uploaded
*/

class fileUploader {

    constructor() {
        this.fileBuffer = [];
        this.fileLock = new Map();
        this.totalSize = 0;
        this.loadedMap = new Map();
        this.loaded = 0;
        this.xhrArr = new Map();
        this.callbackArr = new Map();
        this.progress = 0;
        this.allProgress = new Map();

        this.options = {
            chuckSize = 1024 * 1024 * 100, //100MB
            dataFilter = null
        };
    }

    //init an XMLHttpRequest object to bind eventlisteners
    //xhr: an XMLHttpRequest object
    //index: the index of the file in the buffer
    initXHR(xhr, index) {

        var start = 0,
            uploader = this;

        var sendBlob = this.sendBlob,
            file = this.fileBuffer[index];

        var url = this.urlArr.get(file)

        xhr.upload.onload = function (event) {
            uploader.resolveProgress(file, event, start);

            start++;
            if (start * uploader.options['chuckSize'] < file.size) {
                sendBlob(url, file, start);
            } else {
                uploader.sendConfirmInfo(xhr, url, file);
            }
        };

        xhr.onprogress = function (event) {
            uploader.resolveProgress(file, event, start);
        };

        xhr.onload = function (event) {
            if (this.readyState = 4 &&
                ((this.status >= 200 && this.status <= 300) || this.status == 304)) {
                switch (this.response['type']) {
                    case "Info": {
                        if (this.response['success']) {
                            uploader.fileLock.set(ufile, true);
                            sendBlob(xhr, url, file, 0);
                        } else {
                            uploader.sendFileInfo(xhr, url, file);
                        }
                        break;
                    }

                    case "confirm": {
                        if (this.response['success']) {
                            uploader.xhrArr.delete(file);
                            delete uploader.fileBuffer[index];
                            uploader.callbackArr.get(file)();
                            uploader.callbackArr.delete(file);
                            uploader.urlArr.delete(file);
                            uploader.fileLock.delete(file);
                        } else {
                            uploader.resolveUnsentChucks(file, this.response['unsent']);
                        }
                        break;
                    }

                    default:
                        break;
                }
            }
        }
    }

    //taking differences among browsers into consideration while slicing a blob
    blobSlice(blob, start, end) {
        if (blob.slice) {
            return blob.slice(start, end);
        } else if (blob.webkitSlice) {
            return blob.webkitSlice(start, end);
        } else if (blob.mozSlice) {
            return blob.mozSlice(start, end);
        } else {
            return null;
        }
    }

    //upload parts of a file
    //xhr: an XMLHttpRequest object
    //url: the url to upload the file
    //file: the file to upload(a blob object)
    //start: start point of the file at which you want to slice
    sendBlob(xhr, url, file, start) {
        var form = new FormData(),
            blob = uploader.blobSlice(file,
                start * uploader.options['chuckSize'],
                (start + 1) * uploader.options['chuckSize']);

        form.append("number", start + 1);
        form.append("file", blob);

        xhr.open("POST", url, true);
        xhr.send(form);
    }

    //send the basic infomation about a file before uploading
    //xhr: an XMLHttpRequest object
    //url the url to upload the file
    //file: the file to upload(a blob object)
    sendFileInfo(xhr, url, file) {
        if (this.fileLock.get(file)) {
            return;
        }

        var form = new FormData();

        form.append("type", "beforeSent")
        form.append("fileName", file.name);
        form.append("fileSize", file.size);
        form.append("chuckCount", Math.floor(file.size / this.options['chuckSize']));

        xhr.open("POST", url, false);
        xhr.send(form);
    }

    //send a message to confirm if the file has been successfully uploaded
    //xhr: an XMLHttpRequest object
    //url: the url to upload the file
    //file: the file to upload(a blob object)
    sendConfirmInfo(xhr, url, file) {
        var form = new FormData();

        form.append("type", "afterSent");
        form.append("fileName", file.name);
        form.append("fileSize", file.size);
        form.append("fileType", file.type);
        form.append("chuckCount", Math.floor(file.size / this.options['chuckSize']));

        xhr.open("POST", url, false);
        xhr.send(form);
    }

    //resend the unsuccessfully sent parts of a file then confirm again
    //file: the file to upload(a blob object)
    //unsentNumber: an array of the index of the chucks unsuccessfully sent (Array object)
    resolveUnsentChucks(file, unsentNumber) {

        var sendBlob = this.sendBlob;

        var xhr = this.xhrArr.get(file),
            url = this.urlArr.get(file);

        xhr.upload.onload = null;
        unsentNumber.forEach(function (element) {
            sendBlob(xhr, url, file, element);
        }, this);

        this.sendConfirmInfo(xhr, url, file);
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
    }

    //add a file to the file buffer waiting to be uploaded
    //url: the url to upload the file
    //file: the file to upload(a blob object)
    //callback: a callback function which will be called after the file has been successfully uploaded
    add(url, file, callback) {
        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);
        this.urlArr.set(file, url);
        this.callbackArr.set(file, callback);
        this.fileLock.set(file, false);
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

            this.initXHR(this.xhrArr.get(file), i);
            this.sendFileInfo(this.xhrArr.get(file), this.urlArr.get(file), file);
        }
    }

    //upload a file instantly
    //url: the url to upload the file
    //callback: a callback function which will be called after the file has been successfully uploaded
    upload(url, file, callback) {

        this.fileBuffer.push(file);
        this.totalSize += file.size;
        this.loadedMap.set(file, 0);
        this.fileLock.set(file, false);

        if (window.XMLHttpRequest) {
            this.xhrArr.set(file, new XMLHttpRequest())
        } else {
            this.xhrArr.set(file, new ActiveXObject("Microsoft.XMLHTTP"));
        }

        this.callbackArr.set(file, callback);
        this.urlArr.set(file, url);

        this.initXHR(this.xhrArr.get(file), this.fileBuffer.length - 1);
        this.sendFileInfo(this.xhrArr.get(file), url, file);
    }

    //change the default setting of the fileUploader
    setOptions(options) {
        if (options['chuckSize']) {
            this.options['chuckSize'] = options['chuckSize'];
        }
        if (options['dataFilter']) {
            this.options['dataFilter'] = options['dataFilter'];
        }
    }
}
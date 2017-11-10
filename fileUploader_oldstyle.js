/*
* Author: saller
* Date：2017-11-04
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
function fileUploader() {

    this.UPLOADABLE = 4;
    this.UPLOADING = 5;
    this.UPLOADED = 6;

    this.fileBuffer = [];
    this.fileState = new Map();
    this.totalSize = 0;
    this.loadedMap = new Map();
    this.loaded = 0;
    this.urlArr = new Map();
    this.xhrArr = new Map();
    this.callbackArr = new Map();
    this.progress = 0;
    this.allProgress = new Map();

    this.options = {
        chuckSize: 1024*1024*100, //100MB
        dataFilter: null
    };
}

//init an XMLHttpRequest object to bind eventlisteners
//xhr: an XMLHttpRequest object
//index: the index of the file in the buffer
fileUploader.prototype.initXHR = function(xhr, index) {

    var start = 0,
        uploader = this,
        file = this.fileBuffer[index];

    var url = this.urlArr.get(file)

    xhr.upload.onload = function(event) {

        var state = uploader.fileState.get(file);
        var s = uploader.UPLOADABLE;
        if (state !== uploader.UPLOADING) {
            return;
        }

        uploader.resolveProgress(file,event,start);

        start++;
        if (start * uploader.options['chuckSize'] < file.size) {
            uploader.sendBlob(xhr, url, file, start);
        } else {
            uploader.fileState.set(file, uploader.UPLOADED);
            uploader.sendConfirmInfo(xhr, url, file);
        }
    };

    xhr.onprogress = function(event) {

        if (uploader.fileState.get(file) !== uploader.UPLOADING) {
            return;
        }

        uploader.resolveProgress(file,event,start);
    };

    xhr.onload = function(event) {
        if (this.readyState = 4 && 
            ( (this.status>=200 && this.status<=300) || this.status == 304 ) ) {
                switch (this.response['type']) {
                    case "Info": {
                        if (this.response['success']) {
                            if (this.response['state'] == 0) {
                                uploader.fileState.set(file, uploader.UPLOADING);
                                uploader.sendBlob(xhr, url, file, 0);
                            } else if (this.response['state'] == 1) {
                                uploader.sendConfirmInfo(xhr, url, file);
                            }
                        } else {
                            uploader.sendFileInfo(xhr, url, file);
                        }
                        break;
                    }
                
                    case "Confirm": {
                        if (this.response['success']) {
                            uploader.xhrArr.delete(file);
                            delete uploader.fileBuffer[index];
                            uploader.callbackArr.get(file)();
                            uploader.callbackArr.delete(file);
                            uploader.urlArr.delete(file);
                            uploader.fileState.delete(file);
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
fileUploader.prototype.blobSlice = function(blob, start, end) {
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
fileUploader.prototype.sendBlob = function(xhr, url, file, start) {
    var form = new FormData(),
        blob = this.blobSlice(file,
            start * this.options['chuckSize'],
            (start + 1) * this.options['chuckSize']);

    form.append("type", "File");
    form.append("fileName", file.name);
    form.append("number", start);
    form.append("file", blob);

    xhr.open("POST", url, true);
    xhr.responseType = "json";
    xhr.send(form);
}

//send the basic infomation about a file before uploading
//xhr: an XMLHttpRequest object
//url the url to upload the file
//file: the file to upload(a blob object)
fileUploader.prototype.sendFileInfo = function(xhr, url, file) {
    if (this.fileState.get(file) !== this.UPLOADABLE) {
        return;
    }

    var form = new FormData();

    form.append("type", "Info")
    form.append("fileName", file.name);
    form.append("fileType",file.type);
    form.append("fileSize", file.size);
    form.append("chuckCount", Math.ceil(file.size/this.options['chuckSize']));

    xhr.open("POST", url, true);
    xhr.responseType = "json";
    xhr.send(form);
}

//send a message to confirm if the file has been successfully uploaded
//xhr: an XMLHttpRequest object
//url: the url to upload the file
//file: the file to upload(a blob object)
fileUploader.prototype.sendConfirmInfo = function(xhr, url, file) {
    var form = new FormData();

    form.append("type", "Confirm");
    form.append("fileName", file.name);
    form.append("fileSize", file.size);
    form.append("fileType", file.type);
    form.append("chuckCount", Math.ceil(file.size/this.options['chuckSize']));

    xhr.open("POST", url, true);
    xhr.responseType = "json";
    xhr.send(form);
}

//resend the unsuccessfully sent parts of a file then confirm again
//file: the file to upload(a blob object)
//unsentNumber: an array of the index of the chucks unsuccessfully sent (Array object)
fileUploader.prototype.resolveUnsentChucks = function(file, unsentNumber) {

    var uploader =this,
        xhr = uploader.xhrArr.get(file),
        url = this.urlArr.get(file),
        promise = [];

    unsentNumber.forEach(function(element) {

        promise.push(new Promise(function (resolve, reject) {
            xhr = uploader.xhrArr.get(file);
            xhr.upload.onload = function () {
                resolve();
            };

            uploader.sendBlob(xhr, url, file, element);

        }));
    }, this);

    Promise.all(promise).then(function() {
        uploader.sendConfirmInfo(xhr, url, file);
    })

}

//calculate the progress of a file being sent then store it
//file: the file to upload(a blob object)
//step: the number of the chuck being sent
fileUploader.prototype.resolveProgress = function(file, event, step) {
    var loaded = step*this.options['chuckSize']+event.loaded;

    this.loadedMap.set(file,loaded);
    this.loaded = 0;
    this.loadedMap.forEach(function(loaded, file) {
        this.loaded += loaded;
    },this);

    this.allProgress.set(file, ((loaded)*100/file.size).toFixed(2));
    this.progress = ((this.loaded * 100) / this.totalSize).toFixed(2);
}

//add a file to the file buffer waiting to be uploaded
//url: the url to upload the file
//file: the file to upload(a blob object)
//callback: a callback function which will be called after the file has been successfully uploaded
fileUploader.prototype.add = function(url, file, callback) {
    this.fileBuffer.push(file);
    this.totalSize+=file.size;
    this.loadedMap.set(file, 0);
    this.urlArr.set(file, url);
    this.callbackArr.set(file, callback);
    this.fileState.set(file, this.UPLOADABLE);
}

//flush the file buffer to upload every file in it
fileUploader.prototype.flush = function() {

    var fileBuffer = this.fileBuffer;

    for (var i = 0; i<fileBuffer.length; ++i) {

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
fileUploader.prototype.upload = function(url, file, callback) {

    this.fileBuffer.push(file);
    this.totalSize+=file.size;
    this.loadedMap.set(file, 0);
    this.fileState.set(file, this.UPLOADABLE);

    if (window.XMLHttpRequest) {
        this.xhrArr.set(file, new XMLHttpRequest())
    } else {
        this.xhrArr.set(file, new ActiveXObject("Microsoft.XMLHTTP"));
    }

    this.callbackArr.set(file, callback);
    this.urlArr.set(file, url);

    this.initXHR(this.xhrArr.get(file), this.fileBuffer.length-1);
    this.sendFileInfo(this.xhrArr.get(file), url, file);
}

//change the default setting of the fileUploader
fileUploader.prototype.setOptions = function(options) {
    if (options['chuckSize']) {
        this.options['chuckSize'] = options['chuckSize'];
    }
    if (options['dataFilter']) {
        this.options['dataFilter'] = options['dataFilter'];
    }
}
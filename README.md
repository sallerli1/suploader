# suploader

an file uploader that supports breakpoint resuming

this uploader is designed to upload file as quickly as possiable, files are uploaded chuck by chuck.

requires certain implementation on the server side

## Install

```sh
npm intall suploader
```

## Usage

### create an instance

```js
import Suploader from 'suploader'
let Uploader = new Suploader({
    uploadRoute: 'url of the upload target',
    chuckSize: 1024 * 1024 * 3,
    windowSize: 3,
    onsuccess () {
        ...
    },
    onprogress (file, currentFileProgress, allProgress) {
        ...
    },
    onerror (err) {
        ...
    },
    oninfo (res) {
        ...
    }
})
```

#### options

##### uploadRoute
route of the uploading target

##### chuckSize
byte size of each chuck 

##### windowSize
windowSize is the maximum count of chucks allowed to upload without comfirmation from server side, it is of the same notion as the windowSize of silding window protocol

##### onsuccess
callback function called when all files in the filebuffer are successfully uploaded

##### onprogress (file: File, currentFileProgress: number, allProgress: number)
callback function called when uploading progress updates

file: current uploading file
currentFileProgress: progress of current uploading file
allProgress: progress of all files being uploaded

##### onerror (err) 
callback function called when network error occurs

##### oninfo (res)
callback funtion called when server side comfirmation is received, which is usefull when custom logic is required along side the default params

### add file and flush

you can add files to the file buffer of an uploader to flush later

#### add (file: File, callback: Function)

add a file to the file buffer

##### file
file to add

##### callback (file)
callback function when the file is successfully uploaded

#### flush ()

upload all added files

### upload a file instantly

#### upload (file: File, callback: Function)
upload a file

##### file
file to upload

##### callback (file)
callback function when the file is successfully uploaded

## Server Side Implementation
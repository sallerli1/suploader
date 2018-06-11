import Uploader from "./FileUploader";
import eventUtil from "./eventUtil";

let uploader = new Uploader({
    uploadRoute: "/upload",
    chuckSize: 1024 * 10
});

let file = null;

let input = document.querySelector("input[type='file']");
let button = document.querySelector("#button");

eventUtil.addHandler(input, "change", function() {
    file = this.files[0];
});

eventUtil.addHandler(button, "click", () => {
    uploader.upload(file, () => {
        console.log('success');
    })
})

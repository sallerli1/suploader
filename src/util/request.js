import { isType } from "./type";

function jsonToUrl(param, key) {
    var paramStr = "";
    if (
        typeof param === "string" ||
        typeof param === "number" ||
        typeof param === "boolean"
    ) {
        paramStr +=
            "&" + encodeURIComponent(key) + "=" + encodeURIComponent(param);
    } else {
        if (Array.isArray(param)) {
            for (let i = 0; i < param.length; i++) {
                var k = key == null ? i : key + "[" + i + "]";
                paramStr += "&" + jsonToUrl(param[i], k);
            }
        } else if (
            Object.prototype.toString.call(param) === "[object Object]"
        ) {
            for (const keyStr of Object.keys(param)) {
                var k = key == null ? keyStr : key + "[" + keyStr + "]";
                paramStr += "&" + jsonToUrl(param[keyStr], k);
            }
        } else {
            paramStr += "&" + encodeURIComponent(key) + "=";
        }
    }
    return paramStr.substr(1);
}

export function fetch(method, url, data, headers) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.onload = () => {
            resolve(xhr.response);
        };
        xhr.onerror = event => {
            reject(event.error);
        };
        xhr.responseType = "json";

        xhr.open(method, url, true);

        headers = isType(Object, headers) ? headers : {};

        for (const key of Object.keys(headers)) {
            xhr.setRequestHeader(key, headers[key]);
        }

        if (!headers["Content-Type"]) {
            xhr.setRequestHeader(
                "Content-Type",
                "application/x-www-form-urlencoded"
            );
        }

        if (
            headers["Content-Type"] === "application/x-www-form-urlencoded" &&
            isType(Object, data)
        ) {
            data = jsonToUrl(data);
        }

        xhr.send(data);
    });
}

export function get(url, data, headers) {
    return fetch("GET", url, data, headers);
}

export function post(url, data, headers) {
    return fetch("POST", url, data, headers);
}

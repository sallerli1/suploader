let Koa = require("koa");
let Router = require("koa-router");
let app = new Koa();
let router = new Router();
let fse = require("fs-extra");
let path = require("path");

app.use(
    require("koa-static")(__dirname + "/public", {
        maxage: 1000 * 60 * 60 * 24 * 365
    })
);

let multer = require("koa-multer");

let storage = multer.diskStorage({
    //文件保存路径
    destination: async function(req, file, cb) {
        let params = req.body,
            storage = path.resolve(
                `./server/uploads/files/${params.file_name}`
            );

        if (!(await fse.exists(storage))) {
            await fse.mkdir(storage);
        }

        cb(null, storage);
    },

    //修改文件名称
    filename: function(req, file, cb) {
        //var fileFormat = (file.originalname).split('.');
        //cb(null, `${Date.now()}.${fileFormat[fileFormat.length - 1]}`);
        cb(null, `${req.body.number}-${req.body.file_name}`);
    }
});

let upload = multer({ storage });

router.post("/upload", upload.single("file"), async (ctx, next) => {
    let info,
        params = ctx.req.body,
        file = ctx.req.file,
        ack = -1;

    let number = parseInt(params.number);

    if (
        !(await fse.exists(
            path.resolve(`./server/uploads/info/${params.file_name}.json`)
        ))
    ) {
        console.log("create");
        info = {
            last: -1,
            buffer: [],
            fileName: "",
            fileSize: 0,
            chuckSize: 0,
            chuckCount: 0
        };
    } else {
        console.log("read");
        info = await fse.readJSON(
            path.resolve(`./server/uploads/info/${params.file_name}.json`)
        );
    }

    if (params["first"] || params["number"] < 0) {
        info.fileName = params.file_name;
        info.fileSize = params.file_size;
        info.chuckSize = params.chuck_size;
        info.chuckCount = Math.ceil(info.fileSize / info.chuckSize);
        console.log(info);
    }

    if (number !== info.last + 1) {
        ack = info.last;
        number > info.last &&
            info.buffer.indexOf(number) < 0 &&
            info.buffer.push(number);
        console.log(1, number, ack, info.last);
    } else {
        ack = ++info.last;
        while (info.buffer.length) {
            if (info.buffer[0] === ack + 1) {
                ack = ++info.last;
                info.buffer.shift();
            } else break;
        }
        console.log(2, number, ack, info.last);
    }

    fse.writeJSON(
        path.resolve(`./server/uploads/info/${params.file_name}.json`),
        info
    );

    if (ack >= info.chuckCount-1) {
        cancatFiles(params.file_name, info.chuckCount)
    }

    ctx.body = {
        ack
    };
});

async function cancatFiles(filename, cnt) {
    for (let i = 0; i < cnt; i++) {
        await fse.appendFile(
            path.resolve(
                `./server/uploads/files/${filename}`,
                `${filename}`
            ),
            await fse.readFile(
                path.resolve(
                    `./server/uploads/files/${filename}`,
                    `${i}-${filename}`
                )
            )
        );
    }
}

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, "localhost");

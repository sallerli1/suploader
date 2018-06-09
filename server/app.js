

let Koa = require('koa');
let Router = require('koa-router');
let app = new Koa();
let router = new Router();
let fse = require('fs-extra');

app.use(require('koa-static')(__dirname + '/public', {
    maxage: 1000 * 60 * 60 * 24 * 365
})); 


let multer = require('koa-multer');

let storage = multer.diskStorage({

    //文件保存路径  
    destination: function (req, file, cb) {
        cb(null, 'server/uploads/files');
    },

    //修改文件名称  
    filename: function (req, file, cb) {
        var fileFormat = (file.originalname).split('.');
        cb(null, `${Date.now()}.${fileFormat[fileFormat.length - 1]}`);
    }
});

let upload = multer({ storage });


router.post('/upload', async (ctx, next) => {
    console.log(ctx.req);
    console.log(ctx.body);
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000, 'localhost');
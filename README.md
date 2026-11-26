# FlixPilot Check-in

Loon 和 Quantumult X 共用的 FlixPilot 签到脚本。每天按设备时间 **08:00** 运行，也可手动执行。使用 HTTPS 地址、用户名和密码直接登录，无需 MITM。

## Loon

[一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Ffunanzz%2FFlixPilot-Check-in%2Fmain%2FFlixPilot.plugin)

需要 3.5.1（Build 983）或以上版本。导入后在插件参数里填写实例地址和账号凭据。用「启用插件」暂停或恢复任务。

## Quantumult X

[一键添加 QX 任务库](https://quantumult.app/x/open-app/ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffunanzz%2FFlixPilot-Check-in%2Fmain%2Fgallery.json%22%5D)

建议使用 Build 934 或以上版本。打开链接后，在 QX 任务库里添加「FlixPilot 每日签到」，编辑任务的实例地址、用户名和密码，再启用任务。也可以在任务列表手动运行。

如果链接没有唤起 QX，可直接在任务库添加 [任务库地址](https://raw.githubusercontent.com/funanzz/FlixPilot-Check-in/main/gallery.json)，或手动将 [QX 任务模板](FlixPilot.conf) 的任务行加入 `[task_local]`。

实例地址填写站点的 HTTPS 根地址。若参数值含空格、`&`、`#`、`=`、`+`、`%` 或逗号，先对该值做 URL 编码。带账号和密码的配置请仅在自己设备使用，分享配置前移除这些值。

## 自动兑换

默认关闭。Loon 可在插件参数中开启，QX 将 `autoBuy=false` 改为 `autoBuy=true`。确认当天已签到后，脚本尝试兑换商城当前排第一的商品。通知会显示签到和兑换后的爆米花余额。

每个客户端会在本地记录当天是否已提交过兑换。同一账号同时用 Loon 和 QX 时，仅在其中一个客户端开启自动兑换。

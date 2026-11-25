# FlixPilot Check-in

FlixPilot 的 Loon 自动签到插件。每天按设备时间 **08:00** 执行，无需 MITM。

[一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Ffunanzz%2FFlixPilot-Check-in%2Fmain%2FFlixPilot.plugin)

需要 Loon 3.5.1（Build 983）或更高版本。导入后，在插件参数中填写 FlixPilot 的 HTTPS 根地址、用户名和密码。可以在 Loon 的脚本列表手动运行测试。

- **启用插件**默认开启，关闭后暂停签到和购买。
- **自动购买首件商品**默认关闭。开启后，当天签到确认后会尝试兑换商城当前排第一的商品。同一设备、同一账号每天最多提交一次。

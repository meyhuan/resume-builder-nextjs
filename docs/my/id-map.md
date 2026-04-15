现在完全清楚了。

两个 userId 的区别
Java 后端有两张独立的用户表：

字段	接口	来源表	含义
uid: "153008"	/cvstore/login/state	tb_cvuser → CVUser.id	微信扫码登录后存入的用户，网站的登录身份
userId: 233064	/cvstore/user/{id}/vip-info	tb_user → User.id	支付/VIP 专用用户，付款时使用的身份
完整链路
微信扫码
  → tb_cvuser 记录 (CVUser)
    → CVUser.id = 153008  ← auth_uid cookie 存的就是这个
    → CVUser.openid = 微信 openid
        ↓ (vip-info 接口通过 openid 关联)
      tb_user 记录 (User)
        → User.id = 233064  ← vip-info 返回的 userId，H5 支付 URL 用这个
        → User.openid = 同一个微信 openid（关联键）
关键结论
auth_uid cookie = CVUser.id（153008 这种），是网站 session 标识
vip-info 的 userId = User.id（233064 这种），是支付和 VIP 系统的标识
两者通过 openid（微信 openid）桥接，UserVipController 里每次请求都会按 openid 查找/自动创建 tb_user 记录
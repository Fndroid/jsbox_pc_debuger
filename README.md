# jsbox_pc_debuger
JSBox的PC端调试工具，基于Chrome Node.js DevTools。

### 要求
- Node.js
- npm
- Chrome

### 使用

1. 下载或Clone本仓库并进入目录
2. 运行``npm install``安装依赖
3. 打开Chrome浏览器，输入``chrome://inspect/#devices``，点击界面的``Open dedicated DevTools for Node``打开调试工具
4. 运行``node --inspect .\index.js``启动本地Websocket服务，端口默认**44555**
5. 将目录``jsboxMoudle``下的``socketLogger.js``导入JSBox的``脚本模块``下（方便下次使用）
6. 在脚本代码入口加入：
    ```javascript
    require('socketLogger').init('192.168.50.xxx', '44555', true, true);
    ```

### 方法

#### socketLogger.init(host, port, clearFirst, debug)

- host: 局域网服务端地址
- port: 局域网服务端端口
- clearFirst: 每次启动脚本先清空就记录
- debug: 是否推送日志
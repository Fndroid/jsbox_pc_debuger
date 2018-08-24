# jsbox_pc_logger
JSBox的PC端日志打印工具，基于Node Debugging Inspector。

### 要求
- Node.js
- npm
- Chrome

### 安装及运行

1. 下载或Clone本仓库并进入目录
2. 运行``npm install``安装依赖
3. 运行如下启动本地Websocket服务，端口默认**44555**
    ```shell
    node --inspect .\index.js
    ```

### JSBox加载

- 引入模块
  将目录``jsboxMoudle``下的``socketLogger.js``导入JSBox的``脚本模块``下（方便下次使用）

- 使用模块
  在脚本代码入口加入：
  ```javascript
  require('socketLogger').init('192.168.50.xxx', '44555', true, true);
  ```

### 调试环境

#### Google Chrome DevTools

1. 打开Chrome浏览器，输入``chrome://inspect/#devices``，点击界面的``Open dedicated DevTools for Node``打开调试工具

#### Visual Studio Code

1. 在项目中新建文件``.vscode/launch.json``
2. 文件加入如下内容：
    ```json
    {
        "version": "0.2.0",
        "configurations": [
            {
                "type": "node",
                "request": "launch",
                "name": "JSBoxLogger",
                "address": "localhost",
                "port": 9229
            }
        ]
    }
    ```
3. 菜单选择调试-启动调试

### 方法

#### socketLogger.init(host, port, clearFirst, debug)

- host: 局域网服务端地址
- port: 局域网服务端端口
- clearFirst: 每次启动脚本先清空就记录
- debug: 是否推送日志
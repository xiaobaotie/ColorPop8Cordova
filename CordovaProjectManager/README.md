# Cordova项目配置管理器

一个用于管理Cordova项目配置的Web工具，提供类似HBuilderX的可视化配置界面。

## 功能特性

- 📁 **项目配置读取**：读取Cordova项目的所有重要配置信息
- ✏️ **基础配置编辑**：可视化编辑config.xml中的基础配置
- 🔄 **自动同步**：修改config.xml后，通过重新构建自动同步到其他文件
- 🎨 **美观界面**：现代化的Web界面，清晰易用
- 🔒 **安全保护**：只修改config.xml，不会破坏其他文件

## 使用方法

### 方法1：直接使用（推荐）

1. 在浏览器中打开 `index.html`
2. 输入Cordova项目路径
3. 点击"加载项目"查看配置
4. 在基础配置区域修改配置
5. 点击"保存基础配置"

### 方法2：使用后端API（完整功能）

1. 安装Python依赖：
   ```bash
   pip install -r requirements.txt
   ```

2. 启动后端服务：
   ```bash
   python backend_api.py
   ```

3. 访问 http://localhost:5000

## 配置说明

### 可编辑配置（config.xml）

- **应用ID**：应用的唯一标识符
- **版本名称**：用户可见的版本号
- **版本代码**：内部版本号，必须递增
- **应用名称**：应用显示名称
- **应用描述**：应用描述信息
- **开发者**：开发者名称
- **入口页面**：应用启动页面
- **屏幕方向**：应用屏幕方向设置

### 只读配置（自动生成）

- **Android配置**：从AndroidManifest.xml读取
- **构建配置**：从build.gradle读取
- **权限配置**：应用权限列表
- **签名配置**：签名密钥信息

## 注意事项

- 工具只修改 `config.xml` 文件
- 其他配置文件由Cordova构建系统自动管理
- 修改配置后需要重新构建项目以同步更改
- 不会修改您的现有项目文件结构

## 文件结构

```
CordovaProjectManager/
├── index.html          # 主界面
├── config.js           # 前端逻辑
├── backend.py          # 配置读取器
├── backend_api.py      # HTTP API服务
├── requirements.txt    # Python依赖
└── README.md          # 说明文档
```

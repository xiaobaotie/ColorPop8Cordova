// Cordova项目配置管理器 - 配置读取和显示
class CordovaConfigManager {
    constructor() {
        this.projectPath = '';
        this.configData = {};
        this.projectDirHandle = null;
        this.configFileHandle = null;
        this.gradleFileHandle = null;
    }

    // 加载项目配置
    async loadProject() {
        this.showLoading(true);
        this.hideMessages();

        try {
            // 只要求选择到项目根（config.xml 必须，build.gradle 可选）
            if (!this.configFileHandle) {
                throw new Error('未找到config.xml，请先选择项目目录');
            }
            
            await this.readProjectConfigs();
            this.displayConfigs();
            this.showSuccess('项目配置加载成功！');
        } catch (error) {
            this.showError(`加载项目失败: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    // 检查浏览器支持
    checkBrowserSupport() {
        return 'showDirectoryPicker' in window;
    }
    
    // 选择项目目录
    async selectProjectDirectory() {
        if (!this.checkBrowserSupport()) {
            this.showBrowserSupportError();
            return;
        }
        
        try {
            this.showLoading(true);
            this.hideMessages();
            
            // 使用File System Access API选择目录
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                id: 'cordova-project' // 权限ID，用于持久化
            });
            
            this.projectDirHandle = dirHandle;
            
            // 扫描配置文件
            await this.scanProjectDirectory(dirHandle);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showInfo('用户取消了选择');
            } else {
                this.showError(`选择目录失败: ${error.message}`);
            }
        } finally {
            this.showLoading(false);
        }
    }
    
    // 扫描项目目录
    async scanProjectDirectory(dirHandle) {
        const foundFiles = {};
        const scanStatus = [];
        
        try {
            // 查找config.xml
            try {
                this.configFileHandle = await dirHandle.getFileHandle('config.xml');
                foundFiles.config = this.configFileHandle;
                scanStatus.push({ file: 'config.xml', status: 'found', icon: '✅' });
            } catch (error) {
                scanStatus.push({ file: 'config.xml', status: 'missing', icon: '❌' });
                throw new Error('未找到config.xml文件');
            }
            
            // 查找build.gradle（可选）
            try {
                const platformsHandle = await dirHandle.getDirectoryHandle('platforms');
                const androidHandle = await platformsHandle.getDirectoryHandle('android');
                const appHandle = await androidHandle.getDirectoryHandle('app');
                this.gradleFileHandle = await appHandle.getFileHandle('build.gradle');
                
                foundFiles.gradle = this.gradleFileHandle;
                scanStatus.push({ file: 'build.gradle', status: 'found', icon: '✅' });
            } catch (error) {
                // 不阻断流程
                this.gradleFileHandle = null;
                scanStatus.push({ file: 'build.gradle', status: 'missing', icon: '⚠️ 可选' });
            }
            
            // 显示扫描结果
            this.displayScanResults(scanStatus);
            
            // 更新项目信息
            this.updateProjectInfo();
            
        } catch (error) {
            this.displayScanResults(scanStatus);
            this.showError(`扫描项目目录失败: ${error.message}`);
        }
    }
    
    // 显示扫描结果
    displayScanResults(scanStatus) {
        const statusHtml = scanStatus.map(item => `
            <div class="file-scan-item">
                <span class="file-scan-icon">${item.icon}</span>
                <span>${item.file}</span>
            </div>
        `).join('');
        
        document.getElementById('projectInfo').innerHTML = `
            <div class="file-scan-status">
                <h4>📁 项目文件扫描结果</h4>
                ${statusHtml}
            </div>
            <button class="btn btn-primary" onclick="loadProject()" ${(!this.configFileHandle || !this.gradleFileHandle) ? 'disabled' : ''} style="margin-top: 15px;">
                🔍 加载项目配置
            </button>
        `;
        
        document.getElementById('projectInfo').style.display = 'block';
    }
    
    // 显示浏览器支持错误
    showBrowserSupportError() {
        const browserSupportDiv = document.getElementById('browserSupport');
        browserSupportDiv.innerHTML = `
            <div class="browser-support-error">
                <strong>⚠️ 浏览器不支持File System Access API</strong><br>
                请使用以下浏览器之一：<br>
                • Chrome 86+ 或 Edge 86+<br>
                • 当前浏览器版本过低，无法使用自动目录选择功能
            </div>
        `;
    }
    
    // 更新项目信息显示
    updateProjectInfo() {
        if (this.configFileHandle && this.gradleFileHandle) {
            const browserSupportDiv = document.getElementById('browserSupport');
            browserSupportDiv.innerHTML = `
                <div class="browser-support-success">
                    <strong>✅ 浏览器支持正常</strong><br>
                    已获得项目目录访问权限，可以自动扫描和读写配置文件
                </div>
            `;
        }
    }

    // 读取项目配置
    async readProjectConfigs() {
        this.configData = {};
        
        // 读取config.xml
        if (this.configFileHandle) {
            const configFile = await this.configFileHandle.getFile();
            const configContent = await configFile.text();
            this.configData.basic = this.parseConfigXml(configContent);
        }
        
            // 读取build.gradle（可选）
        if (this.gradleFileHandle) {
            const gradleFile = await this.gradleFileHandle.getFile();
            const gradleContent = await gradleFile.text();
            this.configData.build = this.parseBuildGradle(gradleContent);
        } else {
            this.configData.build = {};
        }
        
        // 设置默认的只读配置（以 config.xml 为真源，缺省再回退到 build.gradle）
        this.configData.android = {
            packageName: this.configData.basic?.id || 'unknown',
            versionName: this.configData.basic?.version || 'unknown',
            versionCode: this.configData.basic?.versionCode || this.configData.build?.versionCode || 'unknown',
            extractNativeLibs: 'false',
            hardwareAccelerated: 'true'
        };
        
        this.configData.permissions = {
            internet: 'android.permission.INTERNET',
            networkState: 'android.permission.ACCESS_NETWORK_STATE',
            vibrate: 'android.permission.VIBRATE'
        };
        
        this.configData.signing = {
            keystoreFile: 'package.keystore',
            keyAlias: 'h5e39b7b9',
            storePassword: '***',
            keyPassword: '***'
        };
        
        this.configData.memory16KB = {
            extractNativeLibs: 'false',
            supportStatus: '已启用'
        };
    }
    
    // 写入文件内容
    async writeFileContent(fileHandle, content) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (error) {
            throw new Error(`写入文件失败: ${error.message}`);
        }
    }
    
    // 解析config.xml
    parseConfigXml(xmlContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            const widget = xmlDoc.getElementsByTagName('widget')[0];
            if (!widget) {
                throw new Error('无法找到widget元素');
            }
            
            const name = xmlDoc.getElementsByTagName('name')[0];
            const description = xmlDoc.getElementsByTagName('description')[0];
            const author = xmlDoc.getElementsByTagName('author')[0];
            const content = xmlDoc.getElementsByTagName('content')[0];
            
            // 查找Orientation配置
            const orientationPref = xmlDoc.querySelector('platform[name="android"] preference[name="Orientation"]');
            
            const versionCode = widget.getAttribute('android-versionCode') || widget.getAttribute('android:versionCode') || '';

            return {
                id: widget.getAttribute('id') || '',
                version: widget.getAttribute('version') || '',
                versionCode: versionCode,
                name: name ? name.textContent.trim() : '',
                description: description ? description.textContent.trim() : '',
                author: author ? author.textContent.trim() : '',
                content: content ? content.getAttribute('src') || '' : 'index.html',
                orientation: orientationPref ? orientationPref.getAttribute('value') || 'portrait' : 'portrait'
            };
        } catch (error) {
            throw new Error(`解析config.xml失败: ${error.message}`);
        }
    }
    
    // 解析build.gradle
    parseBuildGradle(gradleContent) {
        try {
            // 查找versionCode
            const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
            const versionCode = versionCodeMatch ? versionCodeMatch[1] : '1';
            
            // 查找applicationId
            const appIdMatch = gradleContent.match(/applicationId\s+["']([^"']+)["']/);
            const applicationId = appIdMatch ? appIdMatch[1] : '';
            
            return {
                versionCode: versionCode,
                applicationId: applicationId
            };
        } catch (error) {
            throw new Error(`解析build.gradle失败: ${error.message}`);
        }
    }

    // 显示配置信息
    displayConfigs() {
        this.displayMainConfig();
        this.displayAndroidConfig();
        this.displayBuildConfig();
        this.displayPermissionsConfig();
        this.displaySigningConfig();
        
        document.getElementById('configSections').style.display = 'block';
    }

    // 显示核心配置（基础配置 + 版本代码）
    displayMainConfig() {
        const container = document.getElementById('mainConfig');
        if (!container) {
            console.error('未找到mainConfig元素');
            return;
        }
        
        const basicConfig = this.configData.basic || {};
        const buildConfig = this.configData.build || {};
        
        container.innerHTML = `
            <div class="config-item">
                <div class="config-label">应用ID ✏️</div>
                <div class="config-value">
                    <input type="text" id="configId" value="${basicConfig.id || ''}" class="config-input" data-field="id">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">版本名称 ✏️</div>
                <div class="config-value">
                    <input type="text" id="configVersion" value="${basicConfig.version || ''}" class="config-input" data-field="version">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">版本代码 ✏️</div>
                <div class="config-value">
                    <input type="text" id="configVersionCode" value="${basicConfig.versionCode || buildConfig.versionCode || ''}" class="config-input" data-field="versionCode">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">应用名称 ✏️</div>
                <div class="config-value">
                    <input type="text" id="configName" value="${basicConfig.name || ''}" class="config-input" data-field="name">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">应用描述 ✏️</div>
                <div class="config-value">
                    <textarea id="configDescription" class="config-textarea" data-field="description" rows="2">${basicConfig.description || ''}</textarea>
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">开发者 ✏️</div>
                <div class="config-value">
                    <input type="text" id="configAuthor" value="${basicConfig.author || ''}" class="config-input" data-field="author">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">入口页面 ✏️</div>
                <div class="config-value">
                    <input type="text" id="configContent" value="${basicConfig.content || 'index.html'}" class="config-input" data-field="content">
                </div>
            </div>
            <div class="config-item">
                <div class="config-label">屏幕方向 ✏️</div>
                <div class="config-value">
                    <select id="configOrientation" class="config-select" data-field="orientation">
                        <option value="portrait" ${basicConfig.orientation === 'portrait' ? 'selected' : ''}>竖屏 (portrait)</option>
                        <option value="landscape" ${basicConfig.orientation === 'landscape' ? 'selected' : ''}>横屏 (landscape)</option>
                        <option value="default" ${basicConfig.orientation === 'default' ? 'selected' : ''}>默认 (default)</option>
                    </select>
                </div>
            </div>
            <div class="config-item" style="grid-column: 1 / -1; margin-top: 20px;">
                <button class="btn btn-primary" onclick="saveMainConfig()">💾 保存核心配置</button>
                <button class="btn btn-secondary" onclick="resetMainConfig()">🔄 重置</button>
                <span id="saveStatus" class="save-status"></span>
            </div>
        `;
    }

    // 显示Android配置
    displayAndroidConfig() {
        const container = document.getElementById('androidConfig');
        if (!container) {
            console.error('未找到androidConfig元素');
            return;
        }
        
        const config = this.configData.android || {};
        
        container.innerHTML = `
            <div class="config-item">
                <div class="config-label">包名</div>
                <div class="config-value">${config.packageName}</div>
            </div>
            <div class="config-item">
                <div class="config-label">版本名称</div>
                <div class="config-value">${config.versionName}</div>
            </div>
            <div class="config-item">
                <div class="config-label">版本代码</div>
                <div class="config-value">${config.versionCode}</div>
            </div>
            <div class="config-item">
                <div class="config-label">最小SDK版本</div>
                <div class="config-value">${config.minSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">目标SDK版本</div>
                <div class="config-value">${config.targetSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">编译SDK版本</div>
                <div class="config-value">${config.compileSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">16KB内存页面支持</div>
                <div class="config-value">${config.extractNativeLibs}</div>
            </div>
            <div class="config-item">
                <div class="config-label">硬件加速</div>
                <div class="config-value">${config.hardwareAccelerated}</div>
            </div>
            <div class="config-item">
                <div class="config-label">大内存堆</div>
                <div class="config-value">${config.largeHeap}</div>
            </div>
        `;
    }

    // 显示构建配置
    displayBuildConfig() {
        const container = document.getElementById('buildConfig');
        if (!container) {
            console.error('未找到buildConfig元素');
            return;
        }
        
        const config = this.configData.build || {};
        
        container.innerHTML = `
            <div class="config-item">
                <div class="config-label">版本代码</div>
                <div class="config-value">${config.versionCode}</div>
            </div>
            <div class="config-item">
                <div class="config-label">应用ID</div>
                <div class="config-value">${config.applicationId}</div>
            </div>
            <div class="config-item">
                <div class="config-label">最小SDK版本</div>
                <div class="config-value">${config.minSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">目标SDK版本</div>
                <div class="config-value">${config.targetSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">编译SDK版本</div>
                <div class="config-value">${config.compileSdkVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">构建工具版本</div>
                <div class="config-value">${config.buildToolsVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Gradle版本</div>
                <div class="config-value">${config.gradleVersion}</div>
            </div>
            <div class="config-item">
                <div class="config-label">AGP版本</div>
                <div class="config-value">${config.agpVersion}</div>
            </div>
        `;
    }

    // 显示权限配置
    displayPermissionsConfig() {
        const container = document.getElementById('permissionsConfig');
        if (!container) {
            console.error('未找到permissionsConfig元素');
            return;
        }
        
        const config = this.configData.permissions || {};
        
        container.innerHTML = `
            <div class="config-item">
                <div class="config-label">网络访问</div>
                <div class="config-value">${config.internet}</div>
            </div>
            <div class="config-item">
                <div class="config-label">网络状态</div>
                <div class="config-value">${config.networkState}</div>
            </div>
            <div class="config-item">
                <div class="config-label">震动</div>
                <div class="config-value">${config.vibrate}</div>
            </div>
            <div class="config-item">
                <div class="config-label">相机</div>
                <div class="config-value">${config.camera}</div>
            </div>
            <div class="config-item">
                <div class="config-label">存储</div>
                <div class="config-value">${config.storage}</div>
            </div>
        `;
    }

    // 显示签名配置
    displaySigningConfig() {
        const container = document.getElementById('signingConfig');
        if (!container) {
            console.error('未找到signingConfig元素');
            return;
        }
        
        const config = this.configData.signing || {};
        
        container.innerHTML = `
            <div class="config-item">
                <div class="config-label">密钥库文件</div>
                <div class="config-value">${config.keystoreFile}</div>
            </div>
            <div class="config-item">
                <div class="config-label">密钥别名</div>
                <div class="config-value">${config.keyAlias}</div>
            </div>
            <div class="config-item">
                <div class="config-label">SHA1指纹</div>
                <div class="config-value">${config.sha1}</div>
            </div>
            <div class="config-item">
                <div class="config-label">SHA256指纹</div>
                <div class="config-value">${config.sha256}</div>
            </div>
        `;
    }

    // 显示加载状态
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        document.getElementById('configSections').style.display = show ? 'none' : 'block';
    }

    // 显示错误信息
    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        document.getElementById('success').style.display = 'none';
    }

    // 显示成功信息
    showSuccess(message) {
        const successDiv = document.getElementById('success');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        document.getElementById('error').style.display = 'none';
    }

    // 隐藏消息
    hideMessages() {
        document.getElementById('error').style.display = 'none';
        document.getElementById('success').style.display = 'none';
    }

    // 保存核心配置
    async saveMainConfig() {
        const configUpdates = this.getMainConfigValues();
        
        try {
            // 保存基础配置到config.xml
            const basicConfig = {
                id: configUpdates.id,
                version: configUpdates.version,
                versionCode: configUpdates.versionCode,
                name: configUpdates.name,
                description: configUpdates.description,
                author: configUpdates.author,
                content: configUpdates.content,
                orientation: configUpdates.orientation
            };
            
            await this.saveConfigXml(basicConfig);
            
            // 保存版本代码到 build.gradle（可选）
            if (this.gradleFileHandle) {
                await this.saveVersionCode(configUpdates.versionCode);
            }
            
            // 更新内存中的配置数据
            Object.assign(this.configData.basic, basicConfig);
            if (!this.configData.build) this.configData.build = {};
            this.configData.build.versionCode = configUpdates.versionCode;
            
            this.showSaveStatus('✅ 核心配置已保存', 'success');
            this.showSuccess('核心配置已保存！需要重新构建以同步到其他文件。');
            
        } catch (error) {
            this.showSaveStatus('❌ 保存失败', 'error');
            this.showError(`保存配置失败: ${error.message}`);
        }
    }

    // 重置核心配置
    resetMainConfig() {
        if (confirm('确定要重置核心配置吗？这将恢复原始值。')) {
            this.displayMainConfig();
            this.showSaveStatus('🔄 已重置', 'info');
        }
    }

    // 获取核心配置的值
    getMainConfigValues() {
        return {
            id: document.getElementById('configId').value,
            version: document.getElementById('configVersion').value,
            versionCode: document.getElementById('configVersionCode').value,
            name: document.getElementById('configName').value,
            description: document.getElementById('configDescription').value,
            author: document.getElementById('configAuthor').value,
            content: document.getElementById('configContent').value,
            orientation: document.getElementById('configOrientation').value
        };
    }
    
    // 保存版本代码到build.gradle
    async saveVersionCode(versionCode) {
        try {
            if (!this.gradleFileHandle) {
                throw new Error('未找到build.gradle文件句柄');
            }
            
            // 读取当前gradle文件内容
            const gradleFile = await this.gradleFileHandle.getFile();
            const gradleContent = await gradleFile.text();
            
            // 更新版本代码
            const updatedContent = gradleContent.replace(
                /versionCode\s+\d+/,
                `versionCode ${versionCode}`
            );
            
            // 写入文件
            await this.writeFileContent(this.gradleFileHandle, updatedContent);
            
            return { success: true, message: '版本代码已保存到build.gradle' };
        } catch (error) {
            throw new Error(`保存版本代码失败: ${error.message}`);
        }
    }

    // 保存config.xml
    async saveConfigXml(configUpdates) {
        try {
            if (!this.configFileHandle) {
                throw new Error('未找到config.xml文件句柄');
            }
            
            // 生成新的XML内容
            const newXmlContent = this.generateConfigXml(configUpdates);
            
            // 直接写入文件
            await this.writeFileContent(this.configFileHandle, newXmlContent);
            
            return { success: true, message: '配置已保存到config.xml' };
        } catch (error) {
            throw new Error(`保存config.xml失败: ${error.message}`);
        }
    }
    
    // 生成config.xml内容
    generateConfigXml(config) {
        return `<?xml version='1.0' encoding='utf-8'?>
    <widget id="${config.id}" version="${config.version}" android-versionCode="${config.versionCode || ''}" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>${config.name}</name>
    <description>${config.description}</description>
    <author email="" href="">
        ${config.author}
    </author>
    <content src="${config.content}" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    
    <!-- 应用图标 - 多尺寸支持 -->
    <icon src="www/img/72x72.png" width="72" height="72" density="hdpi" />
    <icon src="www/img/96x96.png" width="96" height="96" density="xhdpi" />
    <icon src="www/img/144x144.png" width="144" height="144" density="xxhdpi" />
    <icon src="www/img/192x192.png" width="192" height="192" density="xxxhdpi" />
    
    <!-- 启动屏幕 -->
    <splash src="www/img/icon4.png" />
    
    <platform name="android">
        <preference name="AndroidXEnabled" value="true" />
        <preference name="AndroidInsecureFileModeEnabled" value="true" />
        <preference name="AndroidWindowSplashScreenShow" value="false" />
        <preference name="AndroidPersistentFileLocation" value="Compatibility" />
        <preference name="AndroidExtraFilesystems" value="files,files-external,documents,sdcard,cache,cache-external,assets" />
        
        <!-- 高分辨率支持 -->
        <preference name="EnableViewportScale" value="true" />
        <preference name="MediaPlaybackRequiresUserAction" value="false" />
        <preference name="SuppressesIncrementalRendering" value="false" />
        <preference name="UIWebViewBounce" value="false" />
        <preference name="BackupWebStorage" value="none" />
        <preference name="KeyboardDisplayRequiresUserAction" value="true" />
        
        <!-- 16KB页面支持 -->
        <preference name="AndroidExtractNativeLibs" value="false" />
        <preference name="AndroidGradlePluginVersion" value="8.7.3" />
        <preference name="AndroidTargetSdkVersion" value="35" />
        <preference name="AndroidMinSdkVersion" value="21" />
        <preference name="AndroidCompileSdkVersion" value="35" />
        
        <!-- 权限配置 -->
        <preference name="AndroidLargeHeap" value="true" />
        <preference name="AndroidHardwareAccelerated" value="true" />
        <preference name="AndroidUsesCleartextTraffic" value="true" />
        
        <!-- 方向锁定 -->
        <preference name="Orientation" value="${config.orientation}" />
    </platform>
</widget>`;
    }

    // 显示保存状态
    showSaveStatus(message, type) {
        const statusElement = document.getElementById('saveStatus');
        statusElement.textContent = message;
        statusElement.className = `save-status status-${type}`;
        
        // 3秒后清除状态
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'save-status';
        }, 3000);
    }
}

// 全局实例
const configManager = new CordovaConfigManager();

// 加载项目函数
function loadProject() {
    configManager.loadProject();
}

// 选择项目目录
function selectProjectDirectory() {
    configManager.selectProjectDirectory();
}

// 保存核心配置函数
function saveMainConfig() {
    configManager.saveMainConfig();
}

// 重置核心配置函数
function resetMainConfig() {
    configManager.resetMainConfig();
}

// 切换收纳区域显示
function toggleCollapsible(id) {
    const content = document.getElementById(id);
    const collapsible = content.closest('.collapsible');
    const icon = collapsible.querySelector('.collapse-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        collapsible.classList.add('expanded');
    } else {
        content.style.display = 'none';
        collapsible.classList.remove('expanded');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查浏览器支持
    const browserSupportDiv = document.getElementById('browserSupport');
    
    if (configManager.checkBrowserSupport()) {
        browserSupportDiv.innerHTML = `
            <div class="browser-support-success">
                <strong>✅ 浏览器支持File System Access API</strong><br>
                您可以使用自动目录选择功能，直接读写项目配置文件
            </div>
        `;
    } else {
        browserSupportDiv.innerHTML = `
            <div class="browser-support-error">
                <strong>⚠️ 浏览器不支持File System Access API</strong><br>
                请使用Chrome 86+或Edge 86+以获得最佳体验
            </div>
        `;
    }
    
    console.log('Cordova项目配置管理器已加载');
});

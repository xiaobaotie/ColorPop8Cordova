#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
    const manifestPath = path.join(platformRoot, 'app/src/main/AndroidManifest.xml');
    const themesPath = path.join(platformRoot, 'app/src/main/res/values/themes.xml');
    const rootConfigPath = path.join(context.opts.projectRoot, 'config.xml');

    // 1. 确保 drawable 目录存在并复制启动图资源
    // 这是为了确保 windowBackground 能找到 @drawable/splash
    const splashImageSrc = path.join(context.opts.projectRoot, 'www/img/1125x2436.png');
    const splashImageDest = path.join(platformRoot, 'app/src/main/res/drawable/splash.png');
    if (fs.existsSync(splashImageSrc)) {
        const drawableDir = path.dirname(splashImageDest);
        if (!fs.existsSync(drawableDir)) {
            fs.mkdirSync(drawableDir, { recursive: true });
        }
        fs.copyFileSync(splashImageSrc, splashImageDest);
        console.log('✓ Copied splash.png to drawable');
    }

    // 2. 注入自定义主题 Theme.App.Starting
    let themesContent = '';
    if (fs.existsSync(themesPath)) {
        themesContent = fs.readFileSync(themesPath, 'utf8');
        if (!themesContent.includes('Theme.App.Starting')) {
            themesContent = themesContent.replace(/<\/resources>\s*$/,
`    <style name="Theme.App.Starting" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>\n</resources>`);
            fs.writeFileSync(themesPath, themesContent, 'utf8');
            console.log('✓ Injected Theme.App.Starting into themes.xml');
        }
    } else {
        // 如果 themes.xml 不存在，则创建它
        themesContent = `<?xml version='1.0' encoding='utf-8'?>\n<resources>\n    <style name="Theme.App.Starting" parent="Theme.AppCompat.NoActionBar">\n        <item name="android:windowBackground">@drawable/splash</item>\n    </style>\n</resources>\n`;
        fs.writeFileSync(themesPath, themesContent, 'utf8');
        console.log('✓ Created themes.xml with Theme.App.Starting');
    }

    // 3. 强制 MainActivity 使用我们自定义的 Theme.App.Starting
    if (fs.existsSync(manifestPath)) {
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const originalManifest = manifestContent;

        manifestContent = manifestContent.replace(
            /(<activity[^>]*android:name="MainActivity"[^>]*)/,
            (match) => {
                let activityTag = match;
                // 替换或添加 theme 属性
                if (/android:theme=/.test(activityTag)) {
                    activityTag = activityTag.replace(/android:theme="[^"]+"/, 'android:theme="@style/Theme.App.Starting"');
                } else {
                    activityTag += ' android:theme="@style/Theme.App.Starting"';
                }
                return activityTag;
            }
        );

        if (originalManifest !== manifestContent) {
            fs.writeFileSync(manifestPath, manifestContent, 'utf8');
            console.log('✓ Set MainActivity theme to Theme.App.Starting');
        }
    }

    // 4. 同步 config.xml 的版本到 AndroidManifest，并清理误加的 android:name 属性
    try {
        if (fs.existsSync(rootConfigPath) && fs.existsSync(manifestPath)) {
            const configXml = fs.readFileSync(rootConfigPath, 'utf8');
            const widgetTagMatch = configXml.match(/<widget[^>]*>/);
            if (widgetTagMatch) {
                const widgetTag = widgetTagMatch[0];
                const versionNameMatch = widgetTag.match(/\sversion=\"([^\"]+)\"/);
                const versionCodeMatch = widgetTag.match(/\sandroid-versionCode=\"([^\"]+)\"/);

                let manifestContent = fs.readFileSync(manifestPath, 'utf8');

                // 清理误加到 <manifest> 的 android:name 属性（应为 uses-permission 的 name）
                manifestContent = manifestContent.replace(/\sandroid:name=\"com\.google\.android\.gms\.permission\.AD_ID\"/, '');

                if (versionNameMatch) {
                    const versionName = versionNameMatch[1];
                    if (/android:versionName=\"[^\"]*\"/.test(manifestContent)) {
                        manifestContent = manifestContent.replace(/android:versionName=\"[^\"]*\"/, `android:versionName=\"${versionName}\"`);
                    } else {
                        // 注入到 <manifest ...>
                        manifestContent = manifestContent.replace(/<manifest\s/, `<manifest android:versionName=\"${versionName}\" `);
                    }
                }

                if (versionCodeMatch) {
                    const versionCode = versionCodeMatch[1];
                    if (/android:versionCode=\"[^\"]*\"/.test(manifestContent)) {
                        manifestContent = manifestContent.replace(/android:versionCode=\"[^\"]*\"/, `android:versionCode=\"${versionCode}\"`);
                    } else {
                        manifestContent = manifestContent.replace(/<manifest\s/, `<manifest android:versionCode=\"${versionCode}\" `);
                    }
                }

                fs.writeFileSync(manifestPath, manifestContent, 'utf8');
                console.log('✓ Synced versionCode/versionName from config.xml to AndroidManifest.xml');
            }
        }
    } catch (e) {
        console.warn('! Failed to sync versions to AndroidManifest:', e.message);
    }
};

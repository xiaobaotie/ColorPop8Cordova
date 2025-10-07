@echo off
chcp 65001 > nul

echo 🚀 开始广告功能完整测试...
echo.

echo 1. 检查插件状态...
cordova plugin list
echo.

echo 2. 清理构建缓存...
cordova clean
echo.

echo 3. 重新构建项目...
cordova build android
echo.

echo 4. 安装到设备...
cordova run android
echo.

echo ✅ 测试完成！请检查：
echo - 应用是否正常启动
echo - 控制台是否显示 "AdMob初始化成功"
echo - 底部是否显示横幅广告
echo - 使用 Chrome DevTools 查看控制台日志
echo.
echo 💡 测试命令（在浏览器控制台中运行）：
echo testAdMob()           - 测试AdMob基本功能
echo testBannerAd()        - 测试横幅广告
echo runFullAdTest()       - 运行完整测试
echo.
pause


@echo off
echo 修复AdMob插件配置...

echo 1. 清理现有插件...
cordova plugin remove admob-plus-cordova

echo 2. 重新安装AdMob插件...
cordova plugin add admob-plus-cordova --variable APP_ID_ANDROID="ca-app-pub-3940256099942544~3347511713" --variable PLAY_SERVICES_VERSION="23.2.0" --variable PACKAGE_NAME="colorpop8.text"

echo 3. 清理构建缓存...
cd platforms\android
gradlew clean
cd ..\..

echo 4. 重新构建项目...
cordova build android

echo 修复完成！请测试广告功能。
pause


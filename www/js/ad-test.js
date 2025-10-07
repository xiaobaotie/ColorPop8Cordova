/**
 * AdMob广告测试脚本
 * 用于调试和验证广告功能
 */

// 测试AdMob功能
function testAdMob() {
    console.log('=== AdMob功能测试 ===');
    
    // 检查AdMob对象是否存在
    if (typeof admob === 'undefined') {
        console.error('❌ AdMob对象未定义！插件可能未正确安装');
        return false;
    }
    
    console.log('✅ AdMob对象存在');
    
    // 检查AdMob方法 (稳定版本的API)
    if (typeof admob.start === 'function') {
        console.log('✅ admob.start() 方法存在');
    } else {
        console.error('❌ admob.start() 方法不存在');
    }
    
    if (typeof admob.banner === 'object') {
        console.log('✅ admob.banner 对象存在');
    } else {
        console.error('❌ admob.banner 对象不存在');
    }
    
    if (typeof admob.banner.create === 'function') {
        console.log('✅ admob.banner.create() 方法存在');
    } else {
        console.error('❌ admob.banner.create() 方法不存在');
    }
    
    return true;
}

// 测试横幅广告
function testBannerAd() {
    console.log('=== 横幅广告测试 ===');
    
    if (typeof admob === 'undefined') {
        console.error('❌ AdMob未初始化');
        return;
    }
    
    const bannerConfig = {
        adUnitId: 'ca-app-pub-3940256099942544/6300978111',
        size: 'SMART_BANNER'
    };
    
    console.log('正在加载横幅广告...', bannerConfig);
    
    admob.banner.create(bannerConfig)
        .then(function(banner) {
            console.log('✅ 横幅广告创建成功');
            banner.show();
            document.getElementById('admob-banner').style.display = 'block';
            console.log('✅ 横幅广告显示成功');
        })
        .catch(function(error) {
            console.error('❌ 横幅广告创建失败:', error);
        });
}

// 测试插屏广告
function testInterstitialAd() {
    console.log('=== 插屏广告测试 ===');
    
    if (typeof admob === 'undefined') {
        console.error('❌ AdMob未初始化');
        return;
    }
    
    const interstitialConfig = {
        id: 'ca-app-pub-3940256099942544/1033173712'
    };
    
    console.log('正在加载插屏广告...', interstitialConfig);
    
    admob.InterstitialAd.load(interstitialConfig)
        .then(function(interstitial) {
            console.log('✅ 插屏广告加载成功');
            interstitial.show();
            console.log('✅ 插屏广告显示成功');
        })
        .catch(function(error) {
            console.error('❌ 插屏广告加载失败:', error);
        });
}

// 测试激励视频广告
function testRewardedAd() {
    console.log('=== 激励视频广告测试 ===');
    
    if (typeof admob === 'undefined') {
        console.error('❌ AdMob未初始化');
        return;
    }
    
    const rewardedConfig = {
        id: 'ca-app-pub-3940256099942544/5224354917'
    };
    
    console.log('正在加载激励视频广告...', rewardedConfig);
    
    admob.RewardedAd.load(rewardedConfig)
        .then(function(rewarded) {
            console.log('✅ 激励视频广告加载成功');
            
            // 设置奖励回调
            rewarded.on('reward', function(reward) {
                console.log('✅ 用户获得奖励:', reward);
            });
            
            rewarded.on('dismiss', function() {
                console.log('✅ 用户关闭激励视频');
            });
            
            rewarded.show();
            console.log('✅ 激励视频广告显示成功');
        })
        .catch(function(error) {
            console.error('❌ 激励视频广告加载失败:', error);
        });
}

// 完整的广告系统测试
function runFullAdTest() {
    console.log('🚀 开始完整的广告系统测试...');
    
    if (testAdMob()) {
        console.log('等待3秒后测试横幅广告...');
        setTimeout(testBannerAd, 3000);
        
        console.log('等待6秒后测试插屏广告...');
        setTimeout(testInterstitialAd, 6000);
        
        console.log('等待9秒后测试激励视频...');
        setTimeout(testRewardedAd, 9000);
    }
}

// 检查设备准备状态
function checkDeviceReady() {
    if (document.readyState === 'complete') {
        console.log('✅ 文档已完全加载');
        if (typeof cordova !== 'undefined') {
            console.log('✅ Cordova已加载');
            if (cordova.platformId) {
                console.log('✅ 平台ID:', cordova.platformId);
            }
        } else {
            console.error('❌ Cordova未加载');
        }
    } else {
        console.log('⏳ 文档仍在加载中...');
    }
}

// 页面加载完成后检查
document.addEventListener('DOMContentLoaded', checkDeviceReady);

// 设备准备完成后检查
// 已禁用自动测试运行，仅保留手动触发函数

// 导出测试函数到全局
window.testAdMob = testAdMob;
window.testBannerAd = testBannerAd;
window.testInterstitialAd = testInterstitialAd;
window.testRewardedAd = testRewardedAd;
window.runFullAdTest = runFullAdTest;


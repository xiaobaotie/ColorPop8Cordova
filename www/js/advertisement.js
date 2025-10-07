/**
 * ColorPop8 广告管理系统
 * 支持横幅广告、插屏广告、激励视频广告
 */

class AdvertisementManager {
    constructor() {
        this.isInitialized = false;
        this.adUnits = {
            banner: {
                test: 'ca-app-pub-3940256099942544/6300978111',
                production: 'YOUR_REAL_BANNER_AD_UNIT_ID' // 替换为真实ID
            },
            interstitial: {
                test: 'ca-app-pub-3940256099942544/1033173712',
                production: 'YOUR_REAL_INTERSTITIAL_AD_UNIT_ID' // 替换为真实ID
            },
            rewarded: {
                test: 'ca-app-pub-3940256099942544/5224354917',
                production: 'YOUR_REAL_REWARDED_AD_UNIT_ID' // 替换为真实ID
            }
        };
        
        this.isTestMode = true; // 发布时改为 false
        this.currentBanner = null;
        this.interstitialAd = null;
        this.rewardedAd = null;
        this.adCounter = 0;
        this.interstitialInterval = 3; // 每3个关卡显示一次插屏广告
    }

    /**
     * 初始化广告系统
     */
    async initialize() {
        if (this.isInitialized || !window.admob) {
            return;
        }

        try {
            // 初始化AdMob
            await admob.start();
            this.isInitialized = true;
            console.log('广告系统初始化成功');
            
            // 预加载广告
            this.preloadAds();
            
            // 显示横幅广告
            this.showBannerAd();
            
        } catch (error) {
            console.error('广告系统初始化失败:', error);
        }
    }

    /**
     * 获取广告单元ID
     */
    getAdUnitId(type) {
        const adType = this.adUnits[type];
        return this.isTestMode ? adType.test : adType.production;
    }

    /**
     * 预加载广告
     */
    preloadAds() {
        this.loadInterstitialAd();
        this.loadRewardedAd();
    }

    /**
     * 显示横幅广告
     */
    async showBannerAd() {
        if (!this.isInitialized) return;

        try {
            const bannerConfig = {
                id: this.getAdUnitId('banner'),
                size: 'SMART_BANNER'
            };

            this.currentBanner = await admob.BannerAd.load(bannerConfig);
            this.currentBanner.show();
            
            // 调整页面布局以适应横幅广告
            this.adjustLayoutForBanner();
            
            console.log('横幅广告显示成功');
        } catch (error) {
            console.error('横幅广告显示失败:', error);
        }
    }

    /**
     * 隐藏横幅广告
     */
    hideBannerAd() {
        if (this.currentBanner) {
            this.currentBanner.hide();
        }
    }

    /**
     * 加载插屏广告
     */
    async loadInterstitialAd() {
        if (!this.isInitialized) return;

        try {
            const interstitialConfig = {
                id: this.getAdUnitId('interstitial')
            };

            this.interstitialAd = await admob.InterstitialAd.load(interstitialConfig);
            console.log('插屏广告加载成功');
        } catch (error) {
            console.error('插屏广告加载失败:', error);
        }
    }

    /**
     * 显示插屏广告
     */
    async showInterstitialAd() {
        if (!this.interstitialAd) {
            console.log('插屏广告未加载');
            return false;
        }

        try {
            await this.interstitialAd.show();
            console.log('插屏广告显示成功');
            
            // 广告显示后重新加载下一个
            this.loadInterstitialAd();
            return true;
        } catch (error) {
            console.error('插屏广告显示失败:', error);
            return false;
        }
    }

    /**
     * 检查是否应该显示插屏广告
     */
    shouldShowInterstitial() {
        this.adCounter++;
        return this.adCounter % this.interstitialInterval === 0;
    }

    /**
     * 加载激励视频广告
     */
    async loadRewardedAd() {
        if (!this.isInitialized) return;

        try {
            const rewardedConfig = {
                id: this.getAdUnitId('rewarded')
            };

            this.rewardedAd = await admob.RewardedAd.load(rewardedConfig);
            console.log('激励视频广告加载成功');
        } catch (error) {
            console.error('激励视频广告加载失败:', error);
        }
    }

    /**
     * 显示激励视频广告
     */
    async showRewardedAd() {
        return new Promise((resolve, reject) => {
            if (!this.rewardedAd) {
                reject(new Error('激励视频广告未加载'));
                return;
            }

            try {
                // 设置奖励回调
                this.rewardedAd.on('reward', (reward) => {
                    console.log('用户获得奖励:', reward);
                    resolve(reward);
                    
                    // 重新加载下一个激励视频
                    this.loadRewardedAd();
                });

                this.rewardedAd.on('dismiss', () => {
                    console.log('用户关闭激励视频');
                    resolve(null);
                });

                this.rewardedAd.show();
            } catch (error) {
                console.error('激励视频广告显示失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 调整页面布局以适应横幅广告
     */
    adjustLayoutForBanner() {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.paddingBottom = '60px';
        }
    }

    /**
     * 游戏关卡完成时的广告逻辑
     */
    onLevelComplete(levelNumber) {
        if (this.shouldShowInterstitial()) {
            // 延迟显示插屏广告，避免影响游戏体验
            setTimeout(() => {
                this.showInterstitialAd();
            }, 1000);
        }
    }

    /**
     * 游戏失败时的激励视频选项
     */
    async offerRewardVideo(rewardType = 'revive') {
        try {
            const reward = await this.showRewardedAd();
            if (reward) {
                switch (rewardType) {
                    case 'revive':
                        this.revivePlayer();
                        break;
                    case 'coins':
                        this.giveCoins(50);
                        break;
                    case 'hint':
                        this.giveHint();
                        break;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('激励视频奖励处理失败:', error);
            return false;
        }
    }

    /**
     * 复活玩家
     */
    revivePlayer() {
        // 实现复活逻辑
        console.log('玩家复活');
        // 这里调用您的游戏复活函数
        if (window.revivePlayer) {
            window.revivePlayer();
        }
    }

    /**
     * 给予金币
     */
    giveCoins(amount) {
        console.log(`获得 ${amount} 金币`);
        // 这里调用您的金币系统
        if (window.addCoins) {
            window.addCoins(amount);
        }
    }

    /**
     * 给予提示
     */
    giveHint() {
        console.log('获得提示');
        // 这里调用您的提示系统
        if (window.giveHint) {
            window.giveHint();
        }
    }

    /**
     * 切换到生产模式
     */
    switchToProduction() {
        this.isTestMode = false;
        console.log('已切换到生产模式，请确保使用真实的广告单元ID');
    }

    /**
     * 获取广告状态信息
     */
    getAdStatus() {
        return {
            isInitialized: this.isInitialized,
            isTestMode: this.isTestMode,
            adCounter: this.adCounter,
            hasBanner: !!this.currentBanner,
            hasInterstitial: !!this.interstitialAd,
            hasRewarded: !!this.rewardedAd
        };
    }
}

// 创建全局广告管理器实例
window.adManager = new AdvertisementManager();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvertisementManager;
}


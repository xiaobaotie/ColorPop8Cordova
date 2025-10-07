/* eslint-disable no-console */
module.exports = function (ctx) {
  try {
    if (!ctx || !ctx.opts || !ctx.opts.platforms || ctx.opts.platforms.indexOf('android') === -1) {
      return;
    }
    const fs = require('fs');
    const path = require('path');
    const projectRoot = ctx.opts.projectRoot || process.cwd();
    const propFile = path.join(projectRoot, 'platforms', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
    if (!fs.existsSync(propFile)) {
      console.log('[fix-gradle-wrapper] properties file not found, skip');
      return;
    }
    const want = 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-all.zip';
    let txt = fs.readFileSync(propFile, 'utf8');
    if (txt.indexOf('gradle-8.9-all.zip') !== -1) {
      console.log('[fix-gradle-wrapper] already 8.9');
      return;
    }
    txt = txt.replace(/distributionUrl=.*/g, want);
    fs.writeFileSync(propFile, txt, 'utf8');
    console.log('[fix-gradle-wrapper] set Gradle wrapper to 8.9');
  } catch (e) {
    console.log('[fix-gradle-wrapper] error:', e && e.message);
  }
};








const {build}=require('../package.json');

// Use electron-builder's supported native installer on Windows. Linux builds
// use the custom NSIS script to avoid executing Windows binaries via Wine.
module.exports={...build,nsis:{...build.nsis,
  ...(process.platform==='win32' ? {} : {script:'desktop/installer.nsi'})}};

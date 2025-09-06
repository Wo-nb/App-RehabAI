# React Native APK 打包指南

## 项目概述
这是一个React Native项目，已经配置好了Android构建环境。项目包含语音识别、数字人、运动评估等功能模块。

## 环境要求
- Node.js >= 18
- React Native CLI
- Android Studio
- Java Development Kit (JDK)
- Android SDK

## 打包步骤

### 1. 安装依赖
```bash
# 安装项目依赖
npm install

# 安装Android依赖（如果需要）
cd android
./gradlew clean
cd ..
```

### 2. 生成Debug APK（用于测试）
```bash
# 方法1：使用React Native CLI
npx react-native build-android --mode=debug

# 方法2：使用Gradle直接构建
cd android
./gradlew assembleDebug
cd ..
```

生成的APK位置：`android/app/build/outputs/apk/debug/app-debug.apk`

### 3. 生成Release APK（用于发布）

#### 3.1 检查签名配置
项目已经配置了签名密钥，在 `android/gradle.properties` 中：
```
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=07280810
MYAPP_RELEASE_KEY_PASSWORD=07280810
```

#### 3.2 构建Release APK
```bash
# 方法1：使用React Native CLI
npx react-native build-android --mode=release

# 方法2：使用Gradle直接构建
cd android
./gradlew assembleRelease
cd ..
```

生成的APK位置：`android/app/build/outputs/apk/release/app-release.apk`

### 4. 生成AAB文件（推荐用于Google Play）
```bash
cd android
./gradlew bundleRelease
cd ..
```

生成的AAB位置：`android/app/build/outputs/bundle/release/app-release.aab`

## 构建脚本

### Windows PowerShell 脚本
创建 `build-apk.ps1`：
```powershell
# 清理项目
Write-Host "清理项目..." -ForegroundColor Green
cd android
./gradlew clean
cd ..

# 安装依赖
Write-Host "安装依赖..." -ForegroundColor Green
npm install

# 构建Debug APK
Write-Host "构建Debug APK..." -ForegroundColor Green
cd android
./gradlew assembleDebug
cd ..

Write-Host "Debug APK已生成: android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Yellow

# 构建Release APK
Write-Host "构建Release APK..." -ForegroundColor Green
cd android
./gradlew assembleRelease
cd ..

Write-Host "Release APK已生成: android/app/build/outputs/apk/release/app-release.apk" -ForegroundColor Yellow
```

### 批处理脚本
创建 `build-apk.bat`：
```batch
@echo off
echo 清理项目...
cd android
gradlew clean
cd ..

echo 安装依赖...
npm install

echo 构建Debug APK...
cd android
gradlew assembleDebug
cd ..

echo Debug APK已生成: android/app/build/outputs/apk/debug/app-debug.apk

echo 构建Release APK...
cd android
gradlew assembleRelease
cd ..

echo Release APK已生成: android/app/build/outputs/apk/release/app-release.apk
pause
```

## 常见问题解决

### 1. 内存不足错误
在 `android/gradle.properties` 中增加内存配置：
```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### 2. 构建失败
```bash
# 清理并重新构建
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### 3. 签名问题
确保 `my-release-key.keystore` 文件存在于 `android/app/` 目录下。

### 4. 依赖问题
```bash
# 清理node_modules并重新安装
rm -rf node_modules
npm install
cd android
./gradlew clean
cd ..
```

## 项目配置信息
- **应用ID**: com.awesomeproject
- **版本号**: 1.0 (versionCode: 1)
- **最低SDK**: 24
- **目标SDK**: 34
- **编译SDK**: 35
- **架构支持**: armeabi-v7a, arm64-v8a, x86, x86_64
- **新架构**: 已启用
- **Hermes引擎**: 已启用

## 快速开始
1. 运行 `npm install` 安装依赖
2. 运行 `cd android && ./gradlew assembleRelease && cd ..` 构建Release APK
3. 在 `android/app/build/outputs/apk/release/` 目录找到生成的APK文件

## 注意事项
- Release APK已使用项目配置的密钥签名
- 建议在发布前进行充分测试
- 如需发布到Google Play，建议使用AAB格式
- 确保所有必要的权限在AndroidManifest.xml中正确配置

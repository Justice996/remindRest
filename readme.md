休息提醒应用

一个基于Electron开发的桌面应用，帮助用户定时休息，保护眼睛和身体健康。

功能特性
✅ 系统托盘常驻
✅ 自定义休息间隔（1-1440分钟）
✅ 全屏休息提醒界面
✅ 开机自启动（可选）
✅ 动态Emoji动画效果

快速开始
安装依赖
bash
运行
npm install
开发模式
bash
运行
npm run dev
打包应用
bash
运行
npm run dist
使用说明
右键点击系统托盘图标
选择"设置休息间隔"输入分钟数
勾选"开机自启动"保持常驻
通过"立即休息"手动触发提醒
配置选项
在src/main.ts中可修改：

typescript

// 默认休息间隔（45分钟）let INTERVAL = 45 * 60 * 1000; // 开发环境判断const isDev = process.env.NODE_ENV === 'development';
打包说明
输出目录：/release
支持Windows便携版
使用electron-builder配置
贡献指南
Fork本仓库
创建特性分支
提交Pull Request
许可证
MIT License
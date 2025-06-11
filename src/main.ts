import { app, BrowserWindow, ipcMain, Tray, Menu, dialog } from "electron";
import * as path from "path";

let restWindow: BrowserWindow | null = null;
let timer: NodeJS.Timeout | null = null;
let tray: Tray | null = null;
let INTERVAL = 5000; // 默认45分钟
// 默认开启自启动
let autoLaunch = true;

// 添加开发环境判断
const isDev = process.env.NODE_ENV === 'development';

// 添加获取自启动状态的函数
function getAutoLaunchStatus() {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
}

// 添加设置自启动状态的函数
function setAutoLaunch(enable: boolean) {
  // 仅在打包后的应用中设置自启动
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: enable,
      // 可选：在启动时不显示窗口
      openAsHidden: true
    });
  }
  autoLaunch = enable;
  updateTrayMenu(); // 更新托盘菜单显示
}

function createRestWindow() {
  // 尝试加载应用图标
  let iconPath;
  try {
    iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  } catch (error) {
    console.error('加载图标路径出错:', error);
    iconPath = undefined;
  }

  restWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,  // 改为true启用透明
    icon: iconPath,  // 添加图标
    webPreferences: {
      nodeIntegration: true,  // 需要改为true
      contextIsolation: false  // 需要改为false
    }
  });
  
  // 修改文件路径的获取方式
  const htmlPath = path.join(__dirname, "..", "dist", "renderer", "index.html");
  restWindow.loadFile(htmlPath);
  
  restWindow.setAlwaysOnTop(true, "screen-saver");
  restWindow.setFullScreen(true);

  // 添加这一行来打开开发者工具
  // restWindow.webContents.openDevTools();
  
  // 任意点击关闭
  restWindow.webContents.once("did-finish-load", () => {
    restWindow!.webContents.send("show-emoji");
  });

  restWindow.on("closed", () => {
    restWindow = null;
    startTimer();
  });

  // 开发环境下添加页面刷新快捷键
  if (isDev) {
    restWindow.webContents.on('before-input-event', (event, input) => {
      // Ctrl+R 或 F5 刷新页面
      if ((input.control && input.key === 'r') || input.key === 'F5') {
        restWindow?.reload();
      }
    });
  }
}

// 创建系统托盘
function createTray() {
  const { nativeImage } = require('electron');
  let icon;
  
  try {
    // 尝试加载自定义图标
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
    icon = nativeImage.createFromPath(iconPath);
    
    // 检查图标是否为空
    if (icon.isEmpty()) {
      console.log('图标加载失败，使用空图标');
      icon = nativeImage.createEmpty();
    }
  } catch (error) {
    console.error('加载图标出错:', error);
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  updateTrayMenu();
}

// 更新托盘菜单
function updateTrayMenu() {
  // 将时间间隔转换为分钟显示
  const intervalMinutes = Math.round(INTERVAL / 60000);
  
  // 获取当前自启动状态
  autoLaunch = getAutoLaunchStatus();
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '立即休息', 
      click: () => {
        if (!restWindow) createRestWindow();
      } 
    },
    { type: 'separator' },
    {
      label: `当前间隔: ${intervalMinutes}分钟`,
      enabled: false
    },
    { 
      label: '设置休息间隔', 
      click: () => {
        showIntervalDialog();
      } 
    },
    { type: 'separator' },
    { 
      label: '开机自启动', 
      type: 'checkbox',
      checked: autoLaunch,
      click: () => {
        setAutoLaunch(!autoLaunch);
      } 
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        app.quit();
      } 
    }
  ]);
  
  tray?.setToolTip('休息提醒');
  tray?.setContextMenu(contextMenu);
}

// 显示设置间隔的对话框
function showIntervalDialog() {
  const currentMinutes = Math.round(INTERVAL / 60000);
  
  // 创建一个简单的输入窗口
  const inputWindow = new BrowserWindow({
    width: 350,  // 增加宽度
    height: 180,  // 增加高度
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: restWindow || undefined,
    modal: true,
    show: false,
    frame: false,  // 移除窗口边框
    transparent: false,  // 不需要透明
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // 创建HTML内容 - 添加关闭按钮
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>设置休息间隔</title>
      <style>
        body {
          font-family: system-ui;
          padding: 15px;
          margin: 0;
          background-color: #f5f5f5;
          border-radius: 5px;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .title {
          font-weight: bold;
          font-size: 16px;
        }
        .close-btn {
          cursor: pointer;
          font-size: 18px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .close-btn:hover {
          background-color: #e0e0e0;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        input {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 5px;
        }
        button {
          padding: 8px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #confirm {
          background-color: #4CAF50;
          color: white;
        }
        #cancel {
          background-color: #f1f1f1;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">设置休息间隔</div>
        <div class="close-btn" id="close">×</div>
      </div>
      <div class="container">
        <div class="input-group">
          <input type="number" id="interval" min="1" max="1440" value="${currentMinutes}" placeholder="输入休息间隔">
          <span>分钟</span>
        </div>
        <div class="buttons">
          <button id="cancel">取消</button>
          <button id="confirm">确定</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        document.getElementById('confirm').addEventListener('click', () => {
          const interval = document.getElementById('interval').value;
          ipcRenderer.send('set-interval', interval);
        });
        
        document.getElementById('cancel').addEventListener('click', () => {
          ipcRenderer.send('cancel-interval');
        });
        
        document.getElementById('close').addEventListener('click', () => {
          ipcRenderer.send('cancel-interval');
        });
        
        // 按ESC键关闭窗口
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            ipcRenderer.send('cancel-interval');
          }
          // 按Enter键确认
          if (e.key === 'Enter') {
            const interval = document.getElementById('interval').value;
            ipcRenderer.send('set-interval', interval);
          }
        });
      </script>
    </body>
    </html>
  `;
  
  // 将HTML内容写入临时文件或直接加载
  inputWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  
  // 窗口准备好后显示
  inputWindow.once('ready-to-show', () => {
    inputWindow.show();
  });
  
  // 处理窗口关闭事件
  inputWindow.on('closed', () => {
    // 移除所有与此窗口相关的事件监听器
    ipcMain.removeAllListeners('set-interval');
    ipcMain.removeAllListeners('cancel-interval');
  });
  
  // 处理IPC消息
  const setIntervalHandler = (event: Electron.IpcMainEvent, minutes: string) => {
    const mins = parseInt(minutes);
    if (!isNaN(mins) && mins > 0 && mins <= 1440) {
      INTERVAL = mins * 60 * 1000;
      // 重新启动计时器
      startTimer();
      // 更新托盘菜单
      updateTrayMenu();
    }
    
    // 检查窗口是否仍然存在且未被销毁
    if (inputWindow && !inputWindow.isDestroyed()) {
      inputWindow.close();
    }
  };
  
  const cancelIntervalHandler = (event: Electron.IpcMainEvent) => {
    // 检查窗口是否仍然存在且未被销毁
    if (inputWindow && !inputWindow.isDestroyed()) {
      inputWindow.close();
    }
  };
  
  ipcMain.once('set-interval', setIntervalHandler);
  ipcMain.once('cancel-interval', cancelIntervalHandler);
}

// 计时器
function startTimer() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    createRestWindow();
  }, INTERVAL);
}

app.whenReady().then(() => {
  // 初始化时获取自启动状态
  autoLaunch = getAutoLaunchStatus();
  
  // 如果是首次运行，设置为开机自启
  if (!isDev) {
    setAutoLaunch(true);
  }
  
  createTray();
  startTimer();
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createRestWindow();
    }
  });
});

ipcMain.on("close-rest-window", () => {
  console.log("收到关闭窗口请求");
  if (restWindow) {
    console.log("正在关闭窗口");
    restWindow.close();
  }
});

// 修改这里，防止应用退出
app.on("window-all-closed", () => {
  // 在macOS上，应用程序和菜单栏通常会保持活动状态，直到用户使用Cmd+Q明确退出
  // 在Windows和Linux上，我们也希望应用保持在后台运行
  // 所以这里不执行任何操作，让应用继续运行
});
console.log("当前restWindow状态:", restWindow);
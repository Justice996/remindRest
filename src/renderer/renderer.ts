const { ipcRenderer } = require("electron");

document.addEventListener('click', () => {
    console.log("点击事件已触发，正在发送关闭信号");
    ipcRenderer.send("close-rest-window");
});

ipcRenderer.on("show-emoji", () => {
    console.log("收到显示 emoji 事件");
});
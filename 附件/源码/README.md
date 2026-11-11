# 回声 Echo · 用户体验设计期末作业

线上体验：http://47.99.114.48/echo/

## 目录结构

```
回声Echo_用户体验设计/
├── 回声Echo_用户体验设计报告.docx    期末报告（按福大实验报告模板，7章/3602字/9图）
├── 回声Echo_答辩演示.pptx            答辩演示（16页，含3处扫码二维码）
├── src/                              项目源码（纯静态，零依赖）
│   ├── index.html
│   ├── style.css
│   ├── app.js                        WebAudio 实时合成配乐
│   └── README.md                     部署说明
├── assets/
│   ├── figures/                      报告中使用的图表
│   ├── screenshots/                  网站截图（桌面 2x + 手机 3x）
│   ├── fzu_logo.png                  校名 LOGO
│   └── qr_card.png                   访问二维码
└── make_report.py                    报告生成脚本
```

## 本地运行

直接用浏览器打开 `src/index.html` 即可，无需构建、无需服务器。

## 部署

纯静态，上传到任意 Web 目录即可。详见 `src/README.md`。

服务器占用：磁盘 80 KB，内存 0 MB，无音频文件。

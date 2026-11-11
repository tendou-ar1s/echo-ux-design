# 回声 Echo · 部署说明

纯静态站点，零后端、零数据库、零运行时。

## 服务器资源占用

| 项目 | 数值 |
|---|---|
| 内存占用 | **0 MB**（nginx 直接发静态文件，无 Node/Python 进程） |
| CPU 占用 | 0（仅 nginx 静态文件 I/O） |
| 磁盘占用 | 约 60 KB（3 个文件） |
| 音频文件 | **无**（WebAudio 实时合成，不下载任何音频） |

> 这就是选纯静态 + 合成音频的原因：服务器内存只有 1.7 GB，已被其他服务占用 ~700 MB。

## 部署步骤

```bash
# 1. 上传
scp -i _yzk_kskbl.pem -r ./app root@47.99.114.48:/var/www/echo

# 2. 配置 nginx（与已有 medical-kg 站点并存）
ssh root@47.99.114.48
cat > /etc/nginx/sites-available/echo <<'EOF'
server {
    listen 80;
    listen 443 ssl;
    server_name echo.local;

    ssl_certificate     /etc/nginx/ssl/medical-kg.crt;
    ssl_certificate_key /etc/nginx/ssl/medical-kg.key;

    root /var/www/echo;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript;
    gzip_min_length 1024;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOF
ln -sf /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/echo
nginx -t && systemctl reload nginx
```

部署后访问：`http://47.99.114.48/echo/`

## 文件清单

```
app/
├── index.html    页面结构
├── style.css     设计系统（深空蓝 × 暖金）
├── app.js        交互逻辑 + WebAudio 音乐引擎
└── README.md     本文件
```

## 音乐实现说明

不使用任何音频文件，全部由 WebAudio API 实时合成：

- **低频垫**：3 个略微失谐的正弦波（D2/A2/D3），LFO 缓慢调制音量
- **旋律**：D 大调五声音阶随机取音（293–880 Hz），避开半音冲突
- **混响**：程序生成 3.6 秒卷积脉冲响应，模拟大空间
- **呼吸引导音**：吸气 220 Hz / 呼气 165 Hz 的短促低鸣
- **完成音**：440→587→740→880 Hz 上行琶音

好处：0 带宽、0 存储、无限时长不循环、每次听都不一样。

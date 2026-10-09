#!/bin/sh
cd "$(dirname "$0")" && echo "Mở http://localhost:8000" && python3 -m http.server 8000

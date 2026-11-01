@echo off
title Lottie Pose Studio
echo ===================================================
echo     Lottie Pose Studio ^& Vector / Image Exporter
echo ===================================================
echo.
echo Starting local web server...
echo URL: http://localhost:8080
echo.
echo Press Ctrl+C in this window to stop the server.
echo.
start "" http://localhost:8080
python -m http.server 8080

@echo off
title Lottie Pose & 3D Print Studio
echo ===================================================
echo     Lottie Pose & 3D Print Studio
echo ===================================================
echo.
echo Starting local web server on port 8585...
echo URL: http://localhost:8585
echo.
echo Press Ctrl+C in this window to stop the server.
echo.
start "" http://localhost:8585
python -m http.server 8585

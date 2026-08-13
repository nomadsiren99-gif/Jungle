@echo off
cd /d "%~dp0"
echo ==================================================
echo  Starting Jungle. Website & CMS Server...
echo ==================================================
start http://localhost:3000
start http://localhost:3000/admin
npm start

@echo off
rem Pushes this folder to https://github.com/krishristov33-cloud/warrior-within
rem and you then enable GitHub Pages (Settings > Pages > Deploy from branch > main / root).
cd /d "%~dp0"
git init -b main
git add -A
git commit -m "Warrior2 platformer: playable desktop + mobile build, source, assets"
git remote remove origin 2>nul
git remote add origin https://github.com/krishristov33-cloud/warrior-within.git
git push -u origin main
pause

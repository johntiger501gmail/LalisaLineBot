@echo off
rem ÊØèÁµÑÇàÅ¢ÃÐËÇèÒ§ 1 ¶Ö§ 100 (»ÃÑºµÒÁ·Õè¤Ø³µéÍ§¡ÒÃ)
set /a number=%random% %% 100 + 1

rem à¾ÔèÁä¿Åì·Ñé§ËÁ´ã¹ Git
git add .

rem ÊÃéÒ§¢éÍ¤ÇÒÁ commit â´ÂãªéµÑÇàÅ¢·ÕèÊØèÁ
git commit -m "update %number%"

rem Êè§¡ÒÃà»ÅÕèÂ¹á»Å§ä»·Õè remote repository
git push origin main

pause
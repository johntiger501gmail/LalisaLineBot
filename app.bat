@echo off
rem ��������Ţ�����ҧ 1 �֧ 100 (��Ѻ������س��ͧ���)
set /a number=%random% %% 100 + 1

rem ������������� Git
git add .

rem ���ҧ��ͤ��� commit �������Ţ�������
git commit -m "update %number%"

rem �觡������¹�ŧ价�� remote repository
git push origin main

pause

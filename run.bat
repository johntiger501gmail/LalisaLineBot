@echo off
rem ��������Ţ�����ҧ 1 �֧ 100 (��Ѻ������س��ͧ���)
set /a number=%random% %% 100 + 1

rem �ѹ Node.js � background
start node index.js

rem ���������ͺ�Ӷ��
set /p userChoice="�ѹ����������? (�� Y ����仵�� ���� N ������ԡ): "

if /i "%userChoice%"=="Y" (
    rem ������������� Git
    git add .

    rem ���ҧ��ͤ��� commit �������Ţ�������
    git commit -m "update %number%"

    rem �觡������¹�ŧ价�� remote repository
    git push origin main
) else (
    echo ��ô��Թ��ö١¡��ԡ
)

pause

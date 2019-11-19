@ECHO OFF
SetLocal enabledelayedexpansion

::set filename= .\src\plugin.json 
SET logfile=%1
SET versionfile=%2

SET logfile=logfile.output
SET versionfile=.\src\plugin.json


if exist ".\version.temp" ( 
del ".\version.temp" >> %logfile% 
)
copy NUL .\version.temp >> %logfile%

for /f "delims=" %%a in ('powershell get-date -format "{yyyy-MM-dd}" ') do set updateDate=%%a

if exist %versionfile% (
 ECHO Found Version File >> %logfile% 
 ) ELSE (
	ECHO Version File Not Found >> %logfile% 
	GOTO FAIL
 )
ECHO Processing Version File >> %logfile%

for /f "tokens=1-2* delims=: " %%A in (%versionfile%) do (
	IF %%A == "version" (
		for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET version=%%y
		for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET preversion=%%x
		for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET postversion=%%z
		SET \A version = version+1
		ECHO "version":!preversion!.!version!.!postversion! >> version.temp
		ECHO Updated to Version !preversion!.!version!.!postversion! >> %logfile%
	) ELSE IF %%A == "updated"  (
		ECHO "updated": "%updateDate%" >> version.temp
	) ELSE (
		IF NOT "%%B" == "" (
			echo %%A:%%B%%C >> version.temp
		) ELSE (
			echo %%A%%C >> version.temp
		)
	)
)
 
del %versionfile% >> %logfile%
move .\version.temp %versionfile% >> %logfile%

GOTO END

:FAIL
ECHO Failed to increase version >> %logfile%

:END
EndLocal

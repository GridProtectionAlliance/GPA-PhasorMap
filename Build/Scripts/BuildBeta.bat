::*******************************************************************************************************
::  BuildBeta.bat - Gbtc
::
::  Copyright © 2013, Grid Protection Alliance.  All Rights Reserved.
::
::  Licensed to the Grid Protection Alliance (GPA) under one or more contributor license agreements. See
::  the NOTICE file distributed with this work for additional information regarding copyright ownership.
::  The GPA licenses this file to you under the Eclipse Public License -v 1.0 (the "License"); you may
::  not use this file except in compliance with the License. You may obtain a copy of the License at:
::
::      http://www.opensource.org/licenses/eclipse-1.0.php
::
::  Unless agreed to in writing, the subject software distributed under the License is distributed on an
::  "AS-IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. Refer to the
::  License for the specific language governing permissions and limitations.
::
::  Code Modification History:
::  -----------------------------------------------------------------------------------------------------
::  10/05/2009 - Pinal C. Patel
::       Generated original version of source code.
::  10/20/2009 - Pinal C. Patel
::       Modified to force a build and suppress archives from being published to public locations.
::  10/03/2010 - Pinal C. Patel
::       Updated to use MSBuild 4.0.
::  08/25 - Gavin E. Holden
::       Modified to call CommonBuild.bat 
::
::*******************************************************************************************************

@ECHO OFF
SetLocal enabledelayedexpansion

IF NOT "%1" == "" (SET logFlag=  "..\Build\Scripts\%1")
IF "%1" == "" (SET logFlag=NUL)
CD ..\..\Source\ >> %logFlag%

set filename= .\src\plugin.json 
if exist "%filename%.temp" del "%filename%.temp" >> %logFlag%
type NUL> %filename%.temp

for /f "delims=" %%a in (' powershell get-date -format "{yyyy-MM-dd}" ') do set updateDate=%%a


for /f "tokens=1-2* delims=: " %%A in (%filename%) do (

IF %%A == "version" (
	for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET version=%%y
	for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET preversion=%%x
	for /f "tokens=1-3 delims=. " %%x in ("%%B") do SET postversion=%%z
	SET \A version = version+1;
	ECHO "version":!preversion!.!version!.!postversion! >> %filename%.temp
	) ELSE IF %%A == "updated"  (
	ECHO "updated": "%updateDate%" >> %filename%.temp
	) ELSE (
	IF NOT "%%B" == "" (
	  echo %%A:%%B%%C >> %filename%.temp
	  ) ELSE (
	  echo %%A%%C >> %filename%.temp
	  )
	 )
 )
 
del %filename% >> %logFlag%
ren %filename%.temp plugin.json >> %logFlag%

ECHO Install NPM >> %logFlag%
CALL npm install  >> %logFlag%
ECHO BUILD TS >> %logFlag%
CALL .\node_modules\.bin\webpack  --mode=production >> %logFlag%

CD ..\Build\ >> %logFlag%
ECHO Create ZIP >> %logFlag%
Powershell -COMMAND Compress-Archive -Path .\Output\Release\dist -DestinationPath .\PhasorMapBinaries.zip >> %logFlag%
EndLocal


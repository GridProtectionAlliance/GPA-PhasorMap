::*******************************************************************************************************
::  BuildNightly.bat - Gbtc
::
::  Copyright © 2019, Grid Protection Alliance.  All Rights Reserved.
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
::  11/19/2019 - C. Lackner
::       Generated original version of source code.
::
::*******************************************************************************************************

@ECHO OFF
SetLocal enabledelayedexpansion

ECHO Starting Build

SET VersionTrackFile=GPA-PhasorMap.version
SET buildFolder=..\Output\Release\dist
SET LogPath=..\Build\Scripts\
SET destFolder=N:\GrafanaPanels\
SET ProjectName=GPA Phasor Map
SET PluginFile=.\src\plugin.json
SET ZipDirectory=grafana-pmumap-panel
SET ZipFile=PhasorMapBinaries.zip

IF NOT "%1" == "" (SET logFile=%1)

copy NUL "%logFile%"



CD "..\..\Source\" 
ECHO Changed Path To %CD% >> %LogPath%%logFile%

CALL ../Build/Scripts/GrafanaVersioning.bat %LogPath%%logFile% %PluginFile% %LogPath%%VersionTrackFile%

ECHO Install NPM >> %LogPath%%logFile%
CALL npm install  >> %LogPath%%logFile%
ECHO Run Yarn >> %LogPath%%logFile%
CALL .\node_modules\.bin\yarn >> %LogPath%%logFile%
ECHO BUILD TS >> %LogPath%%logFile%
CALL .\node_modules\.bin\webpack  --mode=production >> %LogPath%%logFile%

CD ..\Build\Scripts\
ECHO Changed Path to %CD% >> %logFile%
ECHO Create ZIP >> %logFile%

MKDIR ..\%ZipDirectory%\
XCOPY %buildfolder% ..\%ZipDirectory% /E /Y >> %logFile%
IF Exist (..\%ZipFile%) (del "..\%ZipFile%" >> %logFile% )
Powershell -COMMAND Compress-Archive -Path ..\%ZipDirectory% -DestinationPath ..\%ZipFile% >> %logFile%

RMDIR /S /Q ..\%ZipDirectory%\

set /p versionContent=< %VersionTrackFile%

XCOPY ..\* %destFolder% /E /Y /U >> %logFile%

CALL git add ../../* >> %logFile%
CALL git commit -m "%ProjectName%: Version change for build %versionContent%" >> %logFile%
CALL git push >> %logFile%
EndLocal


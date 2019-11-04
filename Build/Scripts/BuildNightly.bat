::*******************************************************************************************************
::  BuildNightly.bat - Gbtc
::
::  Copyright � 2013, Grid Protection Alliance.  All Rights Reserved.
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
::  10/20/2009 - Pinal C. Patel
::       Generated original version of source code.
::  09/14/2010 - Mihir Brahmbhatt
::		 Change Framework path from v3.5 to v4.0
::  10/03/2010 - Pinal C. Patel
::       Updated to use MSBuild 4.0.
::  08/25/2014 - Gavin E. Holden
::       Modified to call CommonBuild.bat.
::  01/13/2015 - Stephen C. Wills
::       Modified to match BuildBetaNoHelp.bat.
::
::*******************************************************************************************************

@ECHO OFF
SetLocal

IF NOT "%1" == "" (SET logFlag=  "..\Build\Scripts\%1")
IF "%1" == "" (SET logFlag=NUL)
CD ..\..\Source\
ECHO Install NPM > %logFlag%
CALL npm install  >> %logFlag%
ECHO BUILD TS >> %logFlag%
CALL .\node_modules\.bin\webpack  --mode=production >> %logFlag%

CD ..\Build\
ECHO Create ZIP >> %logFlag%
Powershell -COMMAND Compress-Archive -Path .\Output\Release\dist -DestinationPath .\PhasorMapBinaries.zip >> %logFlag%
EndLocal

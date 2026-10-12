; Native NSIS installer: embeds the application and creates the uninstaller
; on the customer's Windows machine. No Wine or signing bypass is needed.
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
Name "Aybars POS"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\Aybars POS"
InstallDirRegKey HKCU "Software\Aybars POS" "InstallDir"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Turkish"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "Bu sürüm 64 bit Windows 10/11 gerektirir."
    Abort
  ${EndIf}
  MessageBox MB_OKCANCEL "Kurulum veya güncelleme öncesinde Aybars POS uygulamasını kapatın. Mağaza kayıtlarınız korunacaktır." IDOK ready
  Abort
  ready:
FunctionEnd

Section "Aybars POS"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "${PROJECT_DIR}/dist/win-unpacked/*"
  IfErrors 0 files_ok
    MessageBox MB_OK|MB_ICONSTOP "Dosyalar kurulamadı. Açık Aybars POS pencerelerini kapatıp kurulumu tekrar çalıştırın."
    Abort
  files_ok:
  WriteUninstaller "$INSTDIR\Kaldir.exe"
  CreateShortcut "$DESKTOP\Aybars POS.lnk" "$INSTDIR\Aybars POS.exe"
  CreateDirectory "$SMPROGRAMS\Aybars POS"
  CreateShortcut "$SMPROGRAMS\Aybars POS\Aybars POS.lnk" "$INSTDIR\Aybars POS.exe"
  WriteRegStr HKCU "Software\Aybars POS" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "DisplayName" "Aybars POS"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "UninstallString" '$\"$INSTDIR\Kaldir.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "DisplayIcon" "$INSTDIR\Aybars POS.exe"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Aybars POS.lnk"
  RMDir /r "$SMPROGRAMS\Aybars POS"
  ; Customer data lives under %APPDATA%\aybars-pos\data, outside $INSTDIR.
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Aybars POS"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Aybars POS"
SectionEnd

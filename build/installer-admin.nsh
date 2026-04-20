; Configuração pós-instalação — Administrador
!macro customInstall
  ; Grava station-config.json
  FileOpen $0 "$INSTDIR\station-config.json" w
  FileWrite $0 '{"mode":"admin","serverIp":"localhost"}'
  FileClose $0

  ; Atalho no Desktop
  CreateShortCut "$DESKTOP\Painel de senha do Ni - Admin.lnk" "$INSTDIR\Painel de senha do Ni.exe" "" "$INSTDIR\Painel de senha do Ni.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Painel de senha do Ni - Admin.lnk"
  Delete "$INSTDIR\station-config.json"
!macroend

; Configuração pós-instalação — Operador + Telão (Dual Monitor)
!macro customInstall
  ; Grava station-config.json
  FileOpen $0 "$INSTDIR\station-config.json" w
  FileWrite $0 '{"mode":"dual","serverIp":"localhost"}'
  FileClose $0

  ; Atalho no Desktop
  CreateShortCut "$DESKTOP\Painel de senha do Ni - Dual Monitor.lnk" "$INSTDIR\Painel de senha do Ni.exe" "" "$INSTDIR\Painel de senha do Ni.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Painel de senha do Ni - Dual Monitor.lnk"
  Delete "$INSTDIR\station-config.json"
!macroend

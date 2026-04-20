; Configuração pós-instalação — Telão/Painel
!macro customInstall
  ; Pergunta o IP do servidor
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateLabel} 0 0 100% 20u "Digite o IP do computador onde o Totem está instalado:"
  Pop $0
  ${NSD_CreateText} 0 25u 100% 14u "192.168.1.100"
  Pop $R0
  nsDialogs::Show
  ${NSD_GetText} $R0 $1

  ; Grava station-config.json com o IP informado
  FileOpen $0 "$INSTDIR\station-config.json" w
  FileWrite $0 '{"mode":"painel","serverIp":"$1"}'
  FileClose $0

  ; Atalho no Desktop
  CreateShortCut "$DESKTOP\Painel de senha do Ni - Telao.lnk" "$INSTDIR\Painel de senha do Ni.exe" "" "$INSTDIR\Painel de senha do Ni.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Painel de senha do Ni - Telao.lnk"
  Delete "$INSTDIR\station-config.json"
!macroend

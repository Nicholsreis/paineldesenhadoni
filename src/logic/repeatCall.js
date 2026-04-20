// repeatCall — repete chamada atual
// Extraído de index.html para testes
// Depende de: window.APP_STATE, window.dispatchUpdate

export function repeatCall() {
  if (!window.APP_STATE.currentCall) return;
  window.dispatchUpdate();
}

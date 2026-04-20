import { describe, test, expect } from 'vitest';
import { repeatCall } from '../../src/logic/repeatCall.js';

describe('repeatCall', () => {
  test('invoca dispatchUpdate exatamente uma vez quando currentCall não é null', () => {
    window.APP_STATE.currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };
    
    repeatCall();
    
    expect(window.dispatchUpdate).toHaveBeenCalledTimes(1);
  });

  test('currentCall permanece inalterado após repeatCall', () => {
    const currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };
    window.APP_STATE.currentCall = currentCall;
    
    repeatCall();
    
    expect(window.APP_STATE.currentCall).toEqual(currentCall);
  });

  test('não invoca dispatchUpdate quando currentCall é null', () => {
    window.APP_STATE.currentCall = null;
    
    repeatCall();
    
    expect(window.dispatchUpdate).not.toHaveBeenCalled();
  });

  test('queue e called não são modificados', () => {
    window.APP_STATE.currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };
    window.APP_STATE.queue = [{ id: '1', ticket: '002', serviceId: 'general', time: Date.now() }];
    window.APP_STATE.called = [{ ticket: '001', serviceId: 'general', stationId: 1, time: Date.now() }];
    
    const queueBefore = [...window.APP_STATE.queue];
    const calledBefore = [...window.APP_STATE.called];
    
    repeatCall();
    
    expect(window.APP_STATE.queue).toEqual(queueBefore);
    expect(window.APP_STATE.called).toEqual(calledBefore);
  });
});

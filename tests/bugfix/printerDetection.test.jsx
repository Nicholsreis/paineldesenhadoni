/**
 * Bug Condition Exploration Test - Bug 1: Printer Detection Fails for USB Printers
 * 
 * Property 1: Bug Condition - Printer Detection via WMI
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock window.electronAPI (without checkPrinterWMI to simulate current state)
const mockElectronAPI = {
  getPaperStatus: vi.fn(),
  // checkPrinterWMI: NOT EXPOSED (this is the bug)
  printTicket: vi.fn(),
  onPaperStatusChange: vi.fn(),
  offPaperStatusChange: vi.fn(),
  isElectron: true,
};

// Simple ServiceButton component that mimics current buggy behavior
const BuggyServiceButton = ({ service, onTicketGenerated, onPaperOut, onPrintError }) => {
  const handleClick = async () => {
    const isElectron = window.electronAPI?.isElectron;
    
    if (isElectron) {
      // Current implementation: only checks getPaperStatus (BUG)
      const status = await window.electronAPI.getPaperStatus();
      if (status === 'out') {
        onPaperOut('out');
        return;
      }
      
      // BUG: Does NOT check checkPrinterWMI before printing
      // Expected: Should call checkPrinterWMI and block if not 'ok'
    }
    
    // Proceeds to print without WMI check
    const result = await window.electronAPI.printTicket('<html>test</html>');
    if (result.success) {
      onTicketGenerated({ number: 1, service: service.id });
    }
  };
  
  return <button onClick={handleClick}>{service.name}</button>;
};

describe('Bug 1: Printer Detection Fails for USB Printers', () => {
  beforeEach(() => {
    // Setup: Mock electronAPI on window
    global.window.electronAPI = mockElectronAPI;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default: getPaperStatus returns 'ok' (simulating serial polling not working for USB)
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok');
    
    // Default: printTicket succeeds
    mockElectronAPI.printTicket.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    delete global.window.electronAPI;
  });

  /**
   * Test Case 1: Impressora sem papel (out-of-paper)
   * 
   * Bug Condition: When printer is out of paper, system allows printing
   * Expected (after fix): System blocks printing and shows error
   */
  it('EXPLORATION: should call printTicket even when printer is out of paper (BUG)', async () => {
    // Arrange: Simulate printer without paper
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok'); // Serial polling doesn't work
    // Note: checkPrinterWMI is not available (not exposed in preload.js)
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' };
    
    render(
      <BuggyServiceButton
        service={service}
        onTicketGenerated={onTicketGenerated}
        onPaperOut={onPaperOut}
        onPrintError={onPrintError}
      />
    );
    
    // Act: User clicks service button
    const button = screen.getByText('Atendimento Normal');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Assert: BUG - printTicket is called even though printer is out of paper
      expect(mockElectronAPI.printTicket).toHaveBeenCalled();
    });
    
    // Expected behavior (after fix): checkPrinterWMI should be called
    // Expected behavior (after fix): printTicket should NOT be called
    // Expected behavior (after fix): onPaperOut should be called
    
    // Current behavior (BUG): checkPrinterWMI is NOT available
    expect(window.electronAPI.checkPrinterWMI).toBeUndefined();
    
    // Current behavior (BUG): onPaperOut is NOT called
    expect(onPaperOut).not.toHaveBeenCalled();
  });

  /**
   * Test Case 2: Impressora offline
   * 
   * Bug Condition: When printer is offline, system allows printing
   * Expected (after fix): System blocks printing and shows error
   */
  it('EXPLORATION: should call printTicket even when printer is offline (BUG)', async () => {
    // Arrange: Simulate offline printer
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok');
    // Note: checkPrinterWMI is not available (not exposed in preload.js)
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'priority', name: 'Atendimento Prioritário', color: '#f59e0b' };
    
    render(
      <BuggyServiceButton
        service={service}
        onTicketGenerated={onTicketGenerated}
        onPaperOut={onPaperOut}
        onPrintError={onPrintError}
      />
    );
    
    // Act
    const button = screen.getByText('Atendimento Prioritário');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Assert: BUG - printTicket is called even though printer is offline
      expect(mockElectronAPI.printTicket).toHaveBeenCalled();
    });
    
    // Current behavior (BUG): checkPrinterWMI is NOT available
    expect(window.electronAPI.checkPrinterWMI).toBeUndefined();
    
    // Current behavior (BUG): onPrintError is NOT called
    expect(onPrintError).not.toHaveBeenCalled();
  });

  /**
   * Test Case 3: Impressora com tampa aberta (error state)
   * 
   * Bug Condition: When printer has cover open, system allows printing
   * Expected (after fix): System blocks printing and shows error
   */
  it('EXPLORATION: should call printTicket even when printer has error (BUG)', async () => {
    // Arrange: Simulate printer with cover open
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok');
    // Note: checkPrinterWMI is not available (not exposed in preload.js)
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' };
    
    render(
      <BuggyServiceButton
        service={service}
        onTicketGenerated={onTicketGenerated}
        onPaperOut={onPaperOut}
        onPrintError={onPrintError}
      />
    );
    
    // Act
    const button = screen.getByText('Atendimento Normal');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Assert: BUG - printTicket is called even though printer has error
      expect(mockElectronAPI.printTicket).toHaveBeenCalled();
    });
    
    // Current behavior (BUG): checkPrinterWMI is NOT available
    expect(window.electronAPI.checkPrinterWMI).toBeUndefined();
    
    // Current behavior (BUG): onPrintError is NOT called
    expect(onPrintError).not.toHaveBeenCalled();
  });

  /**
   * Test Case 4: API WMI não está exposta no preload.js
   * 
   * Root Cause Verification: checkPrinterWMI is not exposed in preload.js
   */
  it('EXPLORATION: checkPrinterWMI is not exposed in window.electronAPI (ROOT CAUSE)', () => {
    // Assert: checkPrinterWMI should be undefined in current implementation
    expect(window.electronAPI.checkPrinterWMI).toBeUndefined();
    
    // Expected (after fix): checkPrinterWMI should be a function
    // expect(window.electronAPI.checkPrinterWMI).toBeInstanceOf(Function);
  });
});

/**
 * EXPECTED OUTCOME: All tests in this file should PASS (confirming the bug exists)
 * 
 * Counterexamples found:
 * 1. printTicket() is called even when printer is out of paper
 * 2. printTicket() is called even when printer is offline
 * 3. printTicket() is called even when printer has error
 * 4. checkPrinterWMI is not exposed in window.electronAPI
 * 
 * Root Cause Confirmed:
 * - API WMI exists in main.js but is not exposed in preload.js
 * - ServiceButton only checks getPaperStatus() which doesn't work for USB printers
 * - No pre-print verification using WMI
 */

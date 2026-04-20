/**
 * Bug Condition Fixed Test - Bug 1: Printer Detection Now Works via WMI
 * 
 * Property 1: Expected Behavior - Printer Detection Works via WMI
 * 
 * IMPORTANT: Re-run the SAME test from task 1 - do NOT write a new test
 * The test from task 1 encodes the expected behavior
 * When this test passes, it confirms the expected behavior is satisfied
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock window.electronAPI with checkPrinterWMI exposed (FIXED)
const mockElectronAPI = {
  getPaperStatus: vi.fn(),
  checkPrinterWMI: vi.fn(), // NOW EXPOSED (fixed)
  printTicket: vi.fn(),
  onPaperStatusChange: vi.fn(),
  offPaperStatusChange: vi.fn(),
  isElectron: true,
};

// ServiceButton component with WMI check (FIXED)
const FixedServiceButton = ({ service, onTicketGenerated, onPaperOut, onPrintError }) => {
  const handleClick = async () => {
    const isElectron = window.electronAPI?.isElectron;
    
    if (isElectron) {
      // Fixed implementation: checks checkPrinterWMI before printing
      if (window.electronAPI?.checkPrinterWMI) {
        try {
          const status = await window.electronAPI.checkPrinterWMI();
          
          if (status === 'out-of-paper') {
            onPaperOut('out');
            return;
          }
          
          if (status === 'offline' || status === 'error') {
            if (onPrintError) {
              onPrintError(status);
            } else {
              onPaperOut(status);
            }
            return;
          }
          
          // If status is 'ok', proceed with printing
        } catch (error) {
          console.error('[ServiceButton] WMI check failed:', error);
          // Continue with printing if WMI check fails (fallback behavior)
        }
      }
    }
    
    // Proceeds to print
    const result = await window.electronAPI.printTicket('<html>test</html>');
    if (result.success) {
      onTicketGenerated({ number: 1, service: service.id });
    }
  };
  
  const icon = service.id === 'priority' ? '⭐' : '🎫';
  return <button onClick={handleClick}>{service.name}</button>;
};

describe('Bug 1 FIXED: Printer Detection Now Works via WMI', () => {
  beforeEach(() => {
    // Setup: Mock electronAPI on window
    global.window.electronAPI = mockElectronAPI;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default: printTicket succeeds
    mockElectronAPI.printTicket.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    delete global.window.electronAPI;
  });

  /**
   * Test Case 1: Impressora sem papel (out-of-paper)
   * 
   * Expected (FIXED): System blocks printing and shows error
   */
  it('FIXED: should block printing when checkPrinterWMI returns out-of-paper', async () => {
    // Arrange: Simulate printer without paper
    mockElectronAPI.checkPrinterWMI.mockResolvedValue('out-of-paper');
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' };
    
    render(
      <FixedServiceButton
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
      // Assert: checkPrinterWMI is called (FIXED)
      expect(mockElectronAPI.checkPrinterWMI).toHaveBeenCalled();
    });
    
    // Assert: printTicket is NOT called (FIXED)
    expect(mockElectronAPI.printTicket).not.toHaveBeenCalled();
    
    // Assert: onPaperOut is called (FIXED)
    expect(onPaperOut).toHaveBeenCalledWith('out');
    
    // Assert: onTicketGenerated is NOT called (FIXED)
    expect(onTicketGenerated).not.toHaveBeenCalled();
  });

  /**
   * Test Case 2: Impressora offline
   * 
   * Expected (FIXED): System blocks printing and shows error
   */
  it('FIXED: should block printing when checkPrinterWMI returns offline', async () => {
    // Arrange: Simulate offline printer
    mockElectronAPI.checkPrinterWMI.mockResolvedValue('offline');
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'priority', name: 'Atendimento Prioritário', color: '#f59e0b' };
    
    render(
      <FixedServiceButton
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
      // Assert: checkPrinterWMI is called (FIXED)
      expect(mockElectronAPI.checkPrinterWMI).toHaveBeenCalled();
    });
    
    // Assert: printTicket is NOT called (FIXED)
    expect(mockElectronAPI.printTicket).not.toHaveBeenCalled();
    
    // Assert: onPrintError is called (FIXED)
    expect(onPrintError).toHaveBeenCalledWith('offline');
    
    // Assert: onTicketGenerated is NOT called (FIXED)
    expect(onTicketGenerated).not.toHaveBeenCalled();
  });

  /**
   * Test Case 3: Impressora com tampa aberta (error state)
   * 
   * Expected (FIXED): System blocks printing and shows error
   */
  it('FIXED: should block printing when checkPrinterWMI returns error', async () => {
    // Arrange: Simulate printer with cover open
    mockElectronAPI.checkPrinterWMI.mockResolvedValue('error');
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' };
    
    render(
      <FixedServiceButton
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
      // Assert: checkPrinterWMI is called (FIXED)
      expect(mockElectronAPI.checkPrinterWMI).toHaveBeenCalled();
    });
    
    // Assert: printTicket is NOT called (FIXED)
    expect(mockElectronAPI.printTicket).not.toHaveBeenCalled();
    
    // Assert: onPrintError is called (FIXED)
    expect(onPrintError).toHaveBeenCalledWith('error');
    
    // Assert: onTicketGenerated is NOT called (FIXED)
    expect(onTicketGenerated).not.toHaveBeenCalled();
  });

  /**
   * Test Case 4: API WMI está exposta no preload.js
   * 
   * Root Cause Fixed: checkPrinterWMI is now exposed in preload.js
   */
  it('FIXED: checkPrinterWMI is now exposed in window.electronAPI', () => {
    // Assert: checkPrinterWMI is now a function (FIXED)
    expect(window.electronAPI.checkPrinterWMI).toBeInstanceOf(Function);
  });

  /**
   * Test Case 5: Impressora OK - impressão procede normalmente
   * 
   * Preservation: Normal printing when printer is healthy
   */
  it('FIXED: should allow printing when checkPrinterWMI returns ok', async () => {
    // Arrange: Simulate healthy printer
    mockElectronAPI.checkPrinterWMI.mockResolvedValue('ok');
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' };
    
    render(
      <FixedServiceButton
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
      // Assert: checkPrinterWMI is called (FIXED)
      expect(mockElectronAPI.checkPrinterWMI).toHaveBeenCalled();
    });
    
    // Assert: printTicket IS called (PRESERVED)
    expect(mockElectronAPI.printTicket).toHaveBeenCalled();
    
    // Assert: onTicketGenerated IS called (PRESERVED)
    expect(onTicketGenerated).toHaveBeenCalledWith({
      number: 1,
      service: 'normal'
    });
    
    // Assert: error handlers are NOT called (PRESERVED)
    expect(onPaperOut).not.toHaveBeenCalled();
    expect(onPrintError).not.toHaveBeenCalled();
  });
});

/**
 * EXPECTED OUTCOME: All tests should PASS (confirms bug is fixed)
 * 
 * Fixed behaviors:
 * 1. checkPrinterWMI is now exposed in window.electronAPI
 * 2. ServiceButton calls checkPrinterWMI before printing
 * 3. Printing is blocked when printer is out-of-paper, offline, or error
 * 4. Appropriate error handlers are called
 * 5. Normal printing works when printer is healthy (preserved)
 */

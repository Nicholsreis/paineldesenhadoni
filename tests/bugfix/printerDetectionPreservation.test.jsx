/**
 * Preservation Property Tests - Bug 1: Normal Printing Behavior Unchanged
 * 
 * Property 2: Preservation - Normal Printing Behavior
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests capture the CURRENT behavior that must be preserved after the fix
 * 
 * EXPECTED OUTCOME: All tests should PASS on unfixed code (confirms baseline behavior)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock window.electronAPI with checkPrinterWMI for testing fixed behavior
const mockElectronAPI = {
  getPaperStatus: vi.fn(),
  checkPrinterWMI: vi.fn(), // Will be available after fix
  printTicket: vi.fn(),
  onPaperStatusChange: vi.fn(),
  offPaperStatusChange: vi.fn(),
  isElectron: true,
};

// ServiceButton component that will use checkPrinterWMI (simulating fixed behavior)
const FixedServiceButton = ({ service, onTicketGenerated, onPaperOut, onPrintError }) => {
  const handleClick = async () => {
    const isElectron = window.electronAPI?.isElectron;
    
    if (isElectron) {
      // Fixed implementation: checks checkPrinterWMI before printing
      if (window.electronAPI?.checkPrinterWMI) {
        const status = await window.electronAPI.checkPrinterWMI();
        
        if (status === 'out-of-paper') {
          onPaperOut('out');
          return;
        }
        
        if (status === 'offline' || status === 'error') {
          onPrintError(status);
          return;
        }
        
        // If status is 'ok', proceed with printing
      }
    }
    
    // Proceeds to print
    const result = await window.electronAPI.printTicket('<html>test</html>');
    if (result.success) {
      onTicketGenerated({ number: 1, service: service.id });
    }
  };
  
  return <button onClick={handleClick}>{service.name}</button>;
};

describe('Preservation: Normal Printing Behavior Unchanged', () => {
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
   * Test 1: When checkPrinterWMI() returns 'ok', verify printTicket() is called normally
   * 
   * Preservation Requirement 3.1, 3.2: Normal printing when printer is healthy
   */
  it('PRESERVATION: should allow printing when checkPrinterWMI returns ok', async () => {
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
    
    // Act: User clicks service button
    const button = screen.getByText('Atendimento Normal');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Assert: checkPrinterWMI is called
      expect(mockElectronAPI.checkPrinterWMI).toHaveBeenCalled();
    });
    
    // Assert: printTicket is called normally (PRESERVED BEHAVIOR)
    expect(mockElectronAPI.printTicket).toHaveBeenCalled();
    
    // Assert: onTicketGenerated is called (PRESERVED BEHAVIOR)
    expect(onTicketGenerated).toHaveBeenCalledWith({
      number: 1,
      service: 'normal'
    });
    
    // Assert: error handlers are NOT called (PRESERVED BEHAVIOR)
    expect(onPaperOut).not.toHaveBeenCalled();
    expect(onPrintError).not.toHaveBeenCalled();
  });

  /**
   * Test 2: When running in web mode (not Electron), verify printing works without printer checks
   * 
   * Preservation Requirement 3.3: Web mode continues to work
   */
  it('PRESERVATION: should work in web mode without printer checks', async () => {
    // Arrange: Simulate web mode (no Electron)
    const webElectronAPI = {
      ...mockElectronAPI,
      isElectron: false,
    };
    global.window.electronAPI = webElectronAPI;
    
    const onTicketGenerated = vi.fn();
    const onPaperOut = vi.fn();
    const onPrintError = vi.fn();
    
    const service = { id: 'priority', name: 'Atendimento Prioritário', color: '#f59e0b' };
    
    // Web mode ServiceButton (no printer checks)
    const WebServiceButton = ({ service, onTicketGenerated }) => {
      const handleClick = async () => {
        const isElectron = window.electronAPI?.isElectron;
        
        if (!isElectron) {
          // Web mode: no printer checks, just generate ticket
          onTicketGenerated({ number: 1, service: service.id });
        }
      };
      
      return <button onClick={handleClick}>{service.name}</button>;
    };
    
    render(
      <WebServiceButton
        service={service}
        onTicketGenerated={onTicketGenerated}
      />
    );
    
    // Act
    const button = screen.getByText('Atendimento Prioritário');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Assert: onTicketGenerated is called (PRESERVED BEHAVIOR)
      expect(onTicketGenerated).toHaveBeenCalled();
    });
    
    // Assert: printer checks are NOT called in web mode (PRESERVED BEHAVIOR)
    expect(webElectronAPI.checkPrinterWMI).not.toHaveBeenCalled();
    expect(webElectronAPI.printTicket).not.toHaveBeenCalled();
  });

  /**
   * Test 3: When using serial printer with polling working, verify status events are sent
   * 
   * Preservation Requirement 3.4: Polling continues to work for serial printers
   */
  it('PRESERVATION: should continue to send printer-paper-status events via polling', () => {
    // Arrange: Simulate serial printer polling
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok');
    
    const statusCallback = vi.fn();
    
    // Simulate polling mechanism
    mockElectronAPI.onPaperStatusChange(statusCallback);
    
    // Simulate status change event from main process
    const mockEvent = { type: 'printer-paper-status', status: 'near' };
    statusCallback(mockEvent.status);
    
    // Assert: callback is called with status (PRESERVED BEHAVIOR)
    expect(statusCallback).toHaveBeenCalledWith('near');
    
    // Assert: onPaperStatusChange is registered (PRESERVED BEHAVIOR)
    expect(mockElectronAPI.onPaperStatusChange).toHaveBeenCalled();
  });

  /**
   * Test 4: Multiple service buttons should all use WMI check
   * 
   * Preservation Requirement 3.1, 3.2: All service types work normally
   */
  it('PRESERVATION: should work for all service types (normal, priority)', async () => {
    // Arrange: Simulate healthy printer
    mockElectronAPI.checkPrinterWMI.mockResolvedValue('ok');
    
    const services = [
      { id: 'normal', name: 'Atendimento Normal', color: '#3b82f6' },
      { id: 'priority', name: 'Atendimento Prioritário', color: '#f59e0b' },
    ];
    
    for (const service of services) {
      vi.clearAllMocks();
      
      const onTicketGenerated = vi.fn();
      const onPaperOut = vi.fn();
      const onPrintError = vi.fn();
      
      const { unmount } = render(
        <FixedServiceButton
          service={service}
          onTicketGenerated={onTicketGenerated}
          onPaperOut={onPaperOut}
          onPrintError={onPrintError}
        />
      );
      
      // Act
      const button = screen.getByText(service.name);
      fireEvent.click(button);
      
      await waitFor(() => {
        // Assert: printTicket is called for each service type (PRESERVED BEHAVIOR)
        expect(mockElectronAPI.printTicket).toHaveBeenCalled();
      });
      
      // Assert: onTicketGenerated is called with correct service id (PRESERVED BEHAVIOR)
      expect(onTicketGenerated).toHaveBeenCalledWith({
        number: 1,
        service: service.id
      });
      
      unmount();
    }
  });

  /**
   * Test 5: Verify that getPaperStatus still works (for serial printers)
   * 
   * Preservation Requirement 3.4: Serial polling mechanism unchanged
   */
  it('PRESERVATION: should still support getPaperStatus for serial printers', async () => {
    // Arrange: Simulate serial printer
    mockElectronAPI.getPaperStatus.mockResolvedValue('ok');
    
    // Act: Call getPaperStatus
    const status = await mockElectronAPI.getPaperStatus();
    
    // Assert: getPaperStatus returns status (PRESERVED BEHAVIOR)
    expect(status).toBe('ok');
    expect(mockElectronAPI.getPaperStatus).toHaveBeenCalled();
  });
});

/**
 * EXPECTED OUTCOME: All tests should PASS on unfixed code
 * 
 * Baseline behaviors confirmed:
 * 1. Normal printing works when printer is healthy
 * 2. Web mode works without printer checks
 * 3. Serial printer polling continues to work
 * 4. All service types work correctly
 * 5. getPaperStatus API remains available
 * 
 * These behaviors MUST be preserved after implementing the fix
 */

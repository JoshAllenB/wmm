import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom/vitest';
import axios from 'axios';
import Add from '../add';
import { UserProvider } from '../../../../utils/Hooks/userProvider';

// Mock axios
vi.mock('axios');

// Mock the environment variable
process.env.VITE_IP_ADDRESS = 'localhost';

// Mock the user provider context
const mockUserContext = {
  user: { id: 1, username: 'testuser' },
  hasRole: (role) => ['HRG', 'FOM', 'CAL'].includes(role),
};

// Mock data for client information
const mockClientData = {
  fname: 'John',
  lname: 'Doe',
  email: 'john.doe@example.com',
  cellno: '1234567890',
  street1: '123 Test St',
};

// Mock the Button component
vi.mock('../../../UI/ShadCN/button', () => {
  return {
    Button: (props) => <button {...props}>{props.children}</button>
  };
});

describe('Add Component Role Combinations Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Setup default axios responses
    axios.post.mockResolvedValue({ data: { success: true } });
    axios.get.mockResolvedValue({ data: [] });
  });

  const renderAddComponent = () => {
    return render(
      <UserProvider value={mockUserContext}>
        <Add fetchClients={() => {}} />
      </UserProvider>
    );
  };

  const openAddModal = async () => {
    const addButton = screen.getByRole('button', { name: /add client/i });
    await act(async () => {
      await userEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Fill in the details to add a new client')).toBeInTheDocument();
    });
  };

  const fillBasicClientInfo = async () => {
    await openAddModal();
    
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/^First Name:/i), mockClientData.fname);
      await userEvent.type(screen.getByLabelText(/^Last Name:/i), mockClientData.lname);
      await userEvent.type(screen.getByLabelText(/^Email:/i), mockClientData.email);
      await userEvent.type(screen.getByLabelText(/^Cell Number:/i), mockClientData.cellno);
      await userEvent.type(
        screen.getByLabelText('Address (house/building number street name):'),
        mockClientData.street1
      );
    });
  };

  const selectRole = async (role) => {
    await waitFor(() => {
      expect(screen.getByText('Role-Specific Information')).toBeInTheDocument();
    });

    // Find the role button within the role-specific section
    const roleButtons = screen.getAllByRole('button', { name: role });
    const roleButton = roleButtons.find(button => button.textContent.trim() === role);
    expect(roleButton).toBeTruthy();

    await act(async () => {
      await userEvent.click(roleButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(`${role} Add`)).toBeInTheDocument();
    });
  };

  it('should render the Add component', async () => {
    renderAddComponent();
    const addButton = screen.getByRole('button', { name: /add client/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should handle HRG role submission', async () => {
    renderAddComponent();
    await fillBasicClientInfo();
    
    // Select HRG role first
    await selectRole('HRG');
    
    // Fill HRG specific fields
    await act(async () => {
      const receivedDateInput = screen.getByLabelText(/^Received Date:/i);
      const campaignDateInput = screen.getByLabelText(/^Campaign Date:/i);
      const renewDateInput = screen.getByLabelText(/^Renewal Date:/i);
      
      await userEvent.type(receivedDateInput, '2024-03-20');
      await userEvent.type(campaignDateInput, '2024-03-21');
      await userEvent.type(renewDateInput, '2024-03-22');
    });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Click confirm in the confirmation dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await act(async () => {
      await userEvent.click(confirmButton);
    });
    
    // Verify axios call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/clients/add',
        expect.objectContaining({
          roleType: 'HRG',
          clientData: expect.objectContaining({
            fname: mockClientData.fname,
            lname: mockClientData.lname,
            email: mockClientData.email,
            cellno: mockClientData.cellno,
          }),
          roleData: expect.objectContaining({
            recvdate: '2024-03-20',
            campaigndate: '2024-03-21',
            renewdate: '2024-03-22'
          })
        })
      );
    });
  });

  it('should handle FOM role submission', async () => {
    renderAddComponent();
    await fillBasicClientInfo();
    
    // Select FOM role
    await selectRole('FOM');
    
    // Fill FOM specific fields
    await act(async () => {
      const receivedDateInput = screen.getByLabelText(/^Received Date:/i);
      const paymentRefInput = screen.getByLabelText(/^Payment Reference:/i);
      const paymentAmtInput = screen.getByLabelText(/^Payment Amount:/i);
      const paymentFormInput = screen.getByLabelText(/^Payment Form:/i);
      
      await userEvent.type(receivedDateInput, '2024-03-20');
      await userEvent.type(paymentRefInput, 'REF123');
      await userEvent.type(paymentAmtInput, '1000');
      await userEvent.type(paymentFormInput, 'Cash');
    });
    
    // Submit and confirm
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await act(async () => {
      await userEvent.click(confirmButton);
    });
    
    // Verify axios call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/clients/add',
        expect.objectContaining({
          roleType: 'FOM',
          clientData: expect.objectContaining({
            fname: mockClientData.fname,
            lname: mockClientData.lname,
            email: mockClientData.email,
            cellno: mockClientData.cellno,
          }),
          roleData: expect.objectContaining({
            recvdate: '2024-03-20',
            paymtref: 'REF123',
            paymtamt: '1000',
            paymtform: 'CASH'
          })
        })
      );
    });
  });

  it('should handle CAL role submission', async () => {
    renderAddComponent();
    await fillBasicClientInfo();
    
    // Select CAL role
    await selectRole('CAL');
    
    // Fill CAL specific fields
    await act(async () => {
      const receivedDateInput = screen.getByLabelText(/^Received Date:/i);
      const calTypeInput = screen.getByLabelText(/^Calendar Type:/i);
      const calQtyInput = screen.getByLabelText(/^Calendar Quantity:/i);
      const paymentRefInput = screen.getByLabelText(/^Payment Reference:/i);
      
      await userEvent.type(receivedDateInput, '2024-03-20');
      await userEvent.type(calTypeInput, 'Wall Calendar');
      await userEvent.type(calQtyInput, '5');
      await userEvent.type(paymentRefInput, 'CALREF123');
    });
    
    // Submit and confirm
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await act(async () => {
      await userEvent.click(confirmButton);
    });
    
    // Verify axios call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/clients/add',
        expect.objectContaining({
          roleType: 'CAL',
          clientData: expect.objectContaining({
            fname: mockClientData.fname,
            lname: mockClientData.lname,
            email: mockClientData.email,
            cellno: mockClientData.cellno,
          }),
          roleData: expect.objectContaining({
            recvdate: '2024-03-20',
            caltype: 'WALL CALENDAR',
            calqty: '5',
            paymtref: 'CALREF123'
          })
        })
      );
    });
  });

  it('should show role selection buttons for users with multiple roles', async () => {
    renderAddComponent();
    await openAddModal();
    
    await waitFor(() => {
      expect(screen.getByText('Role-Specific Information')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HRG' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FOM' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CAL' })).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog before submitting', async () => {
    renderAddComponent();
    await fillBasicClientInfo();
    await selectRole('HRG');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to add this client?')).toBeInTheDocument();
    });
  });
});
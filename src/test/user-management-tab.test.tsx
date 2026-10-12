import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserManagementTab } from '../components/user-management-tab';

describe('UserManagementTab Component', () => {
  it('renders dynamic directory with authenticated owner user', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    expect(screen.getAllByText('User Management').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Members')).toBeDefined();
    expect(screen.getByText('Create User')).toBeDefined();
    expect(screen.getByText('sivaji491@gmail.com')).toBeDefined();
  });

  it('filters users dynamically by search query', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const searchInput = screen.getByPlaceholderText('Search by name or email address…');
    fireEvent.change(searchInput, { target: { value: 'sivaji' } });
    expect(screen.getByText('sivaji491@gmail.com')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'nonexistent-user-xyz' } });
    expect(screen.getByText('No members found')).toBeDefined();
  });

  it('dynamically opens and closes the create user dialog', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);
    expect(screen.getByText('Create Workspace User')).toBeDefined();
    expect(screen.getByText('Generate Strong Password')).toBeDefined();
    expect(screen.getByText('Navigation & Page Permissions')).toBeDefined();
    expect(screen.queryByText('Platform Status')).toBeNull();
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(screen.queryByText('Create Workspace User')).toBeNull();
  });

  it('dynamically creates a new user with username, optional email, and navigation checkboxes', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('User Password');

    fireEvent.change(usernameInput, { target: { value: 'perm_user' } });
    fireEvent.change(emailInput, { target: { value: 'perm.user@nexora.io' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    const submitBtn = screen.getByRole('button', { name: /save user|create user account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('@perm_user')).toBeDefined();
    expect(screen.getByText('perm.user@nexora.io')).toBeDefined();
  });

  it('allows creating a user with username and password only without providing email', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('User Password');

    fireEvent.change(usernameInput, { target: { value: 'no_email_user' } });
    fireEvent.change(passwordInput, { target: { value: 'Password999!' } });

    const submitBtn = screen.getByRole('button', { name: /save user|create user account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('@no_email_user')).toBeDefined();
    expect(screen.getByText('No email · Login via username')).toBeDefined();
  });

  it('rejects email addresses in the username field', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('User Password');

    fireEvent.change(usernameInput, { target: { value: 'notallowed@domain.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password999!' } });

    const submitBtn = screen.getByRole('button', { name: /save user|create user account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Username cannot be an email address. Please enter a username only.')).toBeDefined();
  });

  it('displays navigation field permission checkboxes and allows toggling', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    expect(screen.getByText('Navigation & Page Permissions')).toBeDefined();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });

  it('renders login duration field and accepts valid HH:MM:SS duration presets', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    expect(screen.getByLabelText('Login Duration (HH:MM:SS)')).toBeDefined();
    expect(screen.getByText('30s (00:00:30)')).toBeDefined();
    expect(screen.getByText('1h (01:00:00)')).toBeDefined();

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('User Password');
    const durationInput = screen.getByLabelText('Login Duration (HH:MM:SS)');

    fireEvent.change(usernameInput, { target: { value: 'timed_user' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.change(durationInput, { target: { value: '00:30:00' } });

    const submitBtn = screen.getByRole('button', { name: /save user|create user account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('@timed_user')).toBeDefined();
    expect(screen.getByText('00:30:00')).toBeDefined();
  });

  it('rejects invalid duration such as 01:75:90 with descriptive error', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('User Password');
    const durationInput = screen.getByLabelText('Login Duration (HH:MM:SS)');

    fireEvent.change(usernameInput, { target: { value: 'bad_duration_user' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.change(durationInput, { target: { value: '01:75:90' } });

    const submitBtn = screen.getByRole('button', { name: /save user|create user account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Minutes and seconds must be between 00 and 59.')).toBeDefined();
  });

  it('renders visible Save and Cancel buttons and handles cancellation cleanly', () => {
    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    const saveBtn = screen.getByRole('button', { name: /save user/i });
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(saveBtn).toBeDefined();
    expect(cancelBtn).toBeDefined();

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'cancelled_user' } });

    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Create Workspace User')).toBeNull();
    expect(screen.queryByText('@cancelled_user')).toBeNull();
  });
});

import { getUserAllowedTabs } from '../lib/permissions';

describe('Navigation Permissions Access Logic', () => {
  it('guarantees admin sivaji491@gmail.com always has full access to User Management and all tabs', () => {
    const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
    expect(adminTabs).toContain('users');
    expect(adminTabs).toContain('home');
    expect(adminTabs).toContain('status');
  });

  it('guarantees preview admin always has full access to User Management and all tabs', () => {
    const previewTabs = getUserAllowedTabs('preview@nexora.example');
    expect(previewTabs).toContain('users');
    expect(previewTabs).toContain('home');
    expect(previewTabs).toContain('status');
  });

  it('shows only ticked navigation field pages for a user configured by admin', () => {
    window.localStorage.setItem('nexora_workspace_users', JSON.stringify([
      {
        id: 'usr-home-only',
        name: 'Home Viewer',
        email: 'homeonly@nexora.io',
        permissions: ['home'],
      },
      {
        id: 'usr-status-only',
        name: 'Status Viewer',
        email: 'statusonly@nexora.io',
        permissions: ['status'],
      },
      {
        id: 'usr-home-status',
        name: 'Dual Viewer',
        email: 'dual@nexora.io',
        permissions: ['home', 'status'],
      },
    ]));

    const homeUserTabs = getUserAllowedTabs('homeonly@nexora.io');
    expect(homeUserTabs).toEqual(['home']);
    expect(homeUserTabs).not.toContain('users');

    const statusUserTabs = getUserAllowedTabs('statusonly@nexora.io');
    expect(statusUserTabs).toEqual(['status']);
    expect(statusUserTabs).not.toContain('users');

    const dualUserTabs = getUserAllowedTabs('dual@nexora.io');
    expect(dualUserTabs).toEqual(['home', 'status']);
    expect(dualUserTabs).not.toContain('users');
  });

  it('resolves permissions accurately by username for a user with no email', () => {
    window.localStorage.setItem('nexora_workspace_users', JSON.stringify([
      {
        id: 'usr-only-username',
        username: 'sammy22',
        name: 'sammy22',
        password: 'password123',
        permissions: ['home'],
      },
    ]));

    const sammyTabs = getUserAllowedTabs('sammy22');
    expect(sammyTabs).toEqual(['home']);
    expect(sammyTabs).not.toContain('users');
  });

  it('guarantees admin sivaji username has full access to all tabs', () => {
    const sivajiTabs = getUserAllowedTabs('sivaji');
    expect(sivajiTabs).toContain('users');
    expect(sivajiTabs).toContain('home');
    expect(sivajiTabs).toContain('status');
  });

  it('dynamically reflects newly registered nav bar fields and applies them to existing users', async () => {
    const { registerDynamicNavigationField, getRegisteredNavigationFields } = await import('../lib/permissions');
    
    // Set up existing user
    window.localStorage.setItem('nexora_workspace_users', JSON.stringify([
      {
        id: 'usr-existing-member',
        username: 'existing_member',
        name: 'Existing Member',
        permissions: ['home'],
      },
    ]));

    // Register a new navigation field dynamically
    registerDynamicNavigationField({
      id: 'analytics',
      label: 'Analytics Dashboard',
      description: 'Business metrics and performance analytics',
    }, true);

    // Verify it is in registered navigation fields
    const registered = getRegisteredNavigationFields();
    expect(registered.some((f) => f.id === 'analytics')).toBe(true);

    // Verify it automatically updated existing users in localStorage
    const updatedUsers = JSON.parse(window.localStorage.getItem('nexora_workspace_users') || '[]');
    const member = updatedUsers.find((u: any) => u.id === 'usr-existing-member');
    expect(member.permissions).toContain('analytics');
  });

  it('does not display Platform Status in the Edit Page Permissions modal', () => {
    window.localStorage.setItem('nexora_workspace_users', JSON.stringify([
      {
        id: 'usr-swamy',
        username: 'swamy',
        name: 'Swamy Member',
        permissions: ['home', 'ranks'],
      },
    ]));

    render(<UserManagementTab currentUserEmail="sivaji491@gmail.com" />);
    const editPermBtns = screen.getAllByTitle('Edit page permissions');
    fireEvent.click(editPermBtns[0]!);

    expect(screen.getByText(/Edit Page Permissions/i)).toBeDefined();
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ranks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Currency Settings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configuration Settings').length).toBeGreaterThan(0);
    expect(screen.queryByText('Platform Status')).toBeNull();
  });
});

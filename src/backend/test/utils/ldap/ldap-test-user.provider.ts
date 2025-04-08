import { exec } from 'child_process';
import { promisify } from 'util';
import { StartedSambaLdapContainerWithDetails } from '../testcontainers/samba-ldap.container';

const execAsync = promisify(exec);

/**
 * LDAP test user data structure
 */
export interface LdapTestUser {
  sAMAccountName: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Provider for generating and managing LDAP test users
 */
export class LdapTestUserProvider {
  private readonly testUsers: LdapTestUser[] = [
    {
      sAMAccountName: 'testuser',
      email: 'testuser@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'Test1234!',
    },
    {
      sAMAccountName: 'admin',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'Admin1234!',
    },
  ];

  constructor(private readonly container: StartedSambaLdapContainerWithDetails) {}

  /**
   * Get all available test users
   */
  public getTestUsers(): LdapTestUser[] {
    return this.testUsers;
  }

  /**
   * Get a specific test user by sAMAccountName
   */
  public getTestUser(sAMAccountName: string): LdapTestUser | undefined {
    return this.testUsers.find(user => user.sAMAccountName === sAMAccountName);
  }

  /**
   * Setup all test users in the LDAP server
   */
  public async setupTestUsers(): Promise<void> {
    for (const user of this.testUsers) {
      await this.createLdapUser(user);
    }
  }

  /**
   * Create a single LDAP user using samba-tool command
   */
  private async createLdapUser(user: LdapTestUser): Promise<void> {
    const sambaToolCmd = this.buildSambaToolCommand(user);
    try {
      // Execute samba-tool inside the container to create a user
      await execAsync(`docker exec ${this.getContainerId()} ${sambaToolCmd}`);
      console.log(`Created LDAP test user: ${user.sAMAccountName}`);
    } catch (error) {
      console.error(`Failed to create LDAP test user: ${user.sAMAccountName}`, error);
      throw error;
    }
  }

  /**
   * Build samba-tool command for user creation
   */
  private buildSambaToolCommand(user: LdapTestUser): string {
    return [
      'samba-tool user create',
      user.sAMAccountName,
      `"${user.password}"`,
      `--given-name="${user.firstName}"`,
      `--surname="${user.lastName}"`,
      `--mail-address="${user.email}"`,
      '--must-change-at-next-login=false',
    ].join(' ');
  }

  /**
   * Get container ID from the testcontainer instance
   */
  private getContainerId(): string {
    const containerId = this.container['containerId'];
    if (!containerId) {
      throw new Error('Container ID not found in testcontainer instance');
    }
    return containerId;
  }
} 
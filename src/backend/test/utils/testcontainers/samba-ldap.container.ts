import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export class SambaLdapContainer extends GenericContainer {
  private static readonly DEFAULT_SAMBA_IMAGE = 'nowsci/samba-domain:4.15.9';
  private static readonly DEFAULT_SAMBA_PORT = 389;
  private static readonly DEFAULT_ADMIN_PASSWORD = 'Passw0rd';
  private static readonly DEFAULT_DOMAIN = 'EXAMPLE.COM';
  private static readonly DEFAULT_ADMIN_USER = 'Administrator';

  constructor(
    image: string = SambaLdapContainer.DEFAULT_SAMBA_IMAGE,
    adminPassword: string = SambaLdapContainer.DEFAULT_ADMIN_PASSWORD,
    domain: string = SambaLdapContainer.DEFAULT_DOMAIN,
  ) {
    super(image);

    this.withExposedPorts(
      SambaLdapContainer.DEFAULT_SAMBA_PORT, // LDAP
      636,  // LDAPS
      445,  // SMB
      135,  // RPC
      138,  // NetBIOS
      139,  // NetBIOS
    )
    .withEnvironment({
      'DOMAIN': domain,
      'ADMIN_PASSWORD': adminPassword,
      'INSECURE': 'true',
    })
    .withWaitStrategy(
      Wait.forLogMessage('[+] Samba Domain Controller started successfully')
    );
  }

  /**
   * Get LDAP connection URL
   */
  public getLdapUrl(started: StartedTestContainer): string {
    const host = started.getHost();
    const port = started.getMappedPort(SambaLdapContainer.DEFAULT_SAMBA_PORT);
    return `ldap://${host}:${port}`;
  }

  /**
   * Get LDAP bind DN for admin user
   */
  public getLdapBindDn(started: StartedTestContainer, domain: string = SambaLdapContainer.DEFAULT_DOMAIN): string {
    // Construct bind DN from domain components
    const dcComponents = domain.toLowerCase().split('.').map(part => `dc=${part}`).join(',');
    return `cn=${SambaLdapContainer.DEFAULT_ADMIN_USER},cn=Users,${dcComponents}`;
  }

  /**
   * Get LDAP search base
   */
  public getLdapSearchBase(started: StartedTestContainer, domain: string = SambaLdapContainer.DEFAULT_DOMAIN): string {
    return domain.toLowerCase().split('.').map(part => `dc=${part}`).join(',');
  }

  /**
   * Get LDAP search filter for users
   */
  public getLdapSearchFilter(): string {
    return '(&(objectClass=user)(sAMAccountName={{username}}))';
  }
}

export type StartedSambaLdapContainerWithDetails = StartedTestContainer & {
  getLdapUrl: () => string;
  getLdapBindDn: (domain?: string) => string; 
  getLdapSearchBase: (domain?: string) => string;
  getLdapSearchFilter: () => string;
};

/**
 * Start a Samba LDAP container and return the container with additional helper methods
 */
export async function startSambaLdapContainer(
  image?: string,
  adminPassword?: string,
  domain?: string,
): Promise<StartedSambaLdapContainerWithDetails> {
  const container = new SambaLdapContainer(image, adminPassword, domain);
  const startedContainer = await container.start();
  
  const sambaContainer: StartedSambaLdapContainerWithDetails = Object.assign(startedContainer, {
    getLdapUrl: () => container.getLdapUrl(startedContainer),
    getLdapBindDn: (domain?: string) => container.getLdapBindDn(startedContainer, domain),
    getLdapSearchBase: (domain?: string) => container.getLdapSearchBase(startedContainer, domain),
    getLdapSearchFilter: () => container.getLdapSearchFilter(),
  });
  
  return sambaContainer;
} 
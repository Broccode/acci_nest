/**
 * LDAP Server Configuration
 * 
 * @description Configuration options for LDAP server connection
 */
export interface LdapServerConfig {
  /**
   * LDAP server URL
   * @example "ldap://ldap.example.com:389"
   */
  url: string;
  
  /**
   * Bind DN for LDAP authentication
   * @example "cn=admin,dc=example,dc=com"
   */
  bindDN: string;
  
  /**
   * Bind credentials (password) for LDAP authentication
   */
  bindCredentials: string;
  
  /**
   * Search base for LDAP queries
   * @example "ou=users,dc=example,dc=com"
   */
  searchBase: string;
  
  /**
   * LDAP search filter
   * @example "(mail={{username}})"
   */
  searchFilter: string;
  
  /**
   * LDAP search attributes to retrieve
   */
  searchAttributes?: string[];
  
  /**
   * TLS options for secure LDAP connection
   */
  tlsOptions?: {
    /**
     * Whether to reject unauthorized certificates
     */
    rejectUnauthorized: boolean;
  };
  
  /**
   * Whether to use STARTTLS for secure communication
   */
  starttls?: boolean;
}

/**
 * LDAP User Profile from directory
 * 
 * @description User profile data retrieved from LDAP directory
 */
export interface LdapUserProfile {
  /**
   * User email address
   */
  mail?: string;
  
  /**
   * User display name
   */
  displayName?: string;
  
  /**
   * User first name
   */
  givenName?: string;
  
  /**
   * User last name
   */
  sn?: string;
  
  /**
   * SAM Account Name (AD username)
   */
  sAMAccountName?: string;
  
  /**
   * User distinguished name
   */
  dn?: string;
  
  /**
   * User organizational unit
   */
  ou?: string;
  
  /**
   * User groups
   */
  memberOf?: string[];
} 
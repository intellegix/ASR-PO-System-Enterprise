/**
 * Type definitions for QuickBooks integration packages
 */

declare module 'intuit-oauth' {
  interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  interface AuthorizeUriOptions {
    scope: string | string[];
    state?: string;
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type?: string;
    realmId?: string;
  }

  interface AuthResponse {
    getJson(): TokenResponse;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    realmId?: string;
  }

  class OAuthClient {
    constructor(config: OAuthConfig);

    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(uri: string): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;

    // Properties
    token?: TokenResponse;
    realmId?: string;
    access_token?: string;
    refresh_token?: string;
  }

  export = OAuthClient;
}

declare module 'quickbooks' {
  interface QBConfig {
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    realmId: string;
    useSandbox?: boolean;
    debug?: boolean;
  }

  interface QBError {
    Fault?: {
      Error?: Array<{
        code?: string;
        Detail?: string;
        element?: string;
      }>;
    };
  }

  interface QBBill {
    Id?: string;
    SyncToken?: string;
    VendorRef?: { value: string; name?: string };
    Line?: Array<{
      Amount?: number;
      Description?: string;
      AccountRef?: { value: string; name?: string };
      ClassRef?: { value: string; name?: string };
    }>;
    TotalAmt?: number;
    DocNumber?: string;
    TxnDate?: string;
    PrivateNote?: string;
  }

  interface QBVendor {
    Id?: string;
    Name?: string;
    Active?: boolean;
    Vendor1099?: boolean;
    AcctNum?: string;
    BillAddr?: {
      Line1?: string;
      City?: string;
      CountrySubDivisionCode?: string;
      PostalCode?: string;
    };
    PrimaryEmailAddr?: {
      Address?: string;
    };
  }

  interface QBAccount {
    Id?: string;
    Name?: string;
    AcctNum?: string;
    AccountType?: string;
    Active?: boolean;
  }

  interface QBClass {
    Id?: string;
    Name?: string;
    Active?: boolean;
  }

  class QuickBooks {
    constructor(config: QBConfig);

    // Bill operations
    createBill(bill: QBBill, callback: (err: QBError | null, bill?: QBBill) => void): void;
    getBill(id: string, callback: (err: QBError | null, bill?: QBBill) => void): void;
    updateBill(bill: QBBill, callback: (err: QBError | null, bill?: QBBill) => void): void;
    deleteBill(bill: QBBill, callback: (err: QBError | null, bill?: QBBill) => void): void;

    // Vendor operations
    createVendor(vendor: QBVendor, callback: (err: QBError | null, vendor?: QBVendor) => void): void;
    getVendor(id: string, callback: (err: QBError | null, vendor?: QBVendor) => void): void;
    findVendors(criteria: unknown, callback: (err: QBError | null, vendors?: QBVendor[]) => void): void;

    // Account operations
    getAccounts(callback: (err: QBError | null, accounts?: QBAccount[]) => void): void;
    getAccount(id: string, callback: (err: QBError | null, account?: QBAccount) => void): void;

    // Class operations
    getClasses(callback: (err: QBError | null, classes?: QBClass[]) => void): void;
    getClass(id: string, callback: (err: QBError | null, qbClass?: QBClass) => void): void;

    // Utility methods
    batch(operations: unknown[], callback: (err: QBError | null, result?: unknown) => void): void;
    reportBalanceSheet(options: unknown, callback: (err: QBError | null, report?: unknown) => void): void;
    reportProfitAndLoss(options: unknown, callback: (err: QBError | null, report?: unknown) => void): void;
  }

  export = QuickBooks;
}
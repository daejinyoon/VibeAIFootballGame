import { PublicClientApplication } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim() ?? '';
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID?.trim() ?? '';
const apiScope = clientId ? `api://${clientId}/access_as_user` : '';
const loginScopes = ['openid', 'profile', ...(apiScope ? [apiScope] : [])];

let clientApplication = null;
let initialized = false;
let activeAccount = null;

export const entraConfigurationError = !tenantId || !clientId
  ? '로그인 설정이 아직 완료되지 않았습니다. 관리자에게 Entra Tenant ID와 Client ID 설정을 요청하세요.'
  : '';

function getClientApplication() {
  if (entraConfigurationError) throw new Error(entraConfigurationError);
  if (!clientApplication) {
    clientApplication = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    });
  }
  return clientApplication;
}

function validTenantAccount(account) {
  return Boolean(account
    && account.idTokenClaims?.tid === tenantId
    && typeof account.idTokenClaims?.oid === 'string'
    && account.idTokenClaims.oid.length > 0);
}

export async function initializeEntraAuth() {
  if (entraConfigurationError) {
    return { account: null, configurationError: entraConfigurationError, authError: '' };
  }

  try {
    const msal = getClientApplication();
    await msal.initialize();
    initialized = true;
    const redirectResult = await msal.handleRedirectPromise();
    const account = redirectResult?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;

    if (!account) {
      activeAccount = null;
      return { account: null, configurationError: '', authError: '' };
    }
    if (!validTenantAccount(account)) {
      activeAccount = null;
      msal.setActiveAccount(null);
      return {
        account: null,
        configurationError: '',
        authError: 'DEX Consulting 조직 계정으로 로그인해야 게임을 이용할 수 있습니다.',
      };
    }

    activeAccount = account;
    msal.setActiveAccount(account);
    return { account, configurationError: '', authError: '' };
  } catch {
    return {
      account: null,
      configurationError: '',
      authError: 'Entra 로그인을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.',
    };
  }
}

export function getEntraAccount() {
  const msal = clientApplication;
  const account = activeAccount ?? msal?.getActiveAccount() ?? msal?.getAllAccounts()[0] ?? null;
  return validTenantAccount(account) ? account : null;
}

export async function beginEntraLogin() {
  const msal = getClientApplication();
  if (!initialized) {
    await msal.initialize();
    initialized = true;
  }
  await msal.loginRedirect({ scopes: loginScopes });
}

export async function beginEntraLogout(account = getEntraAccount()) {
  const msal = getClientApplication();
  if (!initialized) {
    await msal.initialize();
    initialized = true;
  }
  activeAccount = null;
  await msal.logoutRedirect({ account, postLogoutRedirectUri: window.location.origin });
}

export async function getProfileApiToken() {
  const account = getEntraAccount();
  if (!account) throw new Error('로그인 계정을 확인할 수 없습니다. 다시 로그인하세요.');
  const result = await getClientApplication().acquireTokenSilent({
    account,
    scopes: [apiScope],
  });
  return result.accessToken;
}

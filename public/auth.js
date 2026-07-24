const tokenStorageKey = "pfs.auth.tokens";
const verifierStorageKey = "pfs.auth.pkceVerifier";
const stateStorageKey = "pfs.auth.oauthState";

function normalizeConfig(rawConfig) {
  const config = rawConfig ?? {};
  const hostedUiDomain = config.hostedUiDomain
    ? String(config.hostedUiDomain).replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "";

  return {
    enabled: Boolean(config.clientId && hostedUiDomain),
    clientId: config.clientId,
    hostedUiDomain,
    redirectUri: config.redirectUri || window.location.origin,
    logoutUri: config.logoutUri || window.location.origin,
    scopes: config.scopes || ["openid", "email", "profile"]
  };
}

function authBaseUrl(config) {
  return `https://${config.hostedUiDomain}`;
}

function base64UrlEncode(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return window
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function randomCodeVerifier() {
  const bytes = new Uint8Array(48);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function codeChallenge(verifier) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return base64UrlEncode(digest);
}

function decodeClaims(token) {
  if (!token) {
    return {};
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return {};
  }

  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const json = window.atob(padded);
  return JSON.parse(json);
}

function readSession() {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(tokenStorageKey) ?? "null");
    if (!session || Date.now() >= session.expiresAt) {
      window.sessionStorage.removeItem(tokenStorageKey);
      return null;
    }

    return session;
  } catch {
    window.sessionStorage.removeItem(tokenStorageKey);
    return null;
  }
}

function saveSession(payload) {
  const idToken = payload.id_token ?? "";
  const accessToken = payload.access_token ?? "";
  const expiresIn = Number(payload.expires_in ?? 3600);
  const session = {
    idToken,
    accessToken,
    refreshToken: payload.refresh_token ?? "",
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    claims: decodeClaims(idToken || accessToken)
  };

  window.sessionStorage.setItem(tokenStorageKey, JSON.stringify(session));
  return session;
}

function cleanUrl() {
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
}

export function createAuthClient(rawConfig) {
  const config = normalizeConfig(rawConfig);
  let session = readSession();

  function clear() {
    session = null;
    window.sessionStorage.removeItem(tokenStorageKey);
    window.sessionStorage.removeItem(verifierStorageKey);
    window.sessionStorage.removeItem(stateStorageKey);
  }

  async function finishRedirect() {
    if (!config.enabled) {
      return { handled: false };
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const returnedState = params.get("state");

    if (!code && !error) {
      return { handled: false };
    }

    if (error) {
      cleanUrl();
      throw new Error(params.get("error_description") || "Sign-in did not finish.");
    }

    const verifier = window.sessionStorage.getItem(verifierStorageKey);
    const expectedState = window.sessionStorage.getItem(stateStorageKey);
    if (!verifier || !expectedState || returnedState !== expectedState) {
      cleanUrl();
      throw new Error("The sign-in session expired. Please try again.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier
    });

    const response = await fetch(`${authBaseUrl(config)}/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });

    const payload = await response.json();
    if (!response.ok) {
      cleanUrl();
      throw new Error(payload.error_description || payload.error || "Could not complete sign-in.");
    }

    session = saveSession(payload);
    window.sessionStorage.removeItem(verifierStorageKey);
    window.sessionStorage.removeItem(stateStorageKey);
    cleanUrl();
    return { handled: true, session };
  }

  async function signIn() {
    const verifier = randomCodeVerifier();
    const oauthState = randomCodeVerifier();
    window.sessionStorage.setItem(verifierStorageKey, verifier);
    window.sessionStorage.setItem(stateStorageKey, oauthState);

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      scope: config.scopes.join(" "),
      redirect_uri: config.redirectUri,
      code_challenge_method: "S256",
      code_challenge: await codeChallenge(verifier),
      state: oauthState
    });

    window.location.assign(`${authBaseUrl(config)}/oauth2/authorize?${params.toString()}`);
  }

  function signOut() {
    clear();

    if (!config.enabled) {
      return;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      logout_uri: config.logoutUri
    });

    window.location.assign(`${authBaseUrl(config)}/logout?${params.toString()}`);
  }

  function displayName() {
    const claims = session?.claims ?? {};
    return claims.email || claims.name || claims["cognito:username"] || "signed-in user";
  }

  return {
    enabled: config.enabled,
    clear,
    displayName,
    finishRedirect,
    isSignedIn: () => Boolean(session),
    signIn,
    signOut,
    token: () => session?.idToken ?? session?.accessToken ?? ""
  };
}

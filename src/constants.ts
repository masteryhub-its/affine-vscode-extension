import { OpenMode } from './utils/enums/open-mode.enum';

export const DEFAULT_SERVER_URL = 'https://affine.masteryhub-its.com';
export const DEFAULT_CLIENT_VERSION = '0.26.0';
export const DEFAULT_OPEN_MODE = OpenMode.EXTERNAL;
export const ACCESS_TOKEN_SECRET_KEY = 'affine.credential';
export const ACCESS_TOKEN_NAME = 'VS Code · AFFiNE';
export const GRAPHQL_PATH = '/graphql';
export const SIGN_IN_PATH = '/api/auth/sign-in';
export const CLIENT_VERSION_HEADER = 'x-affine-client-version';
export const CSRF_HEADER = 'x-affine-csrf-token';
export const DOC_PAGE_SIZE = 100;
export const MAX_DOC_PAGES = 50;
export const RECENT_PAGES_KEY = 'affine.recentPages';
